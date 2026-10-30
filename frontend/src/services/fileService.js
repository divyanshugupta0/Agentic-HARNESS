/**
 * Agentic Harness — File Workspace Service
 * Manages files, folders, multi-file editor tabs, saving, and recently modified items.
 */

import { api } from './api';

const FILES_STORAGE_KEY = 'agentic_harness_workspace_files';

const INITIAL_WORKSPACE_FILES = [
  {
    id: 'f-1',
    name: 'README.md',
    path: '/README.md',
    type: 'markdown',
    content: `# Agentic Harness Workspace\n\nWelcome to your local AI agent workspace.\nFiles generated and modified by your autonomous agents will appear here.\n\n### Features:\n- Multi-tab syntax editor\n- Direct local file save\n- Workspace hierarchy navigation`,
    updatedAt: new Date().toISOString(),
    isDirty: false
  },
  {
    id: 'f-2',
    name: 'agent-config.json',
    path: '/config/agent-config.json',
    type: 'json',
    content: `{\n  "appName": "Agentic Harness",\n  "version": "1.0.0",\n  "defaultModel": "claude-3-7-sonnet",\n  "tools": [\n    "fsTool",\n    "shellTool",\n    "httpTool"\n  ],\n  "permissions": {\n    "allowShellCommands": true,\n    "allowFileSystemWrite": true\n  }\n}`,
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    isDirty: false
  },
  {
    id: 'f-3',
    name: 'research-notes.txt',
    path: '/notes/research-notes.txt',
    type: 'text',
    content: `Autonomous Agent Task Decomposition Trace:\n\n1. Goal decomposition using chain-of-thought\n2. Local tool sandboxing through Electron IPC\n3. Short-term and long-term vector memory caching\n4. Human-in-the-loop permission verification gates`,
    updatedAt: new Date(Date.now() - 14400000).toISOString(),
    isDirty: false
  },
  {
    id: 'f-4',
    name: 'system-agent.js',
    path: '/scripts/system-agent.js',
    type: 'javascript',
    content: `// Sample automated agent script\nexport async function runAgentWorkflow(agent, task) {\n  console.log('Initiating task:', task.goal);\n  const plan = await agent.decompose(task.goal);\n  return await agent.execute(plan);\n}`,
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    isDirty: false
  }
];

class FileService {
  constructor() {
    this.files = this.loadFiles();
    this.openFileIds = [this.files[0]?.id || 'f-1'];
    this.activeFileId = this.files[0]?.id || 'f-1';
  }

  loadFiles() {
    try {
      const stored = localStorage.getItem(FILES_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load files from storage', e);
    }
    return INITIAL_WORKSPACE_FILES;
  }

  saveFilesToStorage() {
    try {
      localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(this.files));
    } catch (e) {
      console.warn('Failed to save files', e);
    }
  }

  getFiles() {
    return this.files;
  }

  getRecentlyModified() {
    return [...this.files].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
  }

  getOpenFileTabs() {
    return this.files.filter((f) => this.openFileIds.includes(f.id));
  }

  getActiveFile() {
    return this.files.find((f) => f.id === this.activeFileId) || this.files[0] || null;
  }

  openFile(id) {
    if (!this.openFileIds.includes(id)) {
      this.openFileIds.push(id);
    }
    this.activeFileId = id;
    return this.getActiveFile();
  }

  closeTab(id) {
    this.openFileIds = this.openFileIds.filter((tabId) => tabId !== id);
    if (this.activeFileId === id) {
      this.activeFileId = this.openFileIds[this.openFileIds.length - 1] || null;
    }
  }

  updateFileContent(id, newContent) {
    const file = this.files.find((f) => f.id === id);
    if (file) {
      file.content = newContent;
      file.isDirty = true;
      this.saveFilesToStorage();
    }
  }

  async saveFile(id) {
    const file = this.files.find((f) => f.id === id);
    if (file) {
      file.isDirty = false;
      file.updatedAt = new Date().toISOString();
      this.saveFilesToStorage();

      // If in Electron, write to file system via IPC
      try {
        await api.send('file:write', { path: file.path, content: file.content });
      } catch (e) {
        // Safe to ignore if running in mock/browser mode
      }
      return file;
    }
    return null;
  }

  createFile(name, initialContent = '') {
    const ext = name.split('.').pop().toLowerCase();
    let type = 'text';
    if (ext === 'md') type = 'markdown';
    if (ext === 'json') type = 'json';
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) type = 'javascript';
    if (['html', 'htm'].includes(ext)) type = 'html';
    if (['css', 'scss'].includes(ext)) type = 'css';

    const newFile = {
      id: 'f-' + Date.now(),
      name,
      path: '/' + name,
      type,
      content: initialContent,
      updatedAt: new Date().toISOString(),
      isDirty: false
    };

    this.files.push(newFile);
    this.saveFilesToStorage();
    this.openFile(newFile.id);
    return newFile;
  }

  deleteFile(id) {
    this.closeTab(id);
    this.files = this.files.filter((f) => f.id !== id);
    this.saveFilesToStorage();
  }
}

export const fileService = new FileService();

