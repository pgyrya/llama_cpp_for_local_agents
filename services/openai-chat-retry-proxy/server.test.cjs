'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const test = require('node:test');
const { createRetryProxy } = require('./server.cjs');

async function start(server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
}

async function close(server) {
  server.closeAllConnections();
  server.close();
  await once(server, 'close');
}

async function createProxyForTest(upstream, options = {}) {
  const upstreamPort = await start(upstream);
  const proxy = createRetryProxy({
    upstreamUrl: `http://127.0.0.1:${upstreamPort}`,
    host: '127.0.0.1',
    port: 0,
    headerGraceMs: 20,
    heartbeatIntervalMs: 10,
    retryDelayMs: 30,
    maxRetries: 1,
    ...options
  });
  await once(proxy, 'listening');
  return { proxy, url: `http://127.0.0.1:${proxy.address().port}` };
}

function sendRequest(url, requestPath, method, body) {
  return new Promise((resolve, reject) => {
    const request = http.request(`${url}${requestPath}`, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' }
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        statusCode: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8')
      }));
    });
    request.on('error', reject);
    request.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

function sendStreamingRequest(url) {
  return sendRequest(url, '/v1/chat/completions', 'POST', {
    model: 'test-model',
    stream: true,
    messages: []
  });
}

test('forwards model discovery and non-streaming requests without retrying', async t => {
  const forwarded = [];
  const upstream = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      forwarded.push({
        method: request.method,
        url: request.url,
        body: Buffer.concat(chunks).toString('utf8')
      });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
    });
  });
  const { proxy, url } = await createProxyForTest(upstream);
  t.after(() => close(proxy));
  t.after(() => close(upstream));

  const models = await sendRequest(url, '/v1/models', 'GET');
  const completion = await sendRequest(url, '/v1/chat/completions', 'POST', {
    model: 'test-model',
    stream: false,
    messages: []
  });

  assert.equal(models.statusCode, 200);
  assert.equal(completion.statusCode, 200);
  assert.deepEqual(forwarded, [
    { method: 'GET', url: '/v1/models', body: '' },
    {
      method: 'POST',
      url: '/v1/chat/completions',
      body: JSON.stringify({ model: 'test-model', stream: false, messages: [] })
    }
  ]);
});

test('holds a slow streaming request open with SSE keepalives', async t => {
  const upstream = http.createServer((request, response) => {
    setTimeout(() => {
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      response.end('data: {"choices":[]}\n\ndata: [DONE]\n\n');
    }, 70);
  });
  const { proxy, url } = await createProxyForTest(upstream);
  t.after(() => close(proxy));
  t.after(() => close(upstream));

  const result = await sendStreamingRequest(url);

  assert.equal(result.statusCode, 200);
  assert.match(result.headers['content-type'], /text\/event-stream/);
  assert.match(result.body, /: waiting for model response/);
  assert.match(result.body, /data: \[DONE\]/);
});

test('waits before retrying one failed upstream stream', async t => {
  let requestCount = 0;
  let firstRequestAt;
  let secondRequestAt;
  const upstream = http.createServer((request, response) => {
    requestCount += 1;
    if (requestCount === 1) {
      firstRequestAt = Date.now();
      response.writeHead(503);
      response.end('temporary failure');
      return;
    }
    secondRequestAt = Date.now();
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.end('data: {"choices":[]}\n\ndata: [DONE]\n\n');
  });
  const { proxy, url } = await createProxyForTest(upstream, { retryDelayMs: 50 });
  t.after(() => close(proxy));
  t.after(() => close(upstream));

  const result = await sendStreamingRequest(url);

  assert.equal(requestCount, 2);
  assert.ok(secondRequestAt - firstRequestAt >= 40);
  assert.match(result.body, /data: \[DONE\]/);
});

test('does not retry more than once and reports the final upstream error', async t => {
  let requestCount = 0;
  const upstream = http.createServer((request, response) => {
    requestCount += 1;
    response.writeHead(503);
    response.end('temporary failure');
  });
  const { proxy, url } = await createProxyForTest(upstream);
  t.after(() => close(proxy));
  t.after(() => close(upstream));

  const result = await sendStreamingRequest(url);

  assert.equal(requestCount, 2);
  assert.equal(result.statusCode, 200);
  assert.match(result.body, /Model endpoint returned HTTP 503/);
  assert.match(result.body, /data: \[DONE\]/);
});

test('preserves a non-retryable upstream status without retrying', async t => {
  let requestCount = 0;
  const errorBody = JSON.stringify({ error: { message: 'Invalid model.' } });
  const upstream = http.createServer((request, response) => {
    requestCount += 1;
    response.writeHead(401, { 'content-type': 'application/json' });
    response.end(errorBody);
  });
  const { proxy, url } = await createProxyForTest(upstream, { headerGraceMs: 1000 });
  t.after(() => close(proxy));
  t.after(() => close(upstream));

  const result = await sendStreamingRequest(url);

  assert.equal(requestCount, 1);
  assert.equal(result.statusCode, 401);
  assert.equal(result.body, errorBody);
});

test('encodes a late non-retryable error in the opened SSE response', async t => {
  let requestCount = 0;
  const upstream = http.createServer((request, response) => {
    requestCount += 1;
    setTimeout(() => {
      response.writeHead(401, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'Invalid model.' } }));
    }, 70);
  });
  const { proxy, url } = await createProxyForTest(upstream);
  t.after(() => close(proxy));
  t.after(() => close(upstream));

  const result = await sendStreamingRequest(url);

  assert.equal(requestCount, 1);
  assert.equal(result.statusCode, 200);
  assert.match(result.headers['content-type'], /text\/event-stream/);
  assert.match(result.body, /: waiting for model response/);
  assert.match(result.body, /data: {"error":{"message":"Invalid model\."}}/);
  assert.match(result.body, /data: \[DONE\]/);
});

test('does not retry after model response data has started', async t => {
  let requestCount = 0;
  const upstream = http.createServer((request, response) => {
    requestCount += 1;
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.write('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n');
    response.end();
  });
  const { proxy, url } = await createProxyForTest(upstream);
  t.after(() => close(proxy));
  t.after(() => close(upstream));

  const result = await sendStreamingRequest(url);

  assert.equal(requestCount, 1);
  assert.match(result.body, /partial/);
});

test('cancels the upstream request when the client disconnects', async t => {
  let markStarted;
  let markAborted;
  const started = new Promise(resolve => { markStarted = resolve; });
  const aborted = new Promise(resolve => { markAborted = resolve; });
  const upstream = http.createServer(request => {
    request.on('aborted', markAborted);
    markStarted();
  });
  const { proxy, url } = await createProxyForTest(upstream, { headerGraceMs: 1000 });
  t.after(() => close(proxy));
  t.after(() => close(upstream));

  const request = http.request(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' }
  });
  request.on('error', () => {});
  request.end(JSON.stringify({ model: 'test-model', stream: true, messages: [] }));
  await started;
  request.destroy();
  await Promise.race([
    aborted,
    new Promise((_, reject) => setTimeout(() => reject(new Error('upstream request was not canceled')), 500))
  ]);
});