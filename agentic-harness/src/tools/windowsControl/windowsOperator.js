/**
 * Agentic Harness - Full Windows Human Operator Tool
 * Provides complete human-like desktop access and computer-use capabilities:
 * mouse navigation, clicks, drag-and-drop, typing, system hotkeys (Win+R, Alt+Tab, Ctrl+C/V),
 * application launching/closing, window management, screen perception, and text-to-speech.
 */

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { runPowerShell: runPersistentPowerShell } = require('./robot');

const isWindows = process.platform === 'win32';
let operatorCoreCompiled = false;

/**
 * Execute PowerShell script via shared persistent worker (compiles Win32 types once)
 */
async function runPowerShell(script) {
  if (!isWindows) {
    throw new Error('Windows Operator requires Windows OS.');
  }
  const hasCore = script.includes('public class WinHumanCore');
  let payload = script;
  if (hasCore) {
    if (operatorCoreCompiled) {
      payload = script.replace(WIN32_OPERATOR_CORE, '');
    } else {
      operatorCoreCompiled = true;
    }
  }
  return await runPersistentPowerShell(payload);
}

// C# Win32 User32 & GDI interop definition
const WIN32_OPERATOR_CORE = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;

public class WinHumanCore {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }
}
"@ -ReferencedAssemblies System.Drawing;
`;

// Virtual-Key codes dictionary for reliable human hotkey simulation
const VK_MAP = {
  // Modifiers
  win: 0x5B,
  windows: 0x5B,
  lwin: 0x5B,
  rwin: 0x5C,
  ctrl: 0x11,
  control: 0x11,
  alt: 0x12,
  menu: 0x12,
  shift: 0x10,

  // Common controls
  enter: 0x0D,
  return: 0x0D,
  esc: 0x1B,
  escape: 0x1B,
  tab: 0x09,
  space: 0x20,
  backspace: 0x08,
  delete: 0x2E,
  del: 0x2E,
  insert: 0x2D,
  home: 0x24,
  end: 0x23,
  pageup: 0x21,
  pagedown: 0x22,
  up: 0x26,
  down: 0x28,
  left: 0x25,
  right: 0x27,

  // Function keys
  f1: 0x70, f2: 0x71, f3: 0x72, f4: 0x73, f5: 0x74, f6: 0x75,
  f7: 0x76, f8: 0x77, f9: 0x78, f10: 0x79, f11: 0x7A, f12: 0x7B,

  // Letters (A-Z: 0x41 - 0x5A)
  a: 0x41, b: 0x42, c: 0x43, d: 0x44, e: 0x45, f: 0x46, g: 0x47,
  h: 0x48, i: 0x49, j: 0x4A, k: 0x4B, l: 0x4C, m: 0x4D, n: 0x4E,
  o: 0x4F, p: 0x50, q: 0x51, r: 0x52, s: 0x53, t: 0x54, u: 0x55,
  v: 0x56, w: 0x57, x: 0x58, y: 0x59, z: 0x5A,

  // Numbers (0-9: 0x30 - 0x39)
  '0': 0x30, '1': 0x31, '2': 0x32, '3': 0x33, '4': 0x34,
  '5': 0x35, '6': 0x36, '7': 0x37, '8': 0x38, '9': 0x39
};

const MOUSE_FLAGS = {
  LEFT_DOWN: 0x02,
  LEFT_UP: 0x04,
  RIGHT_DOWN: 0x08,
  RIGHT_UP: 0x10,
  MIDDLE_DOWN: 0x20,
  MIDDLE_UP: 0x40,
  WHEEL: 0x0800
};

// --- MOUSE & CURSOR INTERACTIONS (LIKE HUMAN) ---

/**
 * Move cursor smoothly like a human hand
 * @param {number} targetX
 * @param {number} targetY
 * @param {number} [speed=1]
 */
async function moveMouseSmooth(targetX, targetY, speed = 1) {
  const script = `
    Add-Type -AssemblyName System.Windows.Forms;
    ${WIN32_OPERATOR_CORE}
    $start = [System.Windows.Forms.Cursor]::Position;
    $endX = ${Math.round(targetX)}; $endY = ${Math.round(targetY)};
    $steps = ${Math.max(12, Math.floor(25 / (speed || 1)))};
    for ($i = 1; $i -le $steps; $i++) {
      $curX = [int]($start.X + (($endX - $start.X) * $i / $steps));
      $curY = [int]($start.Y + (($endY - $start.Y) * $i / $steps));
      [WinHumanCore]::SetCursorPos($curX, $curY);
      Start-Sleep -Milliseconds 6;
    }
  `;
  await runPowerShell(script);
  return { success: true, x: targetX, y: targetY };
}

/**
 * Click at specific coordinates or current position
 * @param {number} [x]
 * @param {number} [y]
 * @param {'left'|'right'|'middle'} [button='left']
 */
async function click(x = null, y = null, button = 'left') {
  if (x !== null && y !== null) {
    await moveMouseSmooth(x, y, 2);
  }

  let down = MOUSE_FLAGS.LEFT_DOWN;
  let up = MOUSE_FLAGS.LEFT_UP;
  if (button === 'right') {
    down = MOUSE_FLAGS.RIGHT_DOWN;
    up = MOUSE_FLAGS.RIGHT_UP;
  } else if (button === 'middle') {
    down = MOUSE_FLAGS.MIDDLE_DOWN;
    up = MOUSE_FLAGS.MIDDLE_UP;
  }

  const script = `
    ${WIN32_OPERATOR_CORE}
    [WinHumanCore]::mouse_event(${down}, 0, 0, 0, 0);
    Start-Sleep -Milliseconds 35;
    [WinHumanCore]::mouse_event(${up}, 0, 0, 0, 0);
  `;
  await runPowerShell(script);
  return { success: true, button, x, y };
}

/**
 * Double click at coordinates or current position
 */
async function doubleClick(x = null, y = null) {
  if (x !== null && y !== null) {
    await moveMouseSmooth(x, y, 2);
  }

  const script = `
    ${WIN32_OPERATOR_CORE}
    [WinHumanCore]::mouse_event(${MOUSE_FLAGS.LEFT_DOWN}, 0, 0, 0, 0);
    Start-Sleep -Milliseconds 25;
    [WinHumanCore]::mouse_event(${MOUSE_FLAGS.LEFT_UP}, 0, 0, 0, 0);
    Start-Sleep -Milliseconds 50;
    [WinHumanCore]::mouse_event(${MOUSE_FLAGS.LEFT_DOWN}, 0, 0, 0, 0);
    Start-Sleep -Milliseconds 25;
    [WinHumanCore]::mouse_event(${MOUSE_FLAGS.LEFT_UP}, 0, 0, 0, 0);
  `;
  await runPowerShell(script);
  return { success: true, action: 'doubleClick', x, y };
}

/**
 * Right-click (context menu) at coordinates or current position
 */
async function rightClick(x = null, y = null) {
  return await click(x, y, 'right');
}

/**
 * Human drag-and-drop from start coordinates to end coordinates
 */
async function dragAndDrop(fromX, fromY, toX, toY, speed = 1) {
  await moveMouseSmooth(fromX, fromY, 2);
  const script = `
    ${WIN32_OPERATOR_CORE}
    [WinHumanCore]::mouse_event(${MOUSE_FLAGS.LEFT_DOWN}, 0, 0, 0, 0);
  `;
  await runPowerShell(script);
  await moveMouseSmooth(toX, toY, speed);
  const releaseScript = `
    ${WIN32_OPERATOR_CORE}
    Start-Sleep -Milliseconds 50;
    [WinHumanCore]::mouse_event(${MOUSE_FLAGS.LEFT_UP}, 0, 0, 0, 0);
  `;
  await runPowerShell(releaseScript);
  return { success: true, from: { x: fromX, y: fromY }, to: { x: toX, y: toY } };
}

/**
 * Scroll mouse wheel
 * @param {'down'|'up'} [direction='down']
 * @param {number} [clicks=3]
 */
async function scroll(direction = 'down', clicks = 3) {
  const delta = direction === 'down' ? -clicks * 120 : clicks * 120;
  const script = `
    ${WIN32_OPERATOR_CORE}
    [WinHumanCore]::mouse_event(${MOUSE_FLAGS.WHEEL}, 0, 0, [uint32]${delta}, 0);
  `;
  await runPowerShell(script);
  return { success: true, direction, clicks };
}

// --- KEYBOARD & SYSTEM HOTKEYS (LIKE HUMAN) ---

/**
 * Press a combination of keys together (e.g. ['win', 'r'], ['ctrl', 'c'], ['alt', 'tab'], ['alt', 'f4'])
 * Uses native Win32 keybd_event API for 100% reliable hardware-level hotkeys.
 * @param {...string} keys - e.g. ('win', 'r') or ('ctrl', 'shift', 'esc')
 */
async function pressHotkey(...keys) {
  const keyList = keys
    .flat(Infinity)
    .flatMap((k) => String(k).toLowerCase().split('+').map((s) => s.trim()).filter(Boolean));
  const vkCodes = keyList.map(k => VK_MAP[k]).filter(Boolean);

  if (vkCodes.length === 0) {
    throw new Error(`Unrecognized hotkey combination: [${keyList.join(' + ')}]`);
  }

  // Generate C# down calls in order, then up calls in reverse order
  const downCalls = vkCodes.map(vk => `[WinHumanCore]::keybd_event(${vk}, 0, 0, 0);`).join('\n');
  const upCalls = [...vkCodes].reverse().map(vk => `[WinHumanCore]::keybd_event(${vk}, 0, 2, 0);`).join('\n');

  const script = `
    ${WIN32_OPERATOR_CORE}
    ${downCalls}
    Start-Sleep -Milliseconds 60;
    ${upCalls}
  `;
  await runPowerShell(script);
  return { success: true, hotkey: keyList.join(' + ') };
}

/**
 * Type text like a human typing on a physical keyboard
 * @param {string} text
 * @param {number} [delayMs=15] - Delay between characters
 */
async function type(text, delayMs = 15) {
  if (!text) return { success: true };

  const escaped = text
    .replace(/\{/g, '{{}')
    .replace(/\}/g, '{}}')
    .replace(/\+/g, '{+}')
    .replace(/\^/g, '{^}')
    .replace(/%/g, '{%}')
    .replace(/~/g, '{~}')
    .replace(/\(/g, '{(}')
    .replace(/\)/g, '{)}')
    .replace(/\[/g, '{[}')
    .replace(/\]/g, '{]}')
    .replace(/"/g, '`"');

  const script = `
    Add-Type -AssemblyName System.Windows.Forms;
    [System.Windows.Forms.SendKeys]::SendWait("${escaped}");
  `;
  await runPowerShell(script);
  return { success: true, length: text.length };
}

