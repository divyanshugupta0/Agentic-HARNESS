/**
 * Agentic Harness — IPC / Backend API Service Bridge
 * Connects securely to Electron contextBridge (window.api).
 * Provides mock simulation fallback when run in standard browser for testing.
 */

class ApiService {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && Boolean(window.api?.sendMessage);
    // In-memory mock custom tools for browser preview mode
    this._mockCustomTools = [
      {
        name: 'calculateInvoiceTax',
        description: 'Calculates regional sales tax and invoice line totals.',
        parameters: { subtotal: 'number', taxRate: 'number' },
        status: 'VERIFIED',
        createdAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
        code: 'module.exports = async function(args) { return { total: args.subtotal * (1 + (args.taxRate || 0.08)) }; };'
      },
      {
        name: 'systemDiskHealthCheck',
        description: 'Analyzes volume storage utilization and alerts on low disk space.',
        parameters: { driveLetter: 'string' },
        status: 'PENDING_VERIFICATION',
        createdAt: new Date().toISOString(),
        code: 'module.exports = async function(args) { return { drive: args.driveLetter || "C:", freeSpaceGB: 45.2, status: "HEALTHY" }; };'
      }
    ];
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

    // Mock browser fallback for preview and development
    console.log(`[Browser Mock API: ${channel}]`, data);
    
    // Agent status channels
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

    // Custom Tools Mock Channels
    if (channel === 'customTool:list') {
      return { success: true, tools: [...this._mockCustomTools] };
    }
    if (channel === 'customTool:verify') {
      const tool = this._mockCustomTools.find(t => t.name === (data?.toolName || data));
      if (tool) {
        tool.status = 'VERIFIED';
        tool.verifiedAt = new Date().toISOString();
        tool.verificationReport = { passed: true, checks: { syntax: true, guardrails: true, sandboxDryRun: true } };
        return { success: true, status: 'VERIFIED', report: tool.verificationReport };
      }
      return { success: false, error: 'Tool not found' };
    }
    if (channel === 'customTool:execute') {
      const tool = this._mockCustomTools.find(t => t.name === data?.name);
      if (!tool) return { success: false, error: 'Custom tool not found' };
      if (tool.status !== 'VERIFIED') {
        return { success: false, error: `Security Exception: Custom tool "${tool.name}" has status "${tool.status}". Verification required before first execution.` };
      }
      return { success: true, result: { message: `Executed ${tool.name} successfully`, echoArgs: data.params, timestamp: new Date().toISOString() } };
    }
    if (channel === 'customTool:create') {
      const newTool = {
        name: data.name,
        description: data.description,
        parameters: data.parameters || {},
        status: 'PENDING_VERIFICATION',
        createdAt: new Date().toISOString(),
        code: data.code || 'module.exports = async function(args) { return { status: "ok" }; };'
      };
      this._mockCustomTools.push(newTool);
      return { success: true, tool: newTool };
    }
    if (channel === 'customTool:delete') {
      this._mockCustomTools = this._mockCustomTools.filter(t => t.name !== (data?.toolName || data));
      return { success: true };
    }

    // PersonaPlex & Kyutai Pocket TTS Live Audio Mock Channels
    if (channel === 'liveAudio:start') {
      return {
        success: true,
        sessionId: 'mock_plex_' + Date.now(),
        mode: 'live-audio-full-duplex',
        duplexState: 'LISTENING',
        hardware: {
          hasNvidiaGpu: false,
          isCpuOnly: true,
          recommendedEngine: 'kyutai-pocket-tts',
          engineName: 'Kyutai Pocket TTS (CPU-Optimized Neural Voice)'
        }
      };
    }
    if (channel === 'liveAudio:chunk') {
      return { success: true, received: true, duplexState: 'LISTENING' };
    }
    if (channel === 'liveAudio:speak') {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(data?.text || 'Hello from Kyutai Pocket TTS');
          const voices = window.speechSynthesis.getVoices();
          const naturalVoice = voices.find(
            v => v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Aria') || v.name.includes('Google') || v.name.includes('Online')
          ) || voices.find(v => v.lang.startsWith('en'));
          if (naturalVoice) utterance.voice = naturalVoice;
          utterance.rate = 1.05;
          utterance.pitch = 1.0;
          window.speechSynthesis.speak(utterance);
        } catch (_) {}
      }
      return { success: true, text: data?.text, duplexState: 'SPEAKING', engine: 'kyutai-pocket-tts' };
    }
    if (channel === 'liveAudio:interrupt') {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
      return { success: true, interrupted: true, duplexState: 'INTERRUPTED' };
    }
    if (channel === 'liveAudio:stop') {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
      return { success: true, status: 'STOPPED' };
    }
    if (channel === 'liveAudio:status') {
      return {
        success: true,
        active: true,
        duplexState: 'LISTENING',
        interruptionsCount: 0,
        hardware: {
          hasNvidiaGpu: false,
          isCpuOnly: true,
          recommendedEngine: 'kyutai-pocket-tts',
          engineName: 'Kyutai Pocket TTS (CPU-Optimized Neural Voice)'
        }
      };
    }

    // Windows Desktop & Ghost Automation Mock Channels
    if (channel === 'robot:getScreenSize') {
      return { success: true, size: { width: 1920, height: 1080 } };
    }
    if (channel === 'robot:getMousePos') {
      return { success: true, pos: { x: 512, y: 384 } };
    }
    if (channel === 'robot:captureScreen' || channel === 'operator:seeScreen') {
      return {
        success: true,
        info: {
          width: 1920,
          height: 1080,
          activeWindow: 'Agentic Harness Desktop',
          savedPath: 'mock_screen.png'
        }
      };
    }
    if (channel === 'ghost:listWindows') {
      return {
        success: true,
        list: [
          { title: 'Agentic Harness Desktop', processName: 'agentic-harness', handle: 1001 },
          { title: 'Google Chrome', processName: 'chrome', handle: 1002 },
          { title: 'Visual Studio Code', processName: 'Code', handle: 1003 },
          { title: 'Windows Terminal', processName: 'wt', handle: 1004 }
        ]
      };
    }
    if (channel === 'ghost:inspectElements') {
      return {
        success: true,
        elements: [
          { Name: 'Address and search bar', ControlType: 'Edit', AutomationId: 'address-bar' },
          { Name: 'New Tab', ControlType: 'Button', AutomationId: 'new-tab-button' },
          { Name: 'Settings', ControlType: 'MenuItem', AutomationId: 'settings' }
        ]
      };
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


