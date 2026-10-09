#!/usr/bin/env node
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

import { SearchEngine } from './dist/search-engine.js';
import { EnhancedContentExtractor } from './dist/enhanced-content-extractor.js';
import { isPdfUrl } from './dist/utils.js';

const HOST = process.env.MCP_HOST || '0.0.0.0';
const PORT = Number.parseInt(process.env.MCP_PORT || '5005', 10);
const transports = new Map();
const servers = new Map();

function jsonRpcError(res, statusCode, code, message) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    jsonrpc: '2.0',
    error: { code, message },
    id: null,
  }));
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, Mcp-Protocol-Version, Content-Type');
  res.setHeader('Vary', 'Origin, Access-Control-Request-Headers');
}

function isInitializeRequest(body) {
  return typeof body === 'object' && body !== null && body.method === 'initialize';
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  if (!rawBody) {
    return undefined;
  }

  return JSON.parse(rawBody);
}

function validateAndConvertArgs(args) {
  if (typeof args !== 'object' || args === null) {
    throw new Error('Invalid arguments: args must be an object');
  }

  const source = args;
  if (!source.query || typeof source.query !== 'string') {
    throw new Error('Invalid arguments: query is required and must be a string');
  }

  let limit = 5;
  if (source.limit !== undefined) {
    const limitValue = typeof source.limit === 'string' ? Number.parseInt(source.limit, 10) : source.limit;
    if (typeof limitValue !== 'number' || Number.isNaN(limitValue) || limitValue < 1 || limitValue > 10) {
      throw new Error('Invalid limit: must be a number between 1 and 10');
    }
    limit = limitValue;
  }

  let includeContent = true;
  if (source.includeContent !== undefined) {
    includeContent = typeof source.includeContent === 'string'
      ? source.includeContent.toLowerCase() === 'true'
      : Boolean(source.includeContent);
  }

  let maxContentLength;
  if (source.maxContentLength !== undefined) {
    const maxLengthValue = typeof source.maxContentLength === 'string'
      ? Number.parseInt(source.maxContentLength, 10)
      : source.maxContentLength;
    if (typeof maxLengthValue !== 'number' || Number.isNaN(maxLengthValue) || maxLengthValue < 0) {
      throw new Error('Invalid maxContentLength: must be a non-negative number');
    }
    maxContentLength = maxLengthValue === 0 ? undefined : maxLengthValue;
  }

  const isLikelyLlama =
    (typeof source.limit === 'string') ||
    (typeof source.includeContent === 'string');
  const hasExplicitMaxLength = Object.prototype.hasOwnProperty.call(source, 'maxContentLength');

  if (!hasExplicitMaxLength && isLikelyLlama) {
    maxContentLength = 2000;
  }

  return {
    query: source.query,
    limit,
    includeContent,
    maxContentLength,
  };
}

function formatFullSearchResult(result, maxLength) {
  let responseText = `Search completed for "${result.query}" with ${result.total_results} results:\n\n`;
  if (result.status) {
    responseText += `**Status:** ${result.status}\n\n`;
  }

  result.results.forEach((searchResult, index) => {
    responseText += `**${index + 1}. ${searchResult.title}**\n`;
    responseText += `URL: ${searchResult.url}\n`;
    responseText += `Description: ${searchResult.description}\n`;

    if (searchResult.fullContent && searchResult.fullContent.trim()) {
      let content = searchResult.fullContent;
      if (maxLength && maxLength > 0 && content.length > maxLength) {
        content = `${content.substring(0, maxLength)}\n\n[Content truncated at ${maxLength} characters]`;
      }
      responseText += `\n**Full Content:**\n${content}\n`;
    } else if (searchResult.contentPreview && searchResult.contentPreview.trim()) {
      let content = searchResult.contentPreview;
      if (maxLength && maxLength > 0 && content.length > maxLength) {
        content = `${content.substring(0, maxLength)}\n\n[Content truncated at ${maxLength} characters]`;
      }
      responseText += `\n**Content Preview:**\n${content}\n`;
    } else if (searchResult.fetchStatus === 'error') {
      responseText += `\n**Content Extraction Failed:** ${searchResult.error}\n`;
    }

    responseText += '\n---\n\n';
  });

  return responseText;
}

