# llama-cpp — Local LLM Development Environment

This repository contains a complete local LLM development environment built around [llama.cpp](https://github.com/ggerganov/llama.cpp) with MCP (Model Context Protocol) server integrations for document editing, web search, and job search tools.

## Overview

This setup runs a local LLM server with CUDA support, integrated with MCP servers that provide tool capabilities (document editing, search, etc.) to the model via the llama.cpp UI MCP proxy feature.

### What's Inside

| Component | Description |
|-----------|-------------|
| `docker-compose.yml` | Docker Compose configuration for llama.cpp server with CUDA |
| `models/` | GGUF model files and multimodal projectors (mmproj) |
| `mcp-services/` | MCP server implementations (doc-editor, web-search, job-search, linkedin-search) |
| `.config/` | MCP and UI configuration files |
| `specifications/` | Feature specifications |

## Prerequisites

- **OS**: Ubuntu 22.04+ (or WSL2 on Windows)
- **GPU**: NVIDIA GPU with CUDA support (8GB+ VRAM recommended)
- **Docker**: Docker Engine with NVIDIA Container Toolkit
- **Node.js**: v20+ (for MCP server development)
- **Python**: 3.10+ (for MCP server development)

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repo-url>
cd llama_cpp

# Create configuration directory
mkdir -p .config
```

### 2. Configure MCP Servers

Create the following configuration files:

- [`.config/mcp-config.json`](.config/mcp-config.json) — MCP server definitions for llama.cpp
- [`.config/ui-config.json`](.config/ui-config.json) — UI-specific MCP client configuration

See [docs/architecture.md](docs/architecture.md) for configuration examples.

### 3. Start the LLM Server

```bash
# Build and start with Docker Compose
docker-compose up -d

# Check logs
docker logs local-llm -f
```

The server will be available at `http://localhost:41980`.

### 4. Access the UI

Open `http://localhost:41980` in your browser to access the llama.cpp web UI.

## Models

See [models/](models/README.md) for available model files and multimodal projector compatibility.

## MCP Services

### doc-editor

A TypeScript MCP facade over SecurityRonin's docx-mcp Python server. Provides tools for Word document operations (see [server.ts](mcp-services/doc-editor/src/server.ts) for the complete list).

**Documentation**: [mcp-services/doc-editor/README.md](mcp-services/doc-editor/README.md)

### web-search

Web search MCP server. **Documentation**: [mcp-services/web-search/README.md](mcp-services/web-search/README.md)

### job-search

Job search MCP server. **Documentation**: [mcp-services/job-search/README.md](mcp-services/job-search/README.md)

### linkedin-search

LinkedIn search MCP server. **Documentation**: [mcp-services/linkedin-search/README.md](mcp-services/linkedin-search/README.md)

## Docker Compose

See [docker-compose.yml](docker-compose.yml) for the full configuration. The default setup uses Qwen3.6-35B-A3B.

### Switching Models

Edit the `command` section in [docker-compose.yml](docker-compose.yml) to use a different model. Commented-out configurations for alternative models are included in the file.

## Development

### Building MCP Servers

```bash
# doc-editor
cd mcp-services/doc-editor
npm install
npm run build
```

### Testing

```bash
# Run doc-editor tests
cd mcp-services/doc-editor
npx tsx --test test/*.test.ts
```

For testing details on other MCP services, see [mcp-services/shared-testing-narrative.md](mcp-services/shared-testing-narrative.md).

### Docker Build

```bash
# Build doc-editor MCP server image
cd mcp-services/doc-editor
docker build -t doc-editor-mcp .

# Run standalone
docker run --rm -p 3001:3001 doc-editor-mcp
```

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed system architecture and data flow diagrams.

## Troubleshooting

See [docs/troubleshooting.md](docs/troubleshooting.md) for common issues and solutions.

## Specifications

Feature specifications are documented in the [specifications/](specifications/README.md) folder. See [specifications/README.md](specifications/README.md) for the structure and guidelines.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on where to document different types of information and how to contribute to the repository.

## License

This repository is for educational and development purposes. Model files are subject to their respective licenses.
