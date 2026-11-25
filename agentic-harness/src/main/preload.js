// Preload script - secure IPC bridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Expose only whitelisted IPC channels here
  sendMessage: (channel, data) => ipcRenderer.invoke(channel, data),
  onMessage: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)),
  openSocialLogin: (provider) => ipcRenderer.invoke('auth:open-social-login', provider),
  authenticate: (credentials) => ipcRenderer.invoke('auth:credential', credentials),
  getAuthUser: () => ipcRenderer.invoke('auth:session-user'),
  logout: () => ipcRenderer.invoke('auth:logout')
});
