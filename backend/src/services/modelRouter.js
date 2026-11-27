/**
 * Model Request Router
 * Routes chat completion requests strictly to the target provider's endpoint
 * using only that provider's credentials.
 */

const zlib = require('node:zlib');

const OPENAI_COMPATIBLE_TYPES = new Set(['openai', 'deepseek', 'openrouter', 'groq', 'custom']);

function extractPdfTextFromBase64(b64) {
  try {
    const raw = Buffer.from(b64, 'base64').toString('latin1');
    const chunks = [];
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;

    while ((match = streamRegex.exec(raw)) !== null) {
      let textBlock = match[1];
      try {
        textBlock = zlib.inflateSync(Buffer.from(match[1], 'latin1')).toString('latin1');
      } catch (_) {}

      const tjMatches = textBlock.match(/\(([^()]*)\)\s*Tj|\[([\s\S]*?)\]\s*TJ/g);
      if (tjMatches) {
        for (const item of tjMatches) {
          const inner = item.match(/\(([^()]*)\)/g);
          if (inner) {
            chunks.push(inner.map((s) => s.slice(1, -1).replace(/\\([()\\])/g, '$1')).join(''));
          }
        }
      }
    }
    return chunks.join(' ').replace(/\s+/g, ' ').trim().slice(0, 24000);
  } catch (_) {
    return '';
  }
}

function formatTextFilesContext(files) {
  if (!Array.isArray(files) || files.length === 0) return '';
  const sections = [];
  for (const f of files) {
    if (!f || !f.name) continue;
    if (f.content) {
      sections.push(`[Attached File: ${f.name}]\n${String(f.content).slice(0, 24000)}`);
    } else if (f.data && (f.mimeType === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))) {
      const extracted = extractPdfTextFromBase64(f.data);
      sections.push(
        extracted
          ? `[Attached PDF: ${f.name}]\n${extracted}`
          : `[Attached PDF: ${f.name}] (Binary PDF attached; text extraction unavailable for this encoding.)`
      );
    }
  }
  return sections.join('\n\n');
}

const DEFAULT_BASE_URLS = {
  anthropic: 'https://api.anthropic.com/v1',
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  ollama: 'http://localhost:11434',
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1'
};

