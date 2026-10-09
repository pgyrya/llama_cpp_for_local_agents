# Contributing to llama_cpp

This document provides guidelines for contributing to the llama_cpp repository and explains where different types of information should be documented.

## Documentation Guidelines

Per [AGENTS.md](AGENTS.md), written information should never be duplicated across multiple places. Use **clickable markdown links** to reference files and documents instead of restating content.

### Where to Document Information

| Type of Information | Location |
|---------------------|----------|
| Feature specifications | [specifications/](specifications/README.md) folder |
| User stories / feature requests | [product/](product/README.md) folder (main repo) or [mcp-services/*/product/](mcp-services/README.md) |
| Architecture diagrams | [docs/architecture.md](docs/architecture.md) |
| Troubleshooting guides | [docs/troubleshooting.md](docs/troubleshooting.md) |
| MCP service documentation | [mcp-services/*/README.md](mcp-services/README.md) |
| Model documentation | [models/](models/README.md) folder (create README.md) |
| Improvement ideas & bugs | [TODO.md](TODO.md) |
| Repository rules | [AGENTS.md](AGENTS.md) |

### README Files

- **Root README.md** ([README.md](README.md)): Explain the setup and include clickable links to other materials. Do not embed large code blocks, architecture diagrams, or troubleshooting sections — link to the appropriate documentation files instead.
- **Subfolder README.md**: Document the purpose of the folder and link to relevant files. Do not duplicate content from referenced files.

### Specifications

Each specification should:
- Have a clear purpose (link to a request file in the product folder if applicable)
- Describe the testing state for the functionality
- List all tests applied to verify the behavior
- Reflect whether tests are sufficient
- Propose additional tests if gaps emerge

### Code Contributions

1. Follow the established patterns in the repository
2. Update documentation when changing functionality
3. Ensure all links in README.md files are valid
4. Test changes thoroughly before submitting

### File Naming Conventions

- Markdown files: lowercase with hyphens (e.g., `my-feature.md`)
- Configuration files: follow existing patterns (e.g., `mcp-config.json`)
- Scripts: lowercase with hyphens (e.g., `wait-for-server.sh`)

## Quick Links

- [AGENTS.md](AGENTS.md) — Repository rules and practices
- [README.md](README.md) — Setup and overview
- [specifications/](specifications/README.md) — Feature specifications
- [docs/](docs/architecture.md) — Architecture and troubleshooting
- [TODO.md](TODO.md) — Future development and issues
