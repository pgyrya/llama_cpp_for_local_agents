# Specification: get-single-web-page-content

**Status**: Active
**Service**: [web-search](..)
**Source**: [http-mcp-server.mjs](../http-mcp-server.mjs)

## Purpose

Extract and return the full content from a single web page URL. Useful when you already have a URL and want to get the article/text content.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `url` | string | Yes | — | URL of the web page to extract content from |

## Returns

Text containing the extracted page content

## Testing State

**Status**: No automated tests implemented yet — consider adding integration tests.

**Narrative**: See [../../shared-testing-narrative.md](../../shared-testing-narrative.md) for the shared testing narrative.

**TODO**: PDF URL handling (isPdfUrl check) — behavior for PDFs not documented.
