'use strict';

const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);

function waitBeforeRetry(milliseconds, request, response) {
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      request.removeListener('aborted', finish);
      response.removeListener('close', finish);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    request.once('aborted', finish);
    response.once('close', finish);
  });
}

function responseHeaders(headers, streaming) {
  const result = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined || HOP_BY_HOP_HEADERS.has(name.toLowerCase())) continue;
    if (streaming && ['content-length', 'content-encoding'].includes(name.toLowerCase())) continue;
    result[name] = value;
  }
  return result;
}

function sendJsonError(response, statusCode, message) {
  if (response.headersSent) {
    sendStreamError(response, message);
    return;
  }
  const body = JSON.stringify({ error: { message } });
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body)
  });
  response.end(body);
}

function sendStreamError(response, message) {
  if (response.writableEnded || response.destroyed) return;
  if (!response.headersSent) {
    response.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      'x-accel-buffering': 'no'
    });
  }
  response.write(`data: ${JSON.stringify({ error: { message } })}\n\n`);
  response.end('data: [DONE]\n\n');
}

function createRetryProxy(options = {}) {
  const upstreamUrl = new URL(options.upstreamUrl || process.env.UPSTREAM_URL || 'http://127.0.0.1:41980');
  const retryDelayMs = options.retryDelayMs ?? Number(process.env.RETRY_DELAY_MS || 120000);
  const headerGraceMs = options.headerGraceMs ?? Number(process.env.HEADER_GRACE_MS || 180000);
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? Number(process.env.HEARTBEAT_INTERVAL_MS || 15000);
  const maxRetries = options.maxRetries ?? Number(process.env.MAX_RETRIES || 1);
  const host = options.host || process.env.HOST || '127.0.0.1';
  const port = options.port ?? Number(process.env.PORT || 41981);

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, 'http://localhost');
    const shouldRetry = request.method === 'POST'
      && requestUrl.pathname === '/v1/chat/completions'
      && (request.headers['content-type'] || '').includes('application/json');

    if (!shouldRetry) {
      proxyUnbuffered(request, response, upstreamUrl);
      return;
    }

    let requestBody;
    try {
      requestBody = await readRequestBody(request, 64 * 1024 * 1024);
    } catch (error) {
      sendJsonError(response, error.statusCode || 400, error.message);
      return;
    }

    let payload;
    try {
      payload = JSON.parse(requestBody.toString('utf8'));
    } catch {
      proxyBuffered(request, response, upstreamUrl, requestBody);
      return;
    }

    if (payload.stream !== true) {
      proxyBuffered(request, response, upstreamUrl, requestBody);
      return;
    }

    let clientDisconnected = false;
    let heartbeatStarted = false;
    let heartbeatInterval;
    const heartbeatTimeout = setTimeout(() => {
      if (clientDisconnected || response.headersSent) return;
      heartbeatStarted = true;
      response.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
        'x-accel-buffering': 'no'
      });
      response.write(': waiting for model response\n\n');
      heartbeatInterval = setInterval(() => {
        if (!response.writableEnded && !response.destroyed) response.write(': keep-alive\n\n');
      }, heartbeatIntervalMs);
    }, headerGraceMs);

    const stopHeartbeats = () => {
      clearTimeout(heartbeatTimeout);
      clearInterval(heartbeatInterval);
    };

    request.on('aborted', () => {
      clientDisconnected = true;
      stopHeartbeats();
    });
    response.on('close', () => {
      if (!response.writableEnded) clientDisconnected = true;
      stopHeartbeats();
    });

    const target = new URL(request.url, upstreamUrl);
    const upstreamHeaders = { ...request.headers, host: target.host };
    delete upstreamHeaders.connection;
    delete upstreamHeaders['content-length'];
    delete upstreamHeaders['transfer-encoding'];
    delete upstreamHeaders['accept-encoding'];
    upstreamHeaders['content-length'] = String(requestBody.length);

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (clientDisconnected) break;
      const outcome = await streamAttempt({
        request,
        response,
        requestBody,
        target,
        upstreamHeaders,
        transport: target.protocol === 'https:' ? https : http,
        clientIsDisconnected: () => clientDisconnected,
        sendHeaders: (statusCode, headers) => {
          if (response.headersSent) return;
          clearTimeout(heartbeatTimeout);
          response.writeHead(statusCode, responseHeaders(headers, true));
          heartbeatStarted = true;
        }
      });

      if (outcome.kind === 'retry' && attempt < maxRetries && !clientDisconnected) {
        await waitBeforeRetry(retryDelayMs, request, response);
        continue;
      }

      if (outcome.kind === 'retry') {
        sendStreamError(response, outcome.message || 'The model endpoint failed before returning response data.');
      }
      break;
    }

    stopHeartbeats();
    if (!clientDisconnected && !response.writableEnded && response.headersSent && !response.destroyed) {
      response.end();
    }
  });

  server.listen(port, host);
  return server;
}

function readRequestBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        const error = new Error('Request body exceeds the 64 MiB limit.');
        error.statusCode = 413;
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function streamAttempt(context) {
  return new Promise(resolve => {
    const { request, requestBody, target, upstreamHeaders, transport, response } = context;
    let receivedData = false;
    let settled = false;

    const finish = outcome => {
      if (settled) return;
      settled = true;
      resolve(outcome);
    };

    const upstreamRequest = transport.request(target, {
      method: 'POST',
      headers: upstreamHeaders
    }, upstream => {
      const statusCode = upstream.statusCode || 502;

      if ([408, 429].includes(statusCode) || statusCode >= 500) {
        upstream.destroy();
        finish({ kind: 'retry', message: `Model endpoint returned HTTP ${statusCode}.` });
        return;
      }

      if (statusCode >= 400) {
        const chunks = [];
        let bodySize = 0;
        upstream.on('data', chunk => {
          bodySize += chunk.length;
          if (bodySize <= 1024 * 1024) chunks.push(chunk);
        });
        upstream.on('end', () => {
          const body = Buffer.concat(chunks);
          let message = `Model endpoint returned HTTP ${statusCode}.`;
          try {
            message = JSON.parse(body.toString('utf8')).error?.message || message;
          } catch {
            if (body.length) message = body.toString('utf8').slice(0, 1000);
          }
          if (response.headersSent) {
            sendStreamError(response, message);
          } else {
            response.writeHead(statusCode, responseHeaders(upstream.headers, false));
            response.end(body);
          }
          finish({ kind: 'complete' });
        });
        upstream.on('aborted', () => {
          sendJsonError(response, 502, 'Model endpoint closed an error response unexpectedly.');
          finish({ kind: 'complete' });
        });
        upstream.on('error', error => {
          sendJsonError(response, 502, error.message);
          finish({ kind: 'complete' });
        });
        return;
      }

      upstream.on('data', chunk => {
        receivedData = true;
        if (!response.headersSent) {
          context.sendHeaders(statusCode, upstream.headers);
        }
        if (!response.destroyed && !response.writableEnded) response.write(chunk);
      });

      upstream.on('end', () => {
        if (!receivedData && statusCode >= 200 && statusCode < 300) {
          finish({ kind: 'retry', message: 'Model endpoint closed the stream before returning response data.' });
          return;
        }
        if (!receivedData && !response.headersSent) {
          context.sendHeaders(statusCode, upstream.headers);
          response.end();
        }
        finish({ kind: 'complete' });
      });

      upstream.on('aborted', () => {
        const message = 'Model endpoint closed the stream unexpectedly.';
        if (receivedData) sendStreamError(response, message);
        finish(receivedData
          ? { kind: 'complete' }
          : { kind: 'retry', message: 'Model endpoint closed the stream before returning response data.' });
      });
      upstream.on('error', error => {
        if (receivedData) sendStreamError(response, error.message);
        finish(receivedData
          ? { kind: 'complete' }
          : { kind: 'retry', message: error.message });
      });
    });

    upstreamRequest.on('error', error => {
      if (!context.clientIsDisconnected()) finish({ kind: 'retry', message: error.message });
      else finish({ kind: 'complete' });
    });
    const cancelUpstream = () => {
      if (!upstreamRequest.destroyed) upstreamRequest.destroy(new Error('Client disconnected.'));
    };
    request.once('aborted', cancelUpstream);
    response.once('close', () => {
      if (!response.writableEnded) cancelUpstream();
    });
    if (context.clientIsDisconnected()) upstreamRequest.destroy();
    else upstreamRequest.end(requestBody);
  });
}

function proxyUnbuffered(request, response, upstreamUrl) {
  proxyBuffered(request, response, upstreamUrl, null);
}

function proxyBuffered(request, response, upstreamUrl, body) {
  const target = new URL(request.url, upstreamUrl);
  const transport = target.protocol === 'https:' ? https : http;
  const headers = { ...request.headers, host: target.host };
  delete headers.connection;
  if (body !== null) {
    delete headers['transfer-encoding'];
    headers['content-length'] = String(body.length);
  }

  const upstream = transport.request(target, { method: request.method, headers }, upstreamResponse => {
    response.writeHead(upstreamResponse.statusCode || 502, responseHeaders(upstreamResponse.headers, false));
    upstreamResponse.pipe(response);
  });
  upstream.on('error', error => {
    if (response.headersSent) response.destroy(error);
    else sendJsonError(response, 502, `Model endpoint request failed: ${error.message}`);
  });
  const cancelUpstream = () => upstream.destroy();
  request.once('aborted', cancelUpstream);
  response.once('close', () => {
    if (!response.writableEnded) cancelUpstream();
  });
  if (body !== null) upstream.end(body);
  else request.pipe(upstream);
}

if (require.main === module) {
  const server = createRetryProxy();
  server.on('listening', () => {
    const address = server.address();
    console.log(`OpenAI chat retry proxy listening on http://${address.address}:${address.port}`);
  });
}

module.exports = { createRetryProxy };