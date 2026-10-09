FROM mcr.microsoft.com/playwright:latest

WORKDIR /app

# Clone the web-search-mcp repo at build time
ARG REPO=https://github.com/mrkrsl/web-search-mcp.git
RUN git clone --depth 1 "$REPO" /app/web-search-mcp

WORKDIR /app/web-search-mcp

# Install dependencies and build the project (Playwright browsers are
# provided by the base image)
RUN npm ci
RUN npm run build

ENV NODE_ENV=production
ENV BROWSER_HEADLESS=true
ENV MAX_BROWSERS=2
ENV MCP_HOST=0.0.0.0
ENV MCP_PORT=5005

# Expose TCP port for bridge
EXPOSE 5005

COPY http-mcp-server.mjs /app/web-search-mcp/http-mcp-server.mjs
RUN chmod +x /app/web-search-mcp/http-mcp-server.mjs

# Run a native Streamable HTTP MCP server.
CMD ["node", "/app/web-search-mcp/http-mcp-server.mjs"]
