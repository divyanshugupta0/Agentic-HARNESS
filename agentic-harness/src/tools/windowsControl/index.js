/**
 * Agentic Harness - Windows Control Tools Suite
 * Unified entry point for all Windows desktop automation and control engines:
 * 1. Robot.js - Physical foreground mouse, keyboard, and screen capture
 * 2. Ghost.js - Zero-hijack background UI automation (NORTHTEKDevs/ghost)
 * 3. WindowsOperator.js - Complete human-like Windows OS operator (hotkeys, app lifecycle, speech, workflows)
 */

const robot = require('./robot');
const ghost = require('./ghost');
const windowsOperator = require('./windowsOperator');

module.exports = {
  // Foregound & Physical Control (Robot.js)
  robot,
  robotTool: robot,

  // Zero-Hijack Background Control (Ghost)
  ghost,
  ghostTool: ghost,

  // Full Human Operator (Computer Use)
  windowsOperator,
  operator: windowsOperator,

  // Combined convenience namespace
  windowsControl: {
    robot,
    ghost,
    operator: windowsOperator
  }
};

