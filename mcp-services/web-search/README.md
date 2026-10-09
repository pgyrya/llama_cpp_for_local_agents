# web-search-mcp (Docker)

This folder builds a Docker image for the `web-search-mcp` project by cloning the
upstream repository, installing dependencies (including Playwright browsers),
and building the TypeScript source. The container runs a native Streamable HTTP
MCP server that reuses the upstream search/content extraction code.


Build locally:

```bash
docker compose build web-search-mcp
```

Run the service:

```bash
docker compose up -d web-search-mcp
```

## Testing

No automated tests implemented yet — see [shared-testing-narrative.md](../shared-testing-narrative.md) for the shared testing narrative.

The service exposes a streaming HTTP endpoint on port `5005` that proxies a single
MCP endpoint for llama.cpp. Use:

- http://localhost:5005/mcp

Because the Compose service publishes `0.0.0.0:5005:5005`, the same endpoint is
also reachable from outside localhost through your host IP, for example:

- http://<windows-ip>:5005/mcp

For llama.cpp's MCP Servers tab, use the Streamable HTTP URL above rather than a
WebSocket URL.

Environment variables you may set in `docker-compose.yml` or the environment:
- `MCP_HOST` (default: `0.0.0.0`)
- `MCP_PORT` (default: `5005`)
- `BROWSER_HEADLESS` (default: true)
- `MAX_BROWSERS` (default: 2)
- `DEFAULT_TIMEOUT` (ms)
