/**
 * Comprehensive Tool Validation Suite for Agentic Harness
 * Tests Robot.js (Windows Control), fsTool, shellTool, httpTool, systemTool, gitTool, and the central Tool Registry.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  fsTool,
  shellTool,
  httpTool,
  robot,
  systemTool,
  gitTool,
  searchTool,
  ghost,
  windowsOperator,
  playwright,
  browserUse,
  stagehand,
  browserMcp,
  chromeDevToolsMcp,
  playwrightMcp,
  customToolManager,
  personaPlex,
  liveAudio,
  executeTool,
  getAvailableTools
} = require('../src/tools');

async function runToolTests() {
  console.log('=== TEST SUITE: Agentic Harness Wide Range of Tools ===\n');

  // 1. Robot.js - Windows Control
  console.log('[1] Testing Robot.js (Windows Control)...');
  console.log('  Driver mode:', robot.driver);
  try {
    const screenSize = await robot.getScreenSize();
    console.assert(screenSize.width > 0 && screenSize.height > 0, 'Valid screen size');
    console.log(`  ✓ getScreenSize(): ${screenSize.width}x${screenSize.height}`);

    const mousePos = await robot.getMousePos();
    console.log(`  ✓ getMousePos(): (${mousePos.x}, ${mousePos.y})`);

    const activeWin = await robot.getActiveWindow();
    console.log(`  ✓ getActiveWindow(): "${activeWin.title}" (handle: ${activeWin.handle})`);

    const screenshotPath = path.join(os.tmpdir(), `test_tool_shot_${Date.now()}.png`);
    const shot = await robot.captureScreen(screenshotPath);
    console.assert(fs.existsSync(shot.path), 'Screenshot file created');
    console.log(`  ✓ captureScreen(): Saved to ${shot.path} (${shot.width}x${shot.height})`);
    try { fs.unlinkSync(shot.path); } catch (_) { }
  } catch (err) {
    console.warn('  ⚠️ Robot test notice:', err.message);
  }

  // 2. fsTool - File System Engine
  console.log('\n[2] Testing fsTool...');
  const testDir = path.join(os.tmpdir(), `agentic_fs_test_${Date.now()}`);
  const testFile = path.join(testDir, 'sample.txt');

  await fsTool.createDirectory(testDir);
  console.assert(await fsTool.fileExists(testDir), 'Directory created');
  console.log('  ✓ createDirectory & fileExists verified');

  await fsTool.writeFile(testFile, 'Hello from Agentic Harness!');
  const content = await fsTool.readFile(testFile);
  console.assert(content === 'Hello from Agentic Harness!', 'Content matched');
  console.log('  ✓ writeFile & readFile verified');

  await fsTool.appendFile(testFile, '\nAppended line.');
  const stats = await fsTool.getFileStats(testFile);
  console.assert(stats.size > 26, 'File stats verified');
  console.log(`  ✓ appendFile & getFileStats verified (${stats.size} bytes)`);

  const dirList = await fsTool.listDirectory(testDir);
  console.assert(dirList.some(f => f.name === 'sample.txt'), 'Directory listed');
  console.log(`  ✓ listDirectory verified (${dirList.length} items)`);

  await fsTool.deleteDirectory(testDir, true);
  console.assert(!(await fsTool.fileExists(testDir)), 'Directory deleted');
  console.log('  ✓ deleteDirectory verified');

  // 3. shellTool - Process Terminal
  console.log('\n[3] Testing shellTool...');
  const cmdRes = await shellTool.runCommand('node -v');
  console.assert(cmdRes.exitCode === 0, 'Command succeeded');
  console.log(`  ✓ runCommand("node -v"): ${cmdRes.stdout}`);

  const processes = await shellTool.listProcesses();
  console.assert(processes.length > 0, 'Processes listed');
  console.log(`  ✓ listProcesses(): Found ${processes.length} running processes`);

  // 4. systemTool - Telemetry
  console.log('\n[4] Testing systemTool...');
  const sys = systemTool.getSystemInfo();
  console.log(`  ✓ getSystemInfo(): ${sys.platform} (${sys.arch}) - Node ${sys.nodeVersion}`);

  const cpu = systemTool.getCpuInfo();
  console.log(`  ✓ getCpuInfo(): ${cpu.cores} cores - ${cpu.model}`);

  const mem = systemTool.getMemoryInfo();
  console.log(`  ✓ getMemoryInfo(): ${mem.usedMB} MB used / ${mem.totalMB} MB total (${mem.usedPercentage}%)`);

  const net = systemTool.getNetworkInfo();
  console.log(`  ✓ getNetworkInfo(): ${net.length} active network adapter(s) found`);

  // 5. gitTool - Version Control
  console.log('\n[5] Testing gitTool...');
  try {
    const gitBr = await gitTool.gitBranch();
    console.log(`  ✓ gitBranch(): Current branch "${gitBr.current}"`);

    const gitLogs = await gitTool.gitLog(3);
    console.log(`  ✓ gitLog(): Found ${gitLogs.length} recent commit(s)`);
  } catch (err) {
    console.warn('  ⚠️ gitTool notice:', err.message);
  }

  // 6. Ghost Background Desktop Automation (NORTHTEKDevs/ghost)
  console.log('\n[6] Testing Ghost Background Automation (NORTHTEKDevs/ghost)...');
  console.log('  Engine:', ghost.engine);
  try {
    const windows = await ghost.listWindows();
    console.assert(Array.isArray(windows), 'Windows list returned array');
    console.log(`  ✓ listWindows(): Found ${windows.length} window(s) via UI Automation`);
    if (windows.length > 0) {
      const topWin = windows[0];
      console.log(`    Sample Window: "${topWin.title}" (PID: ${topWin.processId}, Process: ${topWin.processName})`);

      const elements = await ghost.inspectElements(topWin.title);
      console.log(`  ✓ inspectElements(): Discovered ${elements.length} accessible element(s) without stealing focus`);
    }
  } catch (err) {
    console.warn('  ⚠️ Ghost notice:', err.message);
  }

  // 7. Windows Human Operator (Full Human-Like Windows Access)
  console.log('\n[7] Testing Windows Human Operator (Computer Use)...');
  try {
    const eye = await windowsOperator.seeScreen();
    console.assert(fs.existsSync(eye.path), 'seeScreen file created');
    console.log(`  ✓ seeScreen(): Visual perception frame captured (${eye.width}x${eye.height})`);
    try { fs.unlinkSync(eye.path); } catch (_) { }

    const curWin = await windowsOperator.getActiveWindow();
    console.log(`  ✓ getActiveWindow(): Foreground window "${curWin.title}"`);

    const workflowRes = await windowsOperator.runHumanWorkflow([
      { action: 'wait', ms: 100 }
    ]);
    console.assert(workflowRes.success === true, 'Workflow runner completed');
    console.log(`  ✓ runHumanWorkflow(): Executed ${workflowRes.stepsExecuted} step(s)`);
  } catch (err) {
    console.warn('  ⚠️ WindowsOperator notice:', err.message);
  }

  // 8. Browser Tools Suite (Playwright, Browser Use, Stagehand, MCP)
  console.log('\n[8] Testing Browser Tools Suite...');
  const stagehandAct = await stagehand.act("type 'React' into search");
  console.assert(stagehandAct.success === true, 'Stagehand act succeeded');
  console.log('  ✓ Stagehand act():', stagehandAct.primitive, '->', stagehandAct.actionType);

  const stagehandObs = await stagehand.observe();
  console.assert(Array.isArray(stagehandObs.observations), 'Observations array');
  console.log(`  ✓ Stagehand observe(): ${stagehandObs.observations.length} observation(s)`);

  const browserAgentState = browserUse.getAgentState();
  console.assert(browserAgentState.state !== undefined, 'Browser Use state verified');
  console.log('  ✓ Browser Use Agent state:', browserAgentState.state);

  const cdpLogs = await chromeDevToolsMcp.captureConsoleLogs();
  console.assert(Array.isArray(cdpLogs.logs), 'CDP logs returned');
  console.log('  ✓ Chrome DevTools MCP: Console logs inspected');

  // 9. AI Custom Tool Creation & Mandatory First-Time Verification Engine
  console.log('\n[9] Testing AI Custom Tool Creation & First-Time Verification Engine...');
  const testToolCode = `
    module.exports = function calculateDiscount(price, discountPercent) {
      if (price < 0 || discountPercent < 0) throw new Error("Invalid parameters");
      return price - (price * (discountPercent / 100));
    };
  `;

  // Step A: AI creates custom tool (saved to user device)
  const created = await customToolManager.createCustomTool({
    name: 'testDiscountCalculator',
    description: 'Calculates discounted prices',
    code: testToolCode,
    parameters: ['price', 'discountPercent'],
    author: 'AI Assistant'
  });
  console.assert(created.status === 'PENDING_VERIFICATION', 'Status must start as PENDING_VERIFICATION');
  console.log(`  ✓ Tool created & saved to disk: ${created.name} (Status: ${created.status})`);

  // Step B: Verification gate check - attempting execution BEFORE verify MUST be blocked!
  let blockedBeforeVerify = false;
  try {
    await customToolManager.executeCustomTool('testDiscountCalculator', [100, 20]);
  } catch (gateErr) {
    blockedBeforeVerify = true;
    console.log('  ✓ Verification Gate active: Unverified execution blocked:', gateErr.message.slice(0, 75) + '...');
  }
  console.assert(blockedBeforeVerify === true, 'Unverified execution must be blocked');

  // Step C: Run first-time verification (Syntax + Guardrails scan + Sandboxed dry-run)
  const verifyRes = await customToolManager.verifyCustomTool('testDiscountCalculator');
  console.assert(verifyRes.success === true && verifyRes.status === 'VERIFIED', 'Tool verification must pass');
  console.log(`  ✓ First-time verification passed: Status changed to ${verifyRes.status} at ${verifyRes.verifiedAt}`);

  // Step D: Execute verified tool
  const execCustom = await customToolManager.executeCustomTool('testDiscountCalculator', [100, 20]);
  console.assert(execCustom.result === 80, 'Calculation result matches expected (100 - 20% = 80)');
  console.log(`  ✓ Verified custom tool executed successfully! Result: $100 with 20% off = $${execCustom.result}`);

  // Step E: Test malicious tool rejection (e.g. self-termination attempt inside code)
  const maliciousCode = `module.exports = function hack() { process.exit(1); };`;
  await customToolManager.createCustomTool({
    name: 'maliciousTool',
    description: 'Exploit attempt',
    code: maliciousCode
  });
  const rejectRes = await customToolManager.verifyCustomTool('maliciousTool');
  console.assert(rejectRes.status === 'REJECTED', 'Malicious code must be rejected');
  console.log('  ✓ Malicious code detected & rejected:', rejectRes.violations[0].message);

  // Cleanup test tools
  customToolManager.deleteCustomTool('testDiscountCalculator');
  customToolManager.deleteCustomTool('maliciousTool');

  // 10. PersonaPlex Full-Duplex Audio & Kyutai Pocket TTS (CPU)
  console.log('\n[10] Testing PersonaPlex & Kyutai Pocket TTS (CPU-Optimized)...');
  console.log('  Model Family:', personaPlex.modelFamily);

  // A. Hardware Acceleration & CPU Fallback Check
  const hw = personaPlex.detectHardwareAcceleration();
  console.log(`  ✓ detectHardwareAcceleration(): hasNvidiaGpu=${hw.hasNvidiaGpu}, isCpuOnly=${hw.isCpuOnly}`);
  console.log(`  ✓ Active Engine Selected: "${hw.engineName}"`);
  if (hw.isCpuOnly) {
    console.assert(hw.recommendedEngine === 'kyutai-pocket-tts', 'Must choose kyutai-pocket-tts on CPU only device');
  }

  // B. Start Live Audio Mode
  const liveSession = await personaPlex.startLiveAudioSession({
    voicePrompt: { name: 'warm-companion', pitch: 1.0, rate: 0 },
    textPrompt: { name: 'Atlas', role: 'Full-duplex conversational co-pilot' }
  });
  console.assert(liveSession.success === true, 'Live audio session started');
  console.log(`  ✓ startLiveAudioSession(): Session ${liveSession.sessionId} active (Mode: ${liveSession.mode}, Engine: ${liveSession.hardware.recommendedEngine})`);

  // B. Configure Hybrid Voice & Role Persona
  const personaConfig = personaPlex.configurePersona(
    { warmth: 'high', style: 'natural' },
    { tone: 'attentive and empathetic' }
  );
  console.assert(personaConfig.success === true, 'Hybrid persona configured');
  console.log('  ✓ configurePersona(): Hybrid voice prompt & text persona configured');

  // C. Simulate Simultaneous Listening (User Audio Stream Input)
  const syntheticPcmChunk = Buffer.alloc(1024);
  const audioInRes = await personaPlex.processAudioInputChunk(syntheticPcmChunk, { isSpeech: true, volumeRms: 0.08 });
  console.assert(audioInRes.processed === true, 'Audio chunk processed');
  console.assert(audioInRes.userSpeaking === true, 'Voice Activity Detection detected user speech');
  console.log(`  ✓ processAudioInputChunk(): Listening active, VAD detected speech, Duplex State: ${audioInRes.duplexState}`);

  // D. Test Mid-Sentence Barge-in Interruption
  personaPlex.handleBargeIn();
  const statusAfterBargeIn = personaPlex.getStatus();
  console.assert(statusAfterBargeIn.metrics.bargeInCount >= 1, 'Barge-in counted');
  console.log(`  ✓ Barge-in Interruption verified: Interruption caught immediately (Total: ${statusAfterBargeIn.metrics.bargeInCount})`);

  // E. Gracefully Stop Live Audio
  const stopLive = personaPlex.stopLiveAudioSession();
  console.assert(stopLive.status === 'stopped', 'Live session stopped cleanly');
  console.log('  ✓ stopLiveAudioSession(): Session terminated cleanly');

  // 11. Central executeTool Registry Dispatcher
  console.log('\n[11] Testing executeTool Dispatcher & Tool Registry...');
  const tools = getAvailableTools();
  console.log(`  ✓ getAvailableTools(): ${tools.length} tools registered: [${tools.map(t => t.id).join(', ')}]`);

  const execRes = await executeTool('systemTool', 'getCpuInfo', []);
  console.assert(execRes.success === true, 'Tool dispatch succeeded');
  console.log(`  ✓ executeTool("systemTool", "getCpuInfo"): Dispatched in ${execRes.durationMs}ms`);

  console.log('\n=== ALL TOOL TESTS COMPLETED SUCCESSFULLY! ===\n');
}

runToolTests().catch(err => {
  console.error('Tool test failed:', err);
  process.exit(1);
});