function normalizeBaseUrl(baseURL, type) {
  const raw = (baseURL || DEFAULT_BASE_URLS[type] || '').trim();
  if (!raw) {
    throw new Error(`Missing base endpoint URL for provider "${type}"`);
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid base endpoint URL for provider "${type}"`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Provider base URL must use http or https');
  }
  return raw.replace(/\/+$/, '');
}

function buildTargetRequest({ provider, model, messages, audio, images, files }) {
  if (!provider || typeof provider !== 'object') {
    throw new Error('Provider configuration is required');
  }
  const type = String(provider.type || '').trim().toLowerCase();
  if (!type) {
    throw new Error('Provider type is required');
  }
  const modelId = String(model || '').trim();
  if (!modelId) {
    throw new Error('Model ID is required');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('At least one message is required');
  }

  const apiKey = typeof provider.apiKey === 'string' ? provider.apiKey.trim() : '';
  const requiresKey = type !== 'ollama' && type !== 'custom';
  if (requiresKey && !apiKey) {
    throw new Error(`API key is required for provider "${type}"`);
  }

  const base = normalizeBaseUrl(provider.baseURL, type);
  const validImages = Array.isArray(images) ? images.filter((img) => img && (img.data || img.dataUrl)) : [];
  const validFiles = Array.isArray(files) ? files.filter((f) => f && f.name) : [];

  if (type === 'gemini') {
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m, idx, arr) => {
        const parts = [{ text: String(m.content || '') }];
        const isLastUser = idx === arr.length - 1 && m.role !== 'assistant';
        if (isLastUser && audio?.data) {
          parts.push({
            inlineData: {
              mimeType: audio.mimeType || 'audio/webm',
              data: audio.data
            }
          });
        }
        if (isLastUser && validImages.length > 0) {
          for (const img of validImages) {
            if (img.data) {
              parts.push({
                inlineData: {
                  mimeType: img.mimeType || 'image/png',
                  data: img.data
                }
              });
            }
          }
        }
        if (isLastUser && validFiles.length > 0) {
          for (const f of validFiles) {
            if (f.data && (f.mimeType === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))) {
              parts.push({
                inlineData: {
                  mimeType: 'application/pdf',
                  data: f.data
                }
              });
            } else if (f.content) {
              parts.push({ text: `\n\n[Attached File: ${f.name}]\n${String(f.content).slice(0, 24000)}` });
            }
          }
        }
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts
        };
      });
    const systemMsg = messages.find((m) => m.role === 'system');
    const body = { contents };
    if (systemMsg?.content) {
      body.systemInstruction = { parts: [{ text: String(systemMsg.content) }] };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-goog-api-key'] = apiKey;

    return {
      type,
      url: `${base}/models/${encodeURIComponent(modelId)}:generateContent`,
      headers,
      body
    };
  }

  if (type === 'anthropic') {
    const systemMsg = messages.find((m) => m.role === 'system');
    const nonSystem = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '')
      }));
    const body = {
      model: modelId,
      max_tokens: 4096,
      messages: nonSystem
    };
    if (systemMsg?.content) {
      body.system = String(systemMsg.content);
    }

    return {
      type,
      url: `${base}/messages`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body
    };
  }

  if (type === 'ollama') {
    return {
      type,
      url: `${base}/api/chat`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        model: modelId,
        messages: messages.map((m) => ({
          role: m.role,
          content: String(m.content || '')
        })),
        stream: false
      }
    };
  }

  if (OPENAI_COMPATIBLE_TYPES.has(type)) {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    return {
      type,
      url: `${base}/chat/completions`,
      headers,
      body: {
        model: modelId,
        messages: messages.map((m, idx, arr) => {
          const isLastUser = idx === arr.length - 1 && m.role !== 'assistant';
          const fileContext = isLastUser ? formatTextFilesContext(validFiles) : '';
          const textContent = fileContext
            ? `${String(m.content || '')}\n\n${fileContext}`
            : String(m.content || '');
          if (isLastUser && validImages.length > 0) {
            return {
              role: m.role,
              content: [
                { type: 'text', text: textContent },
                ...validImages.map((img) => ({
                  type: 'image_url',
                  image_url: { url: img.dataUrl || `data:${img.mimeType || 'image/png'};base64,${img.data}` }
                }))
              ]
            };
          }
          return {
            role: m.role,
            content: textContent
          };
        })
      }
    };
  }

  throw new Error(`Unsupported provider type: ${type}`);
}

function extractResponseContent(type, data) {
  if (!data || typeof data !== 'object') return '';
  if (type === 'gemini') {
    const parts = data.candidates?.[0]?.content?.parts;
    return Array.isArray(parts) ? parts.map((p) => p.text || '').join('') : '';
  }
  if (type === 'anthropic') {
    const blocks = data.content;
    return Array.isArray(blocks) ? blocks.map((b) => b.text || '').join('') : '';
  }
  if (type === 'ollama') {
    return data.message?.content || '';
  }
  return data.choices?.[0]?.message?.content || '';
}

async function routeModelRequest({ provider, model, messages, audio }, fetchImpl = fetch) {
  const target = buildTargetRequest({ provider, model, messages, audio });

  const response = await fetchImpl(target.url, {
    method: 'POST',
    headers: target.headers,
    body: JSON.stringify(target.body),
    signal: AbortSignal.timeout(60000)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const upstreamMsg =
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      `Upstream ${target.type} returned HTTP ${response.status}`;
    const err = new Error(typeof upstreamMsg === 'string' ? upstreamMsg : JSON.stringify(upstreamMsg));
    err.status = response.status;
    throw err;
  }

  return {
    provider: target.type,
    model,
    endpoint: target.url,
    content: extractResponseContent(target.type, payload),
    usage: payload.usage || payload.usageMetadata || null
  };
}

function formatTokenLimit(limit) {
  if (!Number.isFinite(limit) || limit <= 0) return '128k';
  if (limit >= 1000000) return `${Math.round(limit / 1000000)}M`;
  if (limit >= 1000) return `${Math.round(limit / 1000)}k`;
  return String(limit);
}

function buildModelsRequest(provider) {
  if (!provider || typeof provider !== 'object') {
    throw new Error('Provider configuration is required');
  }
  const type = String(provider.type || '').trim().toLowerCase();
  if (!type) {
    throw new Error('Provider type is required');
  }

  const apiKey = typeof provider.apiKey === 'string' ? provider.apiKey.trim() : '';
  const requiresKey = type !== 'ollama' && type !== 'custom';
  if (requiresKey && !apiKey) {
    throw new Error(`API key is required for provider "${type}"`);
  }

  const base = normalizeBaseUrl(provider.baseURL, type);

  if (type === 'gemini') {
    const headers = {};
    if (apiKey) headers['x-goog-api-key'] = apiKey;
    return { type, url: `${base}/models?pageSize=100`, headers };
  }

  if (type === 'anthropic') {
    return {
      type,
      url: `${base}/models`,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    };
  }

  if (type === 'ollama') {
    return { type, url: `${base}/api/tags`, headers: {} };
  }

  if (OPENAI_COMPATIBLE_TYPES.has(type)) {
    const headers = {};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    return { type, url: `${base}/models`, headers };
  }

  throw new Error(`Unsupported provider type: ${type}`);
}

function normalizeFetchedModels(type, providerName, payload) {
  if (!payload || typeof payload !== 'object') return [];

  if (type === 'gemini') {
    const raw = Array.isArray(payload.models) ? payload.models : [];
    return raw
      .filter((m) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
      )
      .map((m) => {
        const id = String(m.name || '').replace(/^models\//, '');
        return {
          id,
          name: m.displayName || id,
          context: formatTokenLimit(m.inputTokenLimit),
          tag: id.includes('flash') ? 'Fast' : id.includes('pro') ? 'Pro' : 'Gemini',
          provider: providerName
        };
      })
      .filter((m) => m.id)
      .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
  }

  if (type === 'ollama') {
    const raw = Array.isArray(payload.models) ? payload.models : [];
    return raw.map((m) => ({
      id: m.name,
      name: m.name,
      context: m.details?.parameter_size || 'Local',
      tag: 'Ollama',
      provider: providerName
    }));
  }

  const raw = Array.isArray(payload.data) ? payload.data : [];
  return raw
    .map((m) => {
      const id = String(m.id || '');
      const isFreeOpenRouter =
        type === 'openrouter' &&
        (id.endsWith(':free') ||
          (m.pricing && String(m.pricing.prompt) === '0' && String(m.pricing.completion) === '0'));
      return {
        id,
        name: m.display_name || m.name || id,
        context: formatTokenLimit(m.context_length || m.context_window),
        tag: isFreeOpenRouter ? 'Free' : 'Live',
        provider: providerName
      };
    })
    .filter((m) => m.id)
    .sort((a, b) => {
      if (a.tag === 'Free' && b.tag !== 'Free') return -1;
      if (b.tag === 'Free' && a.tag !== 'Free') return 1;
      return a.id.localeCompare(b.id);
    });
}

async function fetchProviderModels({ provider }, fetchImpl = fetch) {
  const target = buildModelsRequest(provider);
  const response = await fetchImpl(target.url, {
    method: 'GET',
    headers: target.headers,
    signal: AbortSignal.timeout(15000)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const upstreamMsg =
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      `Failed to fetch models from ${target.type} (HTTP ${response.status})`;
    const err = new Error(typeof upstreamMsg === 'string' ? upstreamMsg : JSON.stringify(upstreamMsg));
    err.status = response.status;
    throw err;
  }

  return normalizeFetchedModels(target.type, provider.name || target.type, payload);
}

async function streamModelRequest({ provider, model, messages, onChunk, onThinking, audio, images, files }, fetchImpl = fetch) {
  const target = buildTargetRequest({ provider, model, messages, audio, images, files });
  let streamUrl = target.url;
  const streamBody = { ...target.body };

  if (target.type === 'gemini') {
    streamUrl = `${target.url.replace(':generateContent', ':streamGenerateContent')}?alt=sse`;
  } else {
    streamBody.stream = true;
  }

  const response = await fetchImpl(streamUrl, {
    method: 'POST',
    headers: target.headers,
    body: JSON.stringify(streamBody),
    signal: AbortSignal.timeout(60000)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const upstreamMsg =
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      `Upstream ${target.type} returned HTTP ${response.status}`;
    const err = new Error(typeof upstreamMsg === 'string' ? upstreamMsg : JSON.stringify(upstreamMsg));
    err.status = response.status;
    throw err;
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    const payload = await response.json().catch(() => ({}));
    const text = extractResponseContent(target.type, payload);
    if (text && onChunk) onChunk(text);
    return { provider: target.type, model, endpoint: streamUrl, content: text };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  const emit = (delta) => {
    if (!delta) return;
    fullContent += delta;
    if (onChunk) onChunk(delta);
  };

  const emitThinking = (delta) => {
    if (!delta) return;
    if (onThinking) onThinking(delta);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (target.type === 'ollama') {
        try {
          const obj = JSON.parse(line);
          if (obj?.message?.thinking) emitThinking(obj.message.thinking);
          if (obj?.message?.content) emit(obj.message.content);
        } catch (_) {}
        continue;
      }

      if (!line.startsWith('data:')) continue;
      const dataStr = line.slice(5).trim();
      if (!dataStr || dataStr === '[DONE]') continue;

      try {
        const obj = JSON.parse(dataStr);
        if (target.type === 'gemini') {
          const parts = obj.candidates?.[0]?.content?.parts;
          if (Array.isArray(parts)) {
            for (const p of parts) {
              if (!p?.text) continue;
              if (p.thought) emitThinking(p.text);
              else emit(p.text);
            }
          }
        } else if (target.type === 'anthropic') {
          if (obj.type === 'content_block_delta') {
            if (obj.delta?.type === 'thinking_delta' && obj.delta?.thinking) {
              emitThinking(obj.delta.thinking);
            } else if (obj.delta?.text) {
              emit(obj.delta.text);
            }
          }
        } else {
          const choiceDelta = obj.choices?.[0]?.delta;
          if (choiceDelta?.reasoning_content) emitThinking(choiceDelta.reasoning_content);
          else if (choiceDelta?.reasoning) emitThinking(choiceDelta.reasoning);
          if (choiceDelta?.content) emit(choiceDelta.content);
        }
      } catch (_) {}
    }
  }

  return {
    provider: target.type,
    model,
    endpoint: streamUrl,
    content: fullContent
  };
}

module.exports = {
  buildTargetRequest,
  buildModelsRequest,
  normalizeFetchedModels,
  extractResponseContent,
  routeModelRequest,
  streamModelRequest,
  fetchProviderModels
};

