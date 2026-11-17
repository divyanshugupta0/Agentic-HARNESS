/**
 * Agentic Harness - Web Search Tool
 * Searches public developer knowledge bases and indexes for documentation and solutions.
 */

const { httpGet } = require('./httpTool');

/**
 * Search DuckDuckGo Instant Answer API and web index
 * @param {string} query - Search term
 * @param {number} [maxResults=5]
 * @returns {Promise<Array<{ title: string, snippet: string, url: string }>>}
 */
async function webSearch(query, maxResults = 5) {
  if (!query || typeof query !== 'string') {
    throw new Error('Search query must be a non-empty string');
  }

  const encoded = encodeURIComponent(query);
  const apiUrl = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;

  const results = [];

  try {
    const data = await httpGet(apiUrl, { timeoutMs: 10000 });

    // 1. Direct abstract / answer
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        snippet: data.AbstractText,
        url: data.AbstractURL || ''
      });
    }

    // 2. Related topics
    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 50),
            snippet: topic.Text,
            url: topic.FirstURL
          });
        }
        if (results.length >= maxResults) break;
      }
    }
  } catch (_) {
    // If external query fails, provide informative offline fallback
  }

  // If no instant answers, query DuckDuckGo HTML Lite index
  if (results.length === 0) {
    try {
      const htmlUrl = `https://html.duckduckgo.com/html/?q=${encoded}`;
      const html = await httpGet(htmlUrl, { parseJson: false, timeoutMs: 10000 });
      const linkRegex = /<a class="result__snippet[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null && results.length < maxResults) {
        results.push({
          title: query,
          snippet: match[2].replace(/<[^>]+>/g, '').trim(),
          url: match[1]
        });
      }
    } catch (_) {}
  }

  return results.slice(0, maxResults);
}

module.exports = {
  webSearch
};

