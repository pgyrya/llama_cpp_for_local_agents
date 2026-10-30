# TODO

This file tracks improvement ideas, bugs, issues encountered during development and testing, and future development plans for this llama_cpp deployment repository.

For action items specific to individual MCP services, please see `TODO.md` in the corresponding subfolder.

## Future Development

### Documentation
- [ ] Document system GPU requirements and  model recommendations

### Agent suggestions
- [ ] Live-verify Copilot BYOK through the retry proxy: confirm the SSE fallback keeps the 2026-10-27 long-prefill request connected and one pre-output upstream failure retries after 120 seconds ([specification](specifications/openai-chat-retry-proxy.md)).
