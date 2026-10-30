/**
 * Agentic Harness — Plugin & Marketplace Service
 * Extensible plugin registry supporting agent tools, integrations, and automation modules.
 */

const PLUGIN_STORAGE_KEY = 'agentic_harness_plugins';

export const PLUGIN_CATEGORIES = [
  'All',
  'AI Agents',
  'Developer Tools',
  'Research Tools',
  'File Management',
  'Productivity',
  'Automation',
  'Web Browsing',
  'Integrations'
];

const INITIAL_PLUGINS = [
  {
    id: 'plugin-fs',
    name: 'File System Engine',
    category: 'File Management',
    description: 'Sandboxed local file system reader, writer, and diff analyzer with workspace isolation.',
    icon: 'FolderKanban',
    version: '1.2.0',
    installed: true,
    enabled: true,
    author: 'Agentic Core Team',
    config: {
      sandboxPath: './workspace',
      maxFileSizeMB: 25,
      allowWrite: true
    }
  },
  {
    id: 'plugin-shell',
    name: 'Terminal & Command Sandbox',
    category: 'Developer Tools',
    description: 'Execute allowlisted terminal and CLI commands within safety sandboxes with execution bounds.',
    icon: 'Terminal',
    version: '1.0.4',
    installed: true,
    enabled: true,
    author: 'Agentic Core Team',
    config: {
      allowedCommands: ['npm', 'git', 'node', 'ls', 'dir', 'echo'],
      timeoutMs: 30000
    }
  },
  {
    id: 'plugin-http',
    name: 'HTTP & REST Fetcher',
    category: 'Developer Tools',
    description: 'Autonomous HTTP client capable of inspecting REST APIs, querying documentation, and testing endpoints.',
    icon: 'Globe',
    version: '1.1.0',
    installed: true,
    enabled: true,
    author: 'Agentic Core Team',
    config: {
      followRedirects: true,
      maxTimeout: 15000
    }
  },
  {
    id: 'plugin-researcher',
    name: 'Autonomous Research Agent',
    category: 'AI Agents',
    description: 'Multi-step research specialist agent that synthesizes technical documentation and compares libraries.',
    icon: 'Bot',
    version: '2.0.1',
    installed: true,
    enabled: true,
    author: 'DeepMind Inspired Lab',
    config: {
      maxDepth: 3,
      enableCitations: true
    }
  },
  {
    id: 'plugin-code-reviewer',
    name: 'Automated Code Reviewer',
    category: 'Developer Tools',
    description: 'Analyzes staged Git diffs, flags anti-patterns, verifies TypeScript types, and suggests refactorings.',
    icon: 'Code2',
    version: '1.3.2',
    installed: false,
    enabled: false,
    author: 'Agentic Community',
    config: {
      strictMode: true,
      checkComplexity: true
    }
  },
  {
    id: 'plugin-web-search',
    name: 'Live Web Browser & Search',
    category: 'Web Browsing',
    description: 'Headless browser automation tool to browse web pages, scrape tables, and read live docs.',
    icon: 'Compass',
    version: '1.0.0',
    installed: false,
    enabled: false,
    author: 'Open Web Agents',
    config: {
      headless: true,
      adBlock: true
    }
  },
  {
    id: 'plugin-github-sync',
    name: 'GitHub & Git Integrator',
    category: 'Integrations',
    description: 'Automates branching, commit creation, pull requests, and remote synchronization directly from chat.',
    icon: 'GitPullRequest',
    version: '1.4.0',
    installed: true,
    enabled: false,
    author: 'DevOps Tools Group',
    config: {
      autoCommitMessage: true,
      remoteName: 'origin'
    }
  },
  {
    id: 'plugin-automation-cron',
    name: 'Scheduled Task Automator',
    category: 'Automation',
    description: 'Run recurring agent scripts, periodic log audits, and nightly repository hygiene tasks.',
    icon: 'Clock',
    version: '0.9.5',
    installed: false,
    enabled: false,
    author: 'System Operations',
    config: {
      timezone: 'UTC',
      maxParallelJobs: 2
    }
  }
];

class PluginService {
  constructor() {
    this.plugins = this.loadPlugins();
  }

  loadPlugins() {
    try {
      const stored = localStorage.getItem(PLUGIN_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load plugins from storage', e);
    }
    return INITIAL_PLUGINS;
  }

  savePlugins() {
    try {
      localStorage.setItem(PLUGIN_STORAGE_KEY, JSON.stringify(this.plugins));
    } catch (e) {
      console.warn('Failed to save plugins', e);
    }
  }

  getPlugins(category = 'All', searchQuery = '') {
    return this.plugins.filter((p) => {
      const matchesCategory = category === 'All' || p.category === category;
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }

  getPluginById(id) {
    return this.plugins.find((p) => p.id === id) || null;
  }

  toggleInstall(id) {
    const plugin = this.plugins.find((p) => p.id === id);
    if (plugin) {
      plugin.installed = !plugin.installed;
      if (!plugin.installed) plugin.enabled = false;
      this.savePlugins();
      return plugin;
    }
    return null;
  }

  toggleEnabled(id) {
    const plugin = this.plugins.find((p) => p.id === id);
    if (plugin && plugin.installed) {
      plugin.enabled = !plugin.enabled;
      this.savePlugins();
      return plugin;
    }
    return null;
  }

  updatePluginConfig(id, newConfig) {
    const plugin = this.plugins.find((p) => p.id === id);
    if (plugin) {
      plugin.config = { ...plugin.config, ...newConfig };
      this.savePlugins();
      return plugin;
    }
    return null;
  }
}

export const pluginService = new PluginService();
