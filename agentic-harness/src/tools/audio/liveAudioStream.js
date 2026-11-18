/**
 * Agentic Harness - Live Audio Streaming Protocol & WebRTC Bridge
 * Manages low-latency bidirectional PCM/WebRTC audio streams for live conversational AI.
 */

const EventEmitter = require('events');
const { PersonaPlexSession } = require('./personaPlex');

class LiveAudioStreamBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    this.session = new PersonaPlexSession(options);
    this.inputStreamActive = false;
    this.outputStreamActive = false;
    this.sampleRate = options.sampleRate || 24000;
    this.channels = options.channels || 1;

    // Pipe session events to bridge
    this.session.on('ai_interrupted', (data) => this.emit('interrupted', data));
    this.session.on('backchannel', (data) => this.emit('backchannel', data));
    this.session.on('state_changed', (data) => this.emit('state', data));
  }

  async startLiveMode(config = {}) {
    this.inputStreamActive = true;
    this.outputStreamActive = true;
    return await this.session.startLiveAudioSession(config);
  }

  async sendChunk(pcmChunk, metadata = {}) {
    if (!this.inputStreamActive) {
      await this.startLiveMode();
    }
    return await this.session.processAudioInputChunk(pcmChunk, metadata);
  }

  interrupt() {
    this.session.handleBargeIn();
    return { success: true, interrupted: true };
  }

  async speak(text, options) {
    return await this.session.speak(text, options);
  }

  stopLiveMode() {
    this.inputStreamActive = false;
    this.outputStreamActive = false;
    return this.session.stopLiveAudioSession();
  }

  getStatus() {
    return {
      streamActive: this.inputStreamActive,
      sampleRate: this.sampleRate,
      channels: this.channels,
      ...this.session.getStatus()
    };
  }
}

const defaultBridge = new LiveAudioStreamBridge();

module.exports = {
  LiveAudioStreamBridge,
  liveAudioBridge: defaultBridge,
  startLiveMode: (cfg) => defaultBridge.startLiveMode(cfg),
  sendChunk: (chunk, meta) => defaultBridge.sendChunk(chunk, meta),
  interrupt: () => defaultBridge.interrupt(),
  speak: (text, opt) => defaultBridge.speak(text, opt),
  stopLiveMode: () => defaultBridge.stopLiveMode(),
  getStatus: () => defaultBridge.getStatus()
};

