# Specification: full-web-search

**Status**: Active
**Service**: [web-search](..)
**Source**: [http-mcp-server.mjs](../http-mcp-server.mjs) (line ~180)

## Purpose

Search the web and fetch complete page content from top results. Combines web search with content extraction to return full article text.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | — | Search query to execute |
| `limit` | number/string | No | 5 | Number of results to return (1-10) |
| `includeContent` | boolean/string | No | true | Whether to fetch full page content |
| `maxContentLength` | number/string | No | 2000 | Maximum characters per result; 0 means no limit |

## Returns

Text formatted with:
- Search query and total results count
- Each result: title, URL, description, full content (if includeContent=true)

## Testing State

**Status**: No automated tests implemented yet — consider adding integration tests.

**Narrative**: See [../../shared-testing-narrative.md](../../shared-testing-narrative.md) for the shared testing narrative.

**TODO**: No specification for error handling when content extraction fails.
