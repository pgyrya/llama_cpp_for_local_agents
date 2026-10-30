# Specifications

This folder contains specifications for each feature/capability implemented in this repository.

Per [AGENTS.md](../AGENTS.md), each specification should:
- Have a clear purpose (linking to a request file in [product/](../product/README.md) when applicable)
- Include an ID for reference
- Document the testing state for the specified functionality
- Reference, not duplicate, functional files (use clickable links)

## Structure

Specifications are organized by capability. Cross-cutting specs go here; 

Service-specific specs live in the service's subfolder - e.g.:

| Location | Capability |
|----------|-----------|
| [web-search MCP specs](../mcp-services/web-search/specifications/README.md) | Web search MCP tools |
| [OpenAI chat retry proxy](./services/openai-chat-retry-proxy/openai-chat-retry-proxy.md) | Resilient local streaming endpoint for Copilot BYOK |

## Creating a New Specification

1. Create a markdown file: `spec-name.md`
2. Include frontmatter with `**ID**` and `**Status**`
3. Link to the relevant product requirement (if any)
4. List all tests applied to verify the behavior
5. Reference source files with clickable links — do not copy code
