export const BUILTIN_TOOLS = [
  { id: 'projectTool', name: 'Project Workspace', description: 'Prompt user to open a project folder into the Files editor workspace', active: true },
  { id: 'fsTool', name: 'File System Engine', description: 'Read, write, append, and search workspace files with path traversal security', active: true },
  { id: 'shellTool', name: 'Shell Terminal', description: 'Execute safe allowlisted system commands and inspect process trees', active: true },
  { id: 'httpTool', name: 'HTTP Client & Scraper', description: 'Perform REST API calls, inspect endpoints, and scrape web documentation', active: true },
  { id: 'robot', name: 'Windows Control (Robot.js)', description: 'Control mouse clicks, smooth movement, keyboard typing, shortcuts, and screenshots', active: true },
  { id: 'systemTool', name: 'System Telemetry', description: 'Monitor CPU load, RAM usage, storage volume, and network interfaces', active: true },
  { id: 'gitTool', name: 'Git Version Control', description: 'Inspect git status, view recent commits, branches, and diffs', active: true },
  { id: 'ghost', name: 'Ghost Background Automation', description: 'Zero-hijack background UI automation, window inspection, and element control (NORTHTEKDevs/ghost)', active: true },
  { id: 'windowsOperator', name: 'Human Windows Operator', description: 'Full human-level OS control: launch apps, hotkeys (Win+R, Alt+Tab), drag-and-drop, speech, and workflows', active: true },
  { id: 'playwright', name: 'Playwright Browser', description: 'High-performance browser navigation, clicking, typing, and screenshots (microsoft/playwright)', active: true },
  { id: 'browserUse', name: 'Browser Use Agent', description: 'Autonomous multi-step browser agent loop (browser-use/browser-use)', active: true },
  { id: 'stagehand', name: 'Stagehand AI Browser', description: 'AI-driven browser automation with act(), extract(), observe() (browserbase/stagehand)', active: true },
  { id: 'customToolManager', name: 'Custom AI Tools (Verified)', description: 'AI-generated custom tools saved on device with mandatory first-time verification', active: true },
  { id: 'personaPlex', name: 'PersonaPlex Live Audio', description: 'Natural, simultaneous listening and speaking with real-time barge-in and backchanneling (NVIDIA)', active: true },
  { id: 'webSearch', name: 'Web Search', description: 'Search web indexes for live developer documentation and technical guides', active: true }
];
