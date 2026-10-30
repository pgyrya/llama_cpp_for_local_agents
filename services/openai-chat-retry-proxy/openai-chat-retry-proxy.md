# OpenAI Chat Retry Proxy

**ID**: LLM-RETRY-001  
**Status**: Implemented; automated tests pass; live Copilot/llama.cpp verification pending

## Purpose

Protect streamed VS Code Copilot BYOK requests to llama.cpp from long periods without response data and retry one eligible upstream failure after a fixed delay. The implementation and setup are documented in [the service README](../services/openai-chat-retry-proxy/README.md).

## Invariants and Tests

| Invariant | Verification |
|---|---|
| A slow streaming request receives SSE keepalives after the configured header grace. | [holds a slow streaming request open with SSE keepalives](../services/openai-chat-retry-proxy/server.test.cjs) |
| One eligible upstream failure is retried only after the configured delay. | [waits before retrying one failed upstream stream](../services/openai-chat-retry-proxy/server.test.cjs) |
| The request is never retried more than once. | [does not retry more than once and reports the final upstream error](../services/openai-chat-retry-proxy/server.test.cjs) |
| Non-retryable HTTP errors preserve their status before SSE fallback and become SSE errors after fallback. | [preserves a non-retryable upstream status without retrying](../services/openai-chat-retry-proxy/server.test.cjs); [encodes a late non-retryable error in the opened SSE response](../services/openai-chat-retry-proxy/server.test.cjs) |
| Model discovery and non-streaming completions pass through without retries. | [forwards model discovery and non-streaming requests without retrying](../services/openai-chat-retry-proxy/server.test.cjs) |
| No retry occurs after upstream model data has started. | [does not retry after model response data has started](../services/openai-chat-retry-proxy/server.test.cjs) |
| A downstream disconnect cancels the upstream request. | [cancels the upstream request when the client disconnects](../services/openai-chat-retry-proxy/server.test.cjs) |

## Testing State

The focused suite uses local stub HTTP servers and passes. Live verification is still required with the configured VS Code Copilot model and the deployed llama.cpp server. Verify a long-prefill stream remains connected, then verify an upstream failure before response bytes causes one retry after 120 seconds. 

## Remaining Gap

The proxy cannot safely retry after any model response bytes have been delivered, and it cannot recover a stream that the client has already canceled. These limits prevent duplicate generation and are part of the current contract.