function createMcpServer() {
  const server = new McpServer({
    name: 'web-search-mcp',
    version: '0.3.1',
  });

  const searchEngine = new SearchEngine();
  const contentExtractor = new EnhancedContentExtractor();

  async function handleWebSearch(input) {
    const startTime = Date.now();
    const { query, limit = 5, includeContent = true } = input;
    const searchLimit = includeContent ? Math.min(limit * 2 + 2, 10) : limit;
    const searchResponse = await searchEngine.search({ query, numResults: searchLimit });
    const searchResults = searchResponse.results;
    const pdfCount = searchResults.filter(result => isPdfUrl(result.url)).length;
    const followedCount = searchResults.length - pdfCount;
    const enhancedResults = includeContent
      ? await contentExtractor.extractContentForResults(searchResults, limit)
      : searchResults.slice(0, limit);

    let status = `Search engine: ${searchResponse.engine}; ${limit} result requested/${searchResults.length} obtained; PDF: ${pdfCount}; ${followedCount} followed`;
    if (includeContent) {
      const successCount = enhancedResults.filter(result => result.fetchStatus === 'success').length;
      const failedCount = enhancedResults.filter(result => result.fetchStatus === 'error').length;
      status += `; Successfully extracted: ${successCount}; Failed: ${failedCount}; Results: ${enhancedResults.length}`;
    }

    return {
      results: enhancedResults,
      total_results: enhancedResults.length,
      search_time_ms: Date.now() - startTime,
      query,
      status,
    };
  }

  server.tool(
    'full-web-search',
    'Search the web and fetch complete page content from top results. Use get-web-search-summaries for a lighter alternative.',
    {
      query: z.string().describe('Search query to execute'),
      limit: z.union([z.number(), z.string()]).optional().describe('Number of results to return (1-10, default 5)'),
      includeContent: z.union([z.boolean(), z.string()]).optional().describe('Whether to fetch full page content (default true)'),
      maxContentLength: z.union([z.number(), z.string()]).optional().describe('Maximum characters per result content; 0 means no limit'),
    },
    async (args) => {
      const validatedArgs = validateAndConvertArgs(args);
      const result = await handleWebSearch(validatedArgs);
      return {
        content: [
          {
            type: 'text',
            text: formatFullSearchResult(result, validatedArgs.maxContentLength),
          },
        ],
      };
    }
  );

  server.tool(
    'get-web-search-summaries',
    'Search the web and return only result snippets without following links.',
    {
      query: z.string().describe('Search query to execute'),
      limit: z.union([z.number(), z.string()]).optional().describe('Number of results to return (1-10, default 5)'),
    },
    async (args) => {
      if (typeof args !== 'object' || args === null) {
        throw new Error('Invalid arguments: args must be an object');
      }

      const source = args;
      if (!source.query || typeof source.query !== 'string') {
        throw new Error('Invalid arguments: query is required and must be a string');
      }

      let limit = 5;
      if (source.limit !== undefined) {
        const limitValue = typeof source.limit === 'string' ? Number.parseInt(source.limit, 10) : source.limit;
        if (typeof limitValue !== 'number' || Number.isNaN(limitValue) || limitValue < 1 || limitValue > 10) {
          throw new Error('Invalid limit: must be a number between 1 and 10');
        }
        limit = limitValue;
      }

      try {
        const searchResponse = await searchEngine.search({ query: source.query, numResults: limit });
        let responseText = `Search summaries for "${source.query}" with ${searchResponse.results.length} results:\n\n`;
        searchResponse.results.forEach((summary, index) => {
          responseText += `**${index + 1}. ${summary.title}**\n`;
          responseText += `URL: ${summary.url}\n`;
          responseText += `Description: ${summary.description}\n\n---\n\n`;
        });

        return { content: [{ type: 'text', text: responseText }] };
      } finally {
        await searchEngine.closeAll().catch(() => {});
      }
    }
  );

  server.tool(
    'get-single-web-page-content',
    'Extract and return the full content from a single web page URL.',
    {
      url: z.string().url().describe('The URL of the web page to extract content from'),
      maxContentLength: z.union([z.number(), z.string()]).optional().describe('Maximum characters for extracted content; 0 means no limit'),
    },
    async (args) => {
      if (typeof args !== 'object' || args === null) {
        throw new Error('Invalid arguments: args must be an object');
      }

      const source = args;
      if (!source.url || typeof source.url !== 'string') {
        throw new Error('Invalid arguments: url is required and must be a string');
      }

      let maxContentLength;
      if (source.maxContentLength !== undefined) {
        const maxLengthValue = typeof source.maxContentLength === 'string'
          ? Number.parseInt(source.maxContentLength, 10)
          : source.maxContentLength;
        if (typeof maxLengthValue !== 'number' || Number.isNaN(maxLengthValue) || maxLengthValue < 0) {
          throw new Error('Invalid maxContentLength: must be a non-negative number');
        }
        maxContentLength = maxLengthValue === 0 ? undefined : maxLengthValue;
      }

      const content = await contentExtractor.extractContent({
        url: source.url,
        maxContentLength,
      });

      const urlObject = new URL(source.url);
      const title = `${urlObject.hostname}${urlObject.pathname}`;
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

      let responseText = `**Page Content from: ${source.url}**\n\n`;
      responseText += `**Title:** ${title}\n`;
      responseText += `**Word Count:** ${wordCount}\n`;
      responseText += `**Content Length:** ${content.length} characters\n\n`;
      if (maxContentLength && maxContentLength > 0 && content.length > maxContentLength) {
        responseText += `**Content (truncated at ${maxContentLength} characters):**\n${content.substring(0, maxContentLength)}\n\n[Content truncated at ${maxContentLength} characters]`;
      } else {
        responseText += `**Content:**\n${content}`;
      }

      return { content: [{ type: 'text', text: responseText }] };
    }
  );

  return server;
}

