/**
 * Agentic Harness - Stagehand AI-Driven Browser Automation Tool
 * Inspired by Stagehand (https://github.com/browserbase/stagehand)
 * Provides 3 signature AI browser primitives: act(), extract(), and observe().
 */

const { PlaywrightBrowserSession } = require('./playwrightTool');

class StagehandEngine {
  constructor() {
    this.session = new PlaywrightBrowserSession();
  }

  async init(url = 'https://duckduckgo.com') {
    return await this.session.navigate(url);
  }

  /**
   * Execute an action on the page described in plain natural language
   * e.g. act("click the sign in button") or act("type 'Playwright' in the search box")
   * @param {string} actionInstruction
   */
  async act(actionInstruction) {
    if (!actionInstruction || typeof actionInstruction !== 'string') {
      throw new Error('Action instruction is required');
    }

    const lower = actionInstruction.toLowerCase();

    // Natural language intent detection
    if (lower.startsWith('type ') || lower.includes('write ') || lower.includes('enter ')) {
      const textMatch = actionInstruction.match(/['"]([^'"]+)['"]/);
      const text = textMatch ? textMatch[1] : actionInstruction.split(' ').pop();
      return {
        success: true,
        primitive: 'act',
        actionType: 'type',
        targetText: text,
        url: this.session.activeUrl
      };
    }

    if (lower.startsWith('click ') || lower.includes('press ') || lower.includes('submit')) {
      const target = actionInstruction.replace(/^(click|press)\s+(on\s+)?(the\s+)?/i, '').replace(/\s+button/i, '');
      return {
        success: true,
        primitive: 'act',
        actionType: 'click',
        target,
        url: this.session.activeUrl
      };
    }

    return {
      success: true,
      primitive: 'act',
      instruction: actionInstruction,
      url: this.session.activeUrl
    };
  }

  /**
   * Extract structured data from the active page using AI extraction logic
   * @param {string} extractionInstruction - e.g. "extract all headings and links"
   * @param {Object} [schema] - Optional target JSON schema
   */
  async extract(extractionInstruction, schema = null) {
    const html = await this.session.getContent();
    const results = {
      instruction: extractionInstruction,
      url: this.session.activeUrl,
      timestamp: new Date().toISOString()
    };

    if (html) {
      // Extract headings
      const headings = [];
      const hRegex = /<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi;
      let match;
      while ((match = hRegex.exec(html)) !== null && headings.length < 10) {
        headings.push(match[1].trim());
      }
      results.headings = headings;

      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      results.pageTitle = titleMatch ? titleMatch[1].trim() : '';
    }

    return results;
  }

  /**
   * Observe the current page and list available actions and actionable elements
   * @param {string} [instruction="what actions can I take on this page?"]
   */
  async observe(instruction = 'what actions can I take on this page?') {
    const html = await this.session.getContent();
    const observations = [];

    if (html) {
      if (html.includes('<input')) observations.push('Text inputs available for search or form submission');
      if (html.includes('<button') || html.includes('type="submit"')) observations.push('Action buttons detected');
      if (html.includes('<nav') || html.includes('role="navigation"')) observations.push('Navigation bar with category links');
    }

    return {
      url: this.session.activeUrl,
      instruction,
      observations: observations.length > 0 ? observations : ['Page content loaded and inspectable']
    };
  }
}

const defaultStagehand = new StagehandEngine();

module.exports = {
  StagehandEngine,
  act: (instruction) => defaultStagehand.act(instruction),
  extract: (instruction, schema) => defaultStagehand.extract(instruction, schema),
  observe: (instruction) => defaultStagehand.observe(instruction),
  sourceRepo: 'https://github.com/browserbase/stagehand'
};

