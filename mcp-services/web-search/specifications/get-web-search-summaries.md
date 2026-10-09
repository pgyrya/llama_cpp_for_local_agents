# Specification: get-web-search-summaries

**Status**: Active
**Service**: [web-search](..)
**Source**: [http-mcp-server.mjs](../http-mcp-server.mjs) (line ~210)

## Purpose

Search the web and return only result snippets without following links or extracting full content. Lightweight alternative to `full-web-search`.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | Yes | — | Search query to execute |
| `limit` | number/string | No | 5 | Number of results to return (1-10) |

## Returns

Text formatted with:
- Search query and results count
- Each result: title, URL, description (no full content)

## Testing State

**Status**: No automated tests implemented yet — consider adding integration tests.

**Narrative**: See [../../shared-testing-narrative.md](../../shared-testing-narrative.md) for the shared testing narrative.

**TODO**: Search engine cleanup (closeAll) runs in finally block — good practice.