/**
 * Click on an input box and type text into it
 */
async function clickAndType(x, y, text) {
  await click(x, y);
  await new Promise(r => setTimeout(r, 100));
  return await type(text);
}

// Common Human System Shortcuts
const openStartMenu = async () => pressHotkey('win');
const openRunDialog = async () => pressHotkey('win', 'r');
const showDesktop = async () => pressHotkey('win', 'd');
const switchApp = async () => pressHotkey('alt', 'tab');
const copy = async () => pressHotkey('ctrl', 'c');
const paste = async () => pressHotkey('ctrl', 'v');
const selectAll = async () => pressHotkey('ctrl', 'a');
const save = async () => pressHotkey('ctrl', 's');
const closeActiveWindow = async () => {
  const active = await getActiveWindow();
  const lower = (active?.title || '').toLowerCase();
  if (lower.includes('agentic harness') || lower.includes('agentic-harness')) {
    throw new Error('Security Violation: Agent is strictly prohibited from closing its own application window via Alt+F4.');
  }
  return pressHotkey('alt', 'f4');
};
const openTaskManager = async () => pressHotkey('ctrl', 'shift', 'esc');

// --- APPLICATION & WINDOW MANAGEMENT (LIKE HUMAN) ---

/**
 * Launch any Windows application or executable by name or path
 * @param {string} appNameOrPath - e.g. 'notepad', 'chrome', 'calc', 'explorer', 'cmd', or full path
 * @param {string} [args=''] - Command line arguments
 */
