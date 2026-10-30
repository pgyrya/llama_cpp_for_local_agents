# OpenAI Chat Retry Proxy

An optional local gateway for VS Code Copilot BYOK requests to llama.cpp. It handles streamed `/v1/chat/completions` requests, emits SSE keepalives during long model prefill, and retries one eligible upstream failure after a two-minute delay.

## Use with Compose

Start the proxy profile from the repository root:

```bash
docker compose up -d openai-chat-retry-proxy
```

Set the custom Copilot model URL to `http://localhost:41981`, as shown in [chatLanguageModels.example.json](../../chatLanguageModels.example.json). The proxy forwards to the existing llama.cpp endpoint at `http://127.0.0.1:41980`. The profile does not start llama.cpp; start the model service separately if it is not already running.

The proxy binds to loopback only. Its defaults are set in [docker-compose.yml](../../docker-compose.yml). To run the tests without Docker:

```bash
node --test services/openai-chat-retry-proxy/server.test.cjs
```

## Retry Boundaries

Only streamed chat-completion requests are buffered for replay. The proxy retries once for an upstream transport failure, HTTP 408/429/5xx, or a successful stream that closes before sending any bytes. It waits two minutes before retrying. It never retries after upstream response bytes have begun, avoiding duplicated or conflicting model output. Other paths and non-streaming requests are forwarded without retry.

The three-minute header grace is shorter than the reported Copilot header timeout. If llama.cpp has not returned response data by then, the proxy opens an SSE response and sends comments periodically so the client connection remains active during prefill. This protects the streaming request from a header/idle timeout; it does not force the model to finish sooner. A retry is still contingent on the upstream request actually failing or closing.

For llama.cpp request stalls and upstream failures, this proxy is the primary recovery path.

The proxy must be selected in the Copilot model configuration; it cannot recover a request that bypassed the proxy or one Copilot has already canceled.
