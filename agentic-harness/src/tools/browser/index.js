/**
 * Agentic Harness - Autonomous Browser Tools Suite
 * Unified entry point for all browser automation engines:
 * - Playwright (microsoft/playwright)
 * - Browser Use (browser-use/browser-use)
 * - Stagehand (browserbase/stagehand)
 * - Browser MCP (nicholasoxford/browsermcp)
 * - Chrome DevTools MCP (ChromeDevTools/chrome-devtools-mcp)
 * - Playwright MCP (microsoft/playwright-mcp)
 */

const playwright = require('./playwrightTool');
const browserUse = require('./browserUseTool');
const stagehand = require('./stagehandTool');
const { browserMcp, chromeDevToolsMcp, playwrightMcp } = require('./mcpBrowserTools');

module.exports = {
  // Engines
  playwright,
  playwrightTool: playwright,

  browserUse,
  browserUseTool: browserUse,

  stagehand,
  stagehandTool: stagehand,

  // MCP Protocols
  browserMcp,
  chromeDevToolsMcp,
  playwrightMcp,

  // Combined namespace
  browserSuite: {
    playwright,
    browserUse,
    stagehand,
    mcp: {
      browserMcp,
      chromeDevToolsMcp,
      playwrightMcp
    }
  }
};

