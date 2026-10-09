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
| [doc-editor specs](../mcp-services/doc-editor/specifications/README.md) | Document editing MCP tools |
| [web-search specs](../mcp-services/web-search/specifications/README.md) | Web search MCP tools |
| [job-search specs](../mcp-services/job-search/specifications/README.md) | Job search MCP tools |
| [linkedin-search specs](../mcp-services/linkedin-search/specifications/README.md) | LinkedIn job search MCP tools |

## Creating a New Specification

1. Create a markdown file: `spec-name.md`
2. Include frontmatter with `**ID**` and `**Status**`
3. Link to the relevant product requirement (if any)
4. List all tests applied to verify the behavior
5. Reference source files with clickable links — do not copy code
