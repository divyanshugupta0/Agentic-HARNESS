/**
 * Agentic Harness - Audio & Voice Tools Suite
 * Unified entry point for PersonaPlex full-duplex conversational audio and live audio streaming.
 */

const personaPlex = require('./personaPlex');
const liveAudio = require('./liveAudioStream');

module.exports = {
  personaPlex,
  personaPlexTool: personaPlex,
  liveAudio,
  liveAudioTool: liveAudio,

  // Combined namespace
  audioSuite: {
    personaPlex,
    liveAudio
  }
};