const UWP_URI_ALIASES = {
  whatsapp: 'whatsapp:',
  spotify: 'spotify:',
  settings: 'ms-settings:',
  calculator: 'calc:',
  store: 'ms-windows-store:',
  mail: 'mailto:',
  calendar: 'outlookcal:'
};

async function launchApp(appNameOrPath, args = '') {
  if (Array.isArray(appNameOrPath)) appNameOrPath = appNameOrPath[0];
  if (appNameOrPath && typeof appNameOrPath === 'object') {
    appNameOrPath = appNameOrPath.name || appNameOrPath.app || appNameOrPath.path || '';
  }
  const rawName = String(appNameOrPath || '').trim();
  if (!rawName) {
    throw new Error('Application name or path is required');
  }
  const mapped = UWP_URI_ALIASES[rawName.toLowerCase()] || rawName;
  const safePath = mapped.replace(/"/g, '`"');
  const argPart = args ? ` -ArgumentList "${String(args).replace(/"/g, '`"')}"` : '';
  const script = `
    Start-Process -FilePath "${safePath}"${argPart} -ErrorAction Stop;
    Start-Sleep -Milliseconds 900;
    Write-Output "LAUNCHED";
  `;
  await runPowerShell(script);
  return { success: true, app: mapped };
}

/**
 * Open any file, folder, or web URL using the default Windows application
 * (Equivalent to human double-clicking a file in Windows Explorer)
 * @param {string} target - Path to file, folder, or URL
 */
async function openWithDefault(target) {
  const script = `
    Start-Process -FilePath "${target.replace(/"/g, '`"')}";
  `;
  await runPowerShell(script);
  return { success: true, target };
}

/**
 * Gracefully close a window (sends WM_CLOSE like human clicking the 'X' button)
 * Protected against self-termination.
 * @param {string} windowTitleQuery
 */
async function closeWindow(windowTitleQuery) {
  const queryLower = String(windowTitleQuery || '').toLowerCase();
  if (queryLower.includes('agentic harness') || queryLower.includes('agentic-harness') || queryLower === 'electron') {
    throw new Error(`Security Violation: Agent is strictly prohibited from closing its own application window ("${windowTitleQuery}").`);
  }

  const script = `
    Add-Type -AssemblyName UIAutomationClient;
    ${WIN32_OPERATOR_CORE}
    $query = "${windowTitleQuery.replace(/"/g, '`"')}";
    $root = [System.Windows.Automation.AutomationElement]::RootElement;
    $all = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition);
    foreach ($w in $all) {
      if ($w.Current.Name -like "*$query*" -or (Get-Process -Id $w.Current.ProcessId -ErrorAction SilentlyContinue).ProcessName -like "*$query*") {
        $h = [IntPtr]$w.Current.NativeWindowHandle;
        [WinHumanCore]::SendMessage($h, 0x0010, [IntPtr]0, [IntPtr]0); # 0x0010 = WM_CLOSE
        Write-Output "CLOSED";
        exit 0;
      }
    }
    Write-Output "NOT_FOUND";
  `;
  const output = await runPowerShell(script);
  return { success: output === 'CLOSED', query: windowTitleQuery };
}

/**
 * Maximize, minimize, or restore a window
 * @param {string} windowTitleQuery
 * @param {'maximize'|'minimize'|'restore'} [action='maximize']
 */
async function setWindowState(windowTitleQuery, action = 'maximize') {
  const cmdMap = {
    maximize: 3, // SW_MAXIMIZE
    minimize: 6, // SW_MINIMIZE
    restore: 9   // SW_RESTORE
  };
  const flag = cmdMap[action] || 3;

  const script = `
    Add-Type -AssemblyName UIAutomationClient;
    ${WIN32_OPERATOR_CORE}
    $query = "${windowTitleQuery.replace(/"/g, '`"')}";
    $root = [System.Windows.Automation.AutomationElement]::RootElement;
    $all = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition);
    foreach ($w in $all) {
      if ($w.Current.Name -like "*$query*" -or (Get-Process -Id $w.Current.ProcessId -ErrorAction SilentlyContinue).ProcessName -like "*$query*") {
        $h = [IntPtr]$w.Current.NativeWindowHandle;
        [WinHumanCore]::ShowWindow($h, ${flag});
        [WinHumanCore]::SetForegroundWindow($h);
        Write-Output "SUCCESS";
        exit 0;
      }
    }
    Write-Output "NOT_FOUND";
  `;
  const output = await runPowerShell(script);
  return { success: output === 'SUCCESS', action, query: windowTitleQuery };
}

/**
 * Switch focus to a specific window
 * @param {string} windowTitleQuery
 */
async function switchWindow(windowTitleQuery) {
  return await setWindowState(windowTitleQuery, 'restore');
}

// --- EYES & PERCEPTION ---

/**
 * Capture full desktop screen image for agent visual reasoning
 * @param {string} [outputPath]
 * @returns {Promise<{ path: string, width: number, height: number }>}
 */
async function seeScreen(outputPath = null) {
  const targetPath = outputPath || path.join(os.tmpdir(), `human_eye_${Date.now()}.png`);
  const script = `
    Add-Type -AssemblyName System.Windows.Forms, System.Drawing;
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
    $bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height);
    $g = [System.Drawing.Graphics]::FromImage($bmp);
    $g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size);

    # Offscreen pixel coordinate grid + cursor crosshair (visible only to AI, never on user screen)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias;
    $minorPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(45, 0, 229, 255), 1);
    $majorPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(115, 0, 229, 255), 1.5);
    $font = New-Object System.Drawing.Font("Consolas", 9, [System.Drawing.FontStyle]::Bold);
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(175, 10, 14, 24));
    $txtBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(240, 56, 232, 255));

    for ($x = 100; $x -lt $bounds.Width; $x += 100) {
      if ($x % 200 -eq 0) {
        $g.DrawLine($majorPen, $x, 0, $x, $bounds.Height);
        $g.FillRectangle($bgBrush, $x + 2, 2, 36, 14);
        $g.DrawString("$x", $font, $txtBrush, $x + 3, 2);
      } else {
        $g.DrawLine($minorPen, $x, 0, $x, $bounds.Height);
      }
    }
    for ($y = 100; $y -lt $bounds.Height; $y += 100) {
      if ($y % 200 -eq 0) {
        $g.DrawLine($majorPen, 0, $y, $bounds.Width, $y);
        $g.FillRectangle($bgBrush, 2, $y + 2, 36, 14);
        $g.DrawString("$y", $font, $txtBrush, 3, $y + 2);
      } else {
        $g.DrawLine($minorPen, 0, $y, $bounds.Width, $y);
      }
    }

    $cur = [System.Windows.Forms.Cursor]::Position;
    $curPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(235, 255, 59, 92), 2);
    $curBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 214, 10));
    $g.DrawEllipse($curPen, $cur.X - 10, $cur.Y - 10, 20, 20);
    $g.DrawLine($curPen, $cur.X - 16, $cur.Y, $cur.X + 16, $cur.Y);
    $g.DrawLine($curPen, $cur.X, $cur.Y - 16, $cur.X, $cur.Y + 16);
    $curLabel = "CURSOR($($cur.X),$($cur.Y))";
    $g.FillRectangle($bgBrush, [Math]::Min($cur.X + 12, $bounds.Width - 135), [Math]::Max(4, $cur.Y - 20), 130, 16);
    $g.DrawString($curLabel, $font, $curBrush, [Math]::Min($cur.X + 14, $bounds.Width - 133), [Math]::Max(4, $cur.Y - 19));

    $minorPen.Dispose(); $majorPen.Dispose(); $curPen.Dispose();
    $font.Dispose(); $bgBrush.Dispose(); $txtBrush.Dispose(); $curBrush.Dispose();

    $bmp.Save('${targetPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png);
    $g.Dispose();
    $bmp.Dispose();
    Write-Output "$($bounds.Width),$($bounds.Height),$($cur.X),$($cur.Y)";
  `;
  const output = await runPowerShell(script);
  const [w, h, cx, cy] = output.split(',').map(n => parseInt(n.trim(), 10));
  const resolvedPath = path.resolve(targetPath);
  let base64 = '';
  try {
    base64 = fs.readFileSync(resolvedPath).toString('base64');
  } catch (_) {}
  return {
    path: resolvedPath,
    width: w || 1920,
    height: h || 1080,
    cursor: { x: Number.isFinite(cx) ? cx : 0, y: Number.isFinite(cy) ? cy : 0 },
    pixelGrid: '100px minor / 200px labeled major',
    mimeType: 'image/png',
    base64
  };
}

/**
 * Get active foreground window title
 */
async function getActiveWindow() {
  const script = `
    ${WIN32_OPERATOR_CORE}
    $h = [WinHumanCore]::GetForegroundWindow();
    $sb = New-Object System.Text.StringBuilder 256;
    [WinHumanCore]::GetWindowText($h, $sb, 256) | Out-Null;
    Write-Output "$h|$($sb.ToString())";
  `;
  const output = await runPowerShell(script);
  const [h, ...titleParts] = output.split('|');
  return { handle: h?.trim() || '0', title: titleParts.join('|').trim() || 'Desktop' };
}

// --- SYSTEM VOICE & NOTIFICATION ---

/**
 * Speak text out loud through Windows Text-to-Speech (SAPI TTS)
 * @param {string} text
 * @param {number} [rate=0] - Speech rate from -10 to 10
 */
async function speak(text, rate = 0) {
  const safeText = text.replace(/"/g, '`"');
  const script = `
    Add-Type -AssemblyName System.Speech;
    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
    $synth.Rate = ${rate};
    $synth.Speak("${safeText}");
  `;
  await runPowerShell(script);
  return { success: true, spoken: text };
}

