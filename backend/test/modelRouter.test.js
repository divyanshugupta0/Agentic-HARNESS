const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTargetRequest, routeModelRequest, streamModelRequest, fetchProviderModels } = require('../src/services/modelRouter');

test('routes Gemini model (e.g. gemini-4-hydrogen) strictly to Gemini generateContent with only Gemini key', async () => {
  let capturedUrl = null;
  let capturedOptions = null;

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Hello from Gemini 4 Hydrogen' }] } }]
      })
    };
  };

  const result = await routeModelRequest(
    {
      provider: {
        type: 'gemini',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: 'AIza-gemini-only-key'
      },
      model: 'gemini-4-hydrogen',
      messages: [{ role: 'user', content: 'Hi Gemini' }]
    },
    mockFetch
  );

  assert.equal(
    capturedUrl,
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent'
  );
  assert.equal(capturedOptions.headers['x-goog-api-key'], 'AIza-gemini-only-key');
  assert.equal(capturedOptions.headers.Authorization, undefined);
  assert.equal(capturedOptions.headers['x-api-key'], undefined);
  assert.equal(result.content, 'Hello from Gemini 4 Hydrogen');
  assert.equal(result.model, 'gemini-4-hydrogen');
});

test('routes Anthropic strictly to /messages with x-api-key', () => {
  const target = buildTargetRequest({
    provider: {
      type: 'anthropic',
      baseURL: 'https://api.anthropic.com/v1',
      apiKey: 'sk-ant-only-key'
    },
    model: 'claude-3-7-sonnet',
    messages: [{ role: 'user', content: 'Hello Claude' }]
  });

  assert.equal(target.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(target.headers['x-api-key'], 'sk-ant-only-key');
  assert.equal(target.headers['x-goog-api-key'], undefined);
  assert.equal(target.body.model, 'claude-3-7-sonnet');
});

test('routes OpenAI-compatible & custom providers strictly to /chat/completions', () => {
  const target = buildTargetRequest({
    provider: {
      type: 'custom',
      baseURL: 'http://localhost:8000/v1/',
      apiKey: 'custom-token-123'
    },
    model: 'my-local-model',
    messages: [{ role: 'user', content: 'Ping' }]
  });

  assert.equal(target.url, 'http://localhost:8000/v1/chat/completions');
  assert.equal(target.headers.Authorization, 'Bearer custom-token-123');
  assert.equal(target.body.model, 'my-local-model');
});

test('routes Ollama strictly to /api/chat without requiring API key', () => {
  const target = buildTargetRequest({
    provider: {
      type: 'ollama',
      baseURL: 'http://localhost:11434',
      apiKey: ''
    },
    model: 'llama3.3:70b',
    messages: [{ role: 'user', content: 'Ping' }]
  });

  assert.equal(target.url, 'http://localhost:11434/api/chat');
  assert.equal(target.headers.Authorization, undefined);
  assert.equal(target.body.stream, false);
});

test('rejects cloud provider request when API key is missing', () => {
  assert.throws(
    () =>
      buildTargetRequest({
        provider: { type: 'gemini', baseURL: 'https://generativelanguage.googleapis.com/v1beta', apiKey: '' },
        model: 'gemini-4-hydrogen',
        messages: [{ role: 'user', content: 'Hi' }]
      }),
    /API key is required/
  );
});

test('fetchProviderModels fetches live Gemini models with generateContent support', async () => {
  let capturedUrl = null;
  let capturedHeaders = null;

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        models: [
          {
            name: 'models/gemini-2.5-pro',
            displayName: 'Gemini 2.5 Pro',
            inputTokenLimit: 1048576,
            supportedGenerationMethods: ['generateContent']
          },
          {
            name: 'models/gemini-4-hydrogen',
            displayName: 'Gemini 4 Hydrogen',
            inputTokenLimit: 2097152,
            supportedGenerationMethods: ['generateContent']
          },
          {
            name: 'models/text-embedding-004',
            displayName: 'Text Embedding 004',
            inputTokenLimit: 2048,
            supportedGenerationMethods: ['embedContent']
          }
        ]
      })
    };
  };

  const models = await fetchProviderModels(
    {
      provider: {
        type: 'gemini',
        name: 'Google Gemini',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: 'AIza-test-key'
      }
    },
    mockFetch
  );

  assert.equal(capturedUrl, 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100');
  assert.equal(capturedHeaders['x-goog-api-key'], 'AIza-test-key');
  assert.equal(models.length, 2);
  assert.equal(models[0].id, 'gemini-4-hydrogen');
  assert.equal(models[1].id, 'gemini-2.5-pro');
});

test('streamModelRequest streams Gemini SSE chunks in real time', async () => {
  let capturedUrl = null;
  const encoder = new TextEncoder();
  const sseChunks = [
    'data: {"candidates":[{"content":{"parts":[{"text":"Hello "}]}}]}\n\n',
    'data: {"candidates":[{"content":{"parts":[{"text":"world!"}]}}]}\n\n'
  ];

  const mockFetch = async (url) => {
    capturedUrl = url;
    let idx = 0;
    return {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: async () => {
            if (idx < sseChunks.length) {
              return { value: encoder.encode(sseChunks[idx++]), done: false };
            }
            return { value: undefined, done: true };
          }
        })
      }
    };
  };

  const received = [];
  const res = await streamModelRequest(
    {
      provider: {
        type: 'gemini',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: 'AIza-stream-key'
      },
      model: 'gemini-2.5-flash',
      messages: [{ role: 'user', content: 'Hi' }],
      onChunk: (d) => received.push(d)
    },
    mockFetch
  );

  assert.equal(
    capturedUrl,
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse'
  );
  assert.deepEqual(received, ['Hello ', 'world!']);
  assert.equal(res.content, 'Hello world!');
});

