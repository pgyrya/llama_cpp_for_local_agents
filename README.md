# llama-cpp — Local LLM Development Environment

This repository contains a complete local LLM development environment built around [llama.cpp](https://github.com/ggerganov/llama.cpp) with MCP (Model Context Protocol) server integrations for document editing, web search, and job search tools.

## Overview

This setup runs a local LLM server with CUDA support, integrated with MCP servers that provide tool capabilities (document editing, search, etc.) to the model via the llama.cpp UI MCP proxy feature.

### What's Inside

| Component | Description |
|-----------|-------------|
| [docker-compose.yml](./docker-compose.yml) | Docker Compose configuration for llama.cpp server with CUDA |
| `models/` | GGUF model files and multimodal projectors (mmproj) |
| `mcp-services/` | MCP server implementations (e.g. web-search-mcp) |
| `services/`| Other services. Example: [retry proxy](./services/openai-chat-retry-proxy/README.md) is an optional local gateway for streaming Copilot requests that could take a long time to start|
| `.config/` | MCP and UI configuration files |
| `specifications/` | Feature specifications |

## Prerequisites

- **OS**: Ubuntu 22.04+ (or WSL2 on Windows)
- **GPU**: NVIDIA GPU with CUDA support (11 GB+ VRAM recommended)
- **RAM**: 32 GB+ recommended
- **Docker**: Docker Engine with NVIDIA Container Toolkit
- **Node.js**: v20+ (for MCP server development)
- **Python**: 3.10+ (for MCP server development)
- **Model**: Download a model you plan to use from Huggingface - see [models/](models/README.md) for the models tested.

## Quick Start

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repo-url>
cd llama_cpp
```

### 2. Start the LLM Server

```bash
# Build and start with Docker Compose
docker-compose up -d
```

The server will be available at `http://localhost:41980` as both UI and completions endpoint.

The OpenAI completion endpoint is also available at http://localhost:41980/v1/ - e.g. 
http://localhost:41980/v1/models

### 3. Access the UI

Open `http://localhost:41980` in your browser to access the llama.cpp web UI.

### 4. Configure VS Code Copilot to use this model

See [VS Code BYOK](https://code.visualstudio.com/docs/agent-customization/language-models#_bring-your-own-language-model-key) for setting up custom models. The example configuration uses the optional [retry proxy](./services/openai-chat-retry-proxy/README.md); the direct llama.cpp endpoint remains at port `41980`.

See [chatLanguageModels.example.json](chatLanguageModels.example.json) for an example of json configuration to make this model available as local AI assistant.

## Development

## Specifications

Feature specifications are documented in the [specifications/](specifications/README.md) folder. See [specifications/README.md](specifications/README.md) for the structure and guidelines.

### Architecture

See [docs/architecture.md](docs/architecture.md) for detailed system architecture and data flow diagrams.

### Docker Compose

See [docker-compose.yml](docker-compose.yml) for the full configuration.

The default setup uses Qwen3.6-35B-A3B - a very practical model for local deployment as of late 2026.

Edit the `command` section in [docker-compose.yml](docker-compose.yml) to use a different model. 

Consider to keep alternative configurations tested - commented-out in the file.

### MCP Services

See individual folders in the `mcp-services` subfolder for documentation.

Here is a useful example: 

-  Web search MCP server. **Documentation**: [mcp-services/web-search/README.md](mcp-services/web-search/README.md)


## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on where to document different types of information and how to contribute to the repository.

See also [AGENTS.md](./AGENTS.md) for instructions which should be generally read by agents but also useful for coordination across developers.

## License

This repository's original content is licensed under the [MIT License](./LICENSE).

### Third-Party Licenses

Third-party software remains under its respective license:

- **llama.cpp**: The `llama` service uses the `ghcr.io/ggml-org/llama.cpp:server-cuda` image, sourced from [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp). It is licensed under the [MIT License](https://github.com/ggml-org/llama.cpp/blob/master/LICENSE).
- **web-search-mcp**: The web-search service clones [mrkrsl/web-search-mcp](https://github.com/mrkrsl/web-search-mcp) during its Docker build and is licensed under its [MIT License](https://github.com/mrkrsl/web-search-mcp/blob/main/LICENSE).
- **Other MCP servers, if any**: Their applicable license information is provided in the corresponding service subfolder.
