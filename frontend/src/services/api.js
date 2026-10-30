/**
 * Agentic Harness — IPC / Backend API Service Bridge
 * Connects securely to Electron contextBridge (window.api).
 * Provides mock simulation fallback when run in standard browser for testing.
 */

class ApiService {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && Boolean(window.api?.sendMessage);
  }

  /**
   * Send an IPC message to Electron main process
   */
  async send(channel, data) {
    if (this.isElectron) {
      try {
        return await window.api.sendMessage(channel, data);
      } catch (err) {
        console.error(`[IPC Error: ${channel}]`, err);
        throw err;
      }
    }

    // Mock browser fallback
    console.log(`[Browser Mock API: ${channel}]`, data);
    if (channel === 'agent:start') {
      return { status: 'started', goal: data, timestamp: Date.now() };
    }
    if (channel === 'agent:stop') {
      return { status: 'stopped' };
    }
    if (channel === 'agent:pause') {
      return { status: 'paused' };
    }
    if (channel === 'agent:resume') {
      return { status: 'resumed' };
    }
    return { success: true };
  }

  /**
   * Register a listener for an IPC channel
   */
  on(channel, callback) {
    if (this.isElectron && window.api?.onMessage) {
      window.api.onMessage(channel, callback);
      return () => {};
    }

    // In browser mode, we will allow mock events to dispatch
    const handleBrowserEvent = (e) => {
      if (e.detail?.channel === channel) {
        callback(e.detail.data);
      }
    };
    window.addEventListener('agentic:event', handleBrowserEvent);
    return () => window.removeEventListener('agentic:event', handleBrowserEvent);
  }

  /**
   * Dispatch a mock event (useful for browser preview)
   */
  dispatchMockEvent(channel, data) {
    const event = new CustomEvent('agentic:event', {
      detail: { channel, data }
    });
    window.dispatchEvent(event);
  }
}

export const api = new ApiService();

