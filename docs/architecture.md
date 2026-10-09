# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      llama.cpp Server                   │
│                  (Docker, CUDA, Port 41980)             │
│                                                         │
│  ┌─────────────┐    ┌───────────────────────────────┐   │
│  │  Web UI     │    │   MCP Proxy (LLama.cpp)       │   │
│  │  :41980     │    │   - Reads mcp-config.json     │   │
│  └─────────────┘    │   - Reads ui-config.json      │   │
│                     └───────────┬───────────────────┘   │
│                                 │                       │
│                    ┌────────────┴────────────┐          │
│                    │   MCP Clients           │          │
│                    │   - doc-editor (3001)   │          │
│                    │   - web-search (5005)   │          │
│                    └─────────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

## Component Details

### llama.cpp Server
- **Image**: `ghcr.io/ggml-org/llama.cpp:server-cuda`
- **Port**: 41980 (host network mode)
- **Models**: Mounted from `./models/` (read-only)
- **Config**: `mcp-config.json` and `ui-config.json` from `.config/`

### MCP Services
| Service | Port | Description |
|---------|------|-------------|
| doc-editor | 3001 | TypeScript facade over docx-mcp for Word document operations |
| web-search | 5005 | Web search capabilities |
| job-search | - | Job search MCP server |
| linkedin-search | - | LinkedIn search MCP server |

### Configuration Files
- `.config/mcp-config.json` — MCP server definitions for llama.cpp
- `.config/ui-config.json` — UI-specific MCP client configuration
- `docker-compose.yml` — Docker service definitions and model parameters

## Data Flow

1. User interacts with Web UI at `http://localhost:41980`
2. llama.cpp server reads MCP configuration from mounted config files
3. MCP proxy routes tool calls to registered MCP servers
4. MCP servers (doc-editor, web-search, etc.) execute tools and return results
5. Results are displayed in the Web UI

## File Structure

```
llama_cpp/
├── docker-compose.yml          # Docker service definitions
├── .config/
│   ├── mcp-config.json         # MCP server configuration
│   └── ui-config.json          # UI configuration
├── models/                     # GGUF model files
├── mcp-services/               # MCP server implementations
│   ├── doc-editor/
│   ├── web-search/
│   ├── job-search/
│   └── linkedin-search/
├── specifications/             # Feature specifications
└── docs/                       # Documentation (this file)
```