/**
 * Display a native Windows message box or toast notification
 * @param {string} title
 * @param {string} message
 */
async function notify(title, message) {
  const script = `
    Add-Type -AssemblyName System.Windows.Forms;
    [System.Windows.Forms.MessageBox]::Show("${message.replace(/"/g, '`"')}", "${title.replace(/"/g, '`"')}");
  `;
  await runPowerShell(script);
  return { success: true };
}

// --- HIGH-LEVEL HUMAN WORKFLOW RUNNER ---

/**
 * Execute a sequential multi-step human workflow
 * @param {Array<{ action: string, [key: string]: any }>} steps
 */
async function runHumanWorkflow(steps = []) {
  const results = [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const { action } = step;

    let res = null;
    if (action === 'launchApp') res = await launchApp(step.app || step.target, step.args);
    else if (action === 'click') res = await click(step.x, step.y, step.button);
    else if (action === 'doubleClick') res = await doubleClick(step.x, step.y);
    else if (action === 'rightClick') res = await rightClick(step.x, step.y);
    else if (action === 'type') res = await type(step.text, step.delay);
    else if (action === 'clickAndType') res = await clickAndType(step.x, step.y, step.text);
    else if (action === 'pressHotkey') res = await pressHotkey(step.keys || step.hotkey);
    else if (action === 'openWithDefault') res = await openWithDefault(step.target);
    else if (action === 'closeWindow') res = await closeWindow(step.window);
    else if (action === 'switchWindow') res = await switchWindow(step.window);
    else if (action === 'setWindowState') res = await setWindowState(step.window, step.state);
    else if (action === 'scroll') res = await scroll(step.direction, step.clicks);
    else if (action === 'dragAndDrop') res = await dragAndDrop(step.fromX, step.fromY, step.toX, step.toY);
    else if (action === 'seeScreen') res = await seeScreen(step.outputPath);
    else if (action === 'speak') res = await speak(step.text);
    else if (action === 'wait') {
      await new Promise(r => setTimeout(r, step.ms || 1000));
      res = { waitedMs: step.ms || 1000 };
    }

    results.push({ step: i + 1, action, result: res });
  }

  return { success: true, stepsExecuted: results.length, trace: results };
}

module.exports = {
  // Mouse
  moveMouseSmooth,
  click,
  doubleClick,
  rightClick,
  dragAndDrop,
  scroll,
  clickAndType,

  // Keyboard & Hotkeys
  type,
  typeString: type,
  pressHotkey,
  keyTap: pressHotkey,
  openStartMenu,
  openRunDialog,
  showDesktop,
  switchApp,
  copy,
  paste,
  selectAll,
  save,
  closeActiveWindow,
  openTaskManager,

  // Windows & App Lifecycle
  launchApp,
  openWithDefault,
  closeWindow,
  setWindowState,
  switchWindow,
  focusWindow: switchWindow,

  // Perception
  seeScreen,
  getActiveWindow,

  // Speech & Notify
  speak,
  notify,

  // Workflow engine
  runHumanWorkflow
};
