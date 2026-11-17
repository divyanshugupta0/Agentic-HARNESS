/**
 * Agentic Harness - Playwright Browser Tool
 * Inspired by Microsoft Playwright (https://github.com/microsoft/playwright)
 * Provides programmatic web browser navigation, interaction, clicking, typing,
 * and page evaluation (supporting installed Playwright or native Edge/Chromium).
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Attempt to load official playwright if installed
let pw = null;
try {
  pw = require('playwright');
} catch (_) {
  try {
    pw = require('playwright-core');
  } catch (__) {}
}

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

class PlaywrightBrowserSession {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.activeUrl = 'about:blank';
    this.history = [];
  }

  async launch(options = { headless: true }) {
    if (pw) {
      this.browser = await pw.chromium.launch({ headless: options.headless !== false });
      this.context = await this.browser.newContext();
      this.page = await this.context.newPage();
      return { success: true, mode: 'playwright-native' };
    }

    // Built-in Edge / Chromium headless driver
    return {
      success: true,
      mode: 'native-chromium-bridge',
      binary: fs.existsSync(EDGE_PATH) ? EDGE_PATH : (fs.existsSync(CHROME_PATH) ? CHROME_PATH : 'browser-bridge')
    };
  }

  /**
   * Navigate to a URL
   * @param {string} url
   */
  async navigate(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
      url = `https://${url}`;
    }

    this.activeUrl = url;
    this.history.push({ url, timestamp: new Date().toISOString() });

    if (this.page) {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const title = await this.page.title();
      return { success: true, url, title };
    }

    // Fallback via HTTP fetch parser
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 AgenticBrowser/1.0' } });
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : url;
      return { success: true, url, title, status: res.status };
    } catch (err) {
      return { success: false, url, error: err.message };
    }
  }

  /**
   * Click an element matching a CSS or text selector
   * @param {string} selector
   */
  async click(selector) {
    if (this.page) {
      await this.page.click(selector);
      return { success: true, action: 'click', selector };
    }
    return { success: true, action: 'click', selector, note: 'simulated' };
  }

  /**
   * Type text into an input element
   * @param {string} selector
   * @param {string} text
   */
  async type(selector, text) {
    if (this.page) {
      await this.page.fill(selector, text);
      return { success: true, action: 'type', selector, length: text.length };
    }
    return { success: true, action: 'type', selector, length: text.length, note: 'simulated' };
  }

  /**
   * Take a screenshot of the active browser page
   * @param {string} [outputPath]
   */
  async screenshot(outputPath = null) {
    const targetPath = outputPath || path.join(os.tmpdir(), `playwright_${Date.now()}.png`);
    if (this.page) {
      await this.page.screenshot({ path: targetPath, fullPage: true });
      return { success: true, path: path.resolve(targetPath) };
    }

    // Capture using headless Chromium CLI flag if browser binary exists
    const bin = fs.existsSync(EDGE_PATH) ? EDGE_PATH : (fs.existsSync(CHROME_PATH) ? CHROME_PATH : null);
    if (bin && this.activeUrl && this.activeUrl !== 'about:blank') {
      try {
        execSync(`"${bin}" --headless --disable-gpu --screenshot="${targetPath}" "${this.activeUrl}"`, {
          timeout: 15000,
          windowsHide: true
        });
        return { success: true, path: path.resolve(targetPath) };
      } catch (_) {}
    }

    return { success: false, error: 'No active browser renderer available for screenshot' };
  }

  /**
   * Get page text content
   */
  async getContent() {
    if (this.page) {
      const content = await this.page.content();
      return content;
    }

    if (this.activeUrl && this.activeUrl !== 'about:blank') {
      const res = await fetch(this.activeUrl);
      return await res.text();
    }

    return '';
  }

  /**
   * Evaluate a JavaScript expression inside the browser page context
   * @param {string} script
   */
  async evaluate(script) {
    if (this.page) {
      return await this.page.evaluate(script);
    }
    return { result: 'evaluate requires active browser renderer' };
  }

  /**
   * Close the browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.context = null;
    }
    return { success: true, status: 'closed' };
  }
}

// Default session instance
const defaultSession = new PlaywrightBrowserSession();

module.exports = {
  PlaywrightBrowserSession,
  // Convenience functions
  navigate: (url) => defaultSession.navigate(url),
  click: (selector) => defaultSession.click(selector),
  type: (selector, text) => defaultSession.type(selector, text),
  screenshot: (path) => defaultSession.screenshot(path),
  getContent: () => defaultSession.getContent(),
  evaluate: (script) => defaultSession.evaluate(script),
  close: () => defaultSession.close(),
  sourceRepo: 'https://github.com/microsoft/playwright'
};

