# TODO — llama_cpp Repository

This file tracks improvement ideas, bugs, issues encountered during development and testing, and future development plans for the llama_cpp repository.

## Future Development

### Documentation
- [ ] Document MCP service configuration examples in mcp-services/*/README.md files
- [ ] Add architecture diagrams for job-search, linkedin-search, web-search services
- [ ] Document GPU requirements and model size recommendations in docs/

### MCP Services
- [ ] Complete web-search MCP server configuration and documentation
- [ ] Complete job-search MCP server configuration and documentation
- [ ] Complete linkedin-search MCP server configuration and documentation
- [ ] Add integration tests for MCP service communication with llama.cpp server

### Infrastructure
- [ ] Add health check scripts for Docker services
- [ ] Add backup/restore scripts for model files

### Security
- [ ] Add security checklist for MCP server dependencies
- [ ] Document port exposure and firewall recommendations

## Bugs & Issues

- [ ] doc-editor: `inspect_document` tool crashes (see [doc-editor/TODO.md#t005](mcp-services/doc-editor/TODO.md#t005))


