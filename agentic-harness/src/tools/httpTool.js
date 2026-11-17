/**
 * Agentic Harness - HTTP Client Tool
 * Provides REST API requests, web scraping, and content extraction for agents.
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

/**
 * Perform an HTTP GET request
 * @param {string} url
 * @param {Object} [options]
 * @returns {Promise<any>}
 */
async function httpGet(url, options = {}) {
  const { headers = {}, timeoutMs = 15000, parseJson = true } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'AgenticHarness/1.0 (+https://github.com/agentic-harness)',
        ...headers
      },
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`HTTP GET ${url} failed with status ${res.status} (${res.statusText})`);
    }

    if (parseJson) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
    }

    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Perform an HTTP POST request
 * @param {string} url
 * @param {any} body
 * @param {Object} [options]
 * @returns {Promise<any>}
 */
async function httpPost(url, body, options = {}) {
  const { headers = {}, timeoutMs = 15000 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const isJson = typeof body === 'object' && !(body instanceof FormData);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': 'AgenticHarness/1.0',
        ...(isJson ? { 'Content-Type': 'application/json' } : {}),
        ...headers
      },
      body: isJson ? JSON.stringify(body) : body,
      signal: controller.signal
    });

    if (!res.ok) {
      throw new Error(`HTTP POST ${url} failed with status ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Perform an HTTP PUT request
 */
async function httpPut(url, body, options = {}) {
  const { headers = {}, timeoutMs = 15000 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const isJson = typeof body === 'object';
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'User-Agent': 'AgenticHarness/1.0',
        ...(isJson ? { 'Content-Type': 'application/json' } : {}),
        ...headers
      },
      body: isJson ? JSON.stringify(body) : body,
      signal: controller.signal
    });

    if (!res.ok) throw new Error(`HTTP PUT ${url} failed with status ${res.status}`);
    return await res.json().catch(() => res.text());
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Perform an HTTP DELETE request
 */
async function httpDelete(url, options = {}) {
  const { headers = {}, timeoutMs = 15000 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { 'User-Agent': 'AgenticHarness/1.0', ...headers },
      signal: controller.signal
    });

    if (!res.ok) throw new Error(`HTTP DELETE ${url} failed with status ${res.status}`);
    return { success: true, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch and extract clean text content from a web page (stripping HTML, scripts, CSS)
 * @param {string} url
 * @param {Object} [options]
 * @returns {Promise<{ title: string, text: string, url: string }>}
 */
async function fetchWebPage(url, options = {}) {
  const html = await httpGet(url, { parseJson: false, timeoutMs: options.timeoutMs || 20000 });

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : url;

  // Clean HTML to readable text for agent reasoning
  const cleanText = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    url,
    title,
    text: cleanText.slice(0, options.maxLength || 100000)
  };
}

/**
 * Check if a URL endpoint is reachable
 * @param {string} url
 * @returns {Promise<{ online: boolean, status: number, responseTimeMs: number }>}
 */
async function checkHealth(url) {
  const start = Date.now();
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return {
      online: res.ok,
      status: res.status,
      responseTimeMs: Date.now() - start
    };
  } catch (err) {
    return {
      online: false,
      status: 0,
      responseTimeMs: Date.now() - start,
      error: err.message
    };
  }
}

module.exports = {
  httpGet,
  httpPost,
  httpPut,
  httpDelete,
  fetchWebPage,
  checkHealth
};