const httpServer = createServer(async (req, res) => {
  setCorsHeaders(res);

  if (!req.url) {
    jsonRpcError(res, 400, -32000, 'Bad Request');
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url !== '/' && req.url !== '/mcp') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const sessionId = req.headers['mcp-session-id'];

  try {
    if (req.method === 'POST') {
      const parsedBody = await readJsonBody(req);
      let transport = sessionId ? transports.get(sessionId) : undefined;

      if (!transport) {
        if (sessionId) {
          jsonRpcError(res, 404, -32001, 'Session not found');
          return;
        }

        if (!isInitializeRequest(parsedBody)) {
          jsonRpcError(res, 400, -32000, 'Bad Request: Session ID required');
          return;
        }

        const server = createMcpServer();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          enableDnsRebindingProtection: false,
          onsessioninitialized: (newSessionId) => {
            transports.set(newSessionId, transport);
            servers.set(newSessionId, server);
          },
        });

        transport.onclose = () => {
          const activeSessionId = transport.sessionId;
          if (activeSessionId) {
            transports.delete(activeSessionId);
            const activeServer = servers.get(activeSessionId);
            servers.delete(activeSessionId);
            activeServer?.close().catch(() => {});
          }
        };

        await server.connect(transport);
      }

      await transport.handleRequest(req, res, parsedBody);
      return;
    }

    if (!sessionId) {
      jsonRpcError(res, 400, -32000, 'Bad Request: Session ID required');
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      jsonRpcError(res, 404, -32001, 'Session not found');
      return;
    }

    if (req.method === 'GET' || req.method === 'DELETE') {
      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  } catch (error) {
    console.error('[http-mcp] Error handling request:', error);
    if (!res.headersSent) {
      jsonRpcError(res, 500, -32603, 'Internal server error');
    }
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    for (const transport of transports.values()) {
      await transport.close().catch(() => {});
    }
    for (const server of servers.values()) {
      await server.close().catch(() => {});
    }
    httpServer.close(() => process.exit(0));
  });
}

httpServer.listen(PORT, HOST, () => {
  console.log(`[http-mcp] Listening on http://${HOST}:${PORT}`);
  console.log(`[http-mcp] MCP endpoint: http://${HOST}:${PORT}/mcp`);
});