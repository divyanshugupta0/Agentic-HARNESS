/**
 * Agentic Harness - Windows Control & Desktop Automation Tool (Robot.js)
 * Provides programmatic control of mouse, keyboard, screen capture,
 * window management, and system automation on Windows (with native fallback).
 */

const { exec, execSync, spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Attempt to load native robotjs if installed; fallback to Windows automation driver
let nativeRobot = null;
try {
  nativeRobot = require('robotjs');
} catch (_) {
  // Native robotjs is optional; built-in Windows automation driver will be used
}

const isWindows = process.platform === 'win32';

/**
 * Execute a PowerShell script synchronously or asynchronously
 */
function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    if (!isWindows) {
      return reject(new Error('Native desktop automation driver currently requires Windows OS.'));
    }

    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-Command', script
    ]);

    let stdout = '';
    let stderr = '';

    ps.stdout.on('data', data => { stdout += data.toString(); });
    ps.stderr.on('data', data => { stderr += data.toString(); });

    ps.on('close', code => {
      if (code !== 0 && stderr.trim().length > 0) {
        return reject(new Error(`PowerShell automation failed: ${stderr.trim()}`));
      }
      resolve(stdout.trim());
    });

    ps.on('error', err => reject(err));
  });
}

function runPowerShellSync(script) {
  if (!isWindows) {
    throw new Error('Native desktop automation driver currently requires Windows OS.');
  }
  const result = execSync(`powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`, {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024
  });
  return result.trim();
}

// Win32 Mouse event flags
const MOUSE_FLAGS = {
  MOVE: 0x0001,
  LEFT_DOWN: 0x0002,
  LEFT_UP: 0x0004,
  RIGHT_DOWN: 0x0008,
  RIGHT_UP: 0x0010,
  MIDDLE_DOWN: 0x0020,
  MIDDLE_UP: 0x0040,
  WHEEL: 0x0800
};

// C# User32 wrapper definition for fast Win32 API calls
const USER32_TYPE_DEFINITION = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;

public class Win32Robot {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

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
}
"@;
`;

/**
 * Get the current primary screen resolution
 * @returns {Promise<{ width: number, height: number }>}
 */
async function getScreenSize() {
  if (nativeRobot) {
    return nativeRobot.getScreenSize();
  }

  const script = `
    Add-Type -AssemblyName System.Windows.Forms;
    $b = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
    Write-Output "$($b.Width),$($b.Height)";
  `;
  const output = await runPowerShell(script);
  const [w, h] = output.split(',').map(n => parseInt(n.trim(), 10));
  return { width: w || 1920, height: h || 1080 };
}

/**
 * Get current mouse cursor position
 * @returns {Promise<{ x: number, y: number }>}
 */
async function getMousePos() {
  if (nativeRobot) {
    return nativeRobot.getMousePos();
  }

  const script = `
    Add-Type -AssemblyName System.Windows.Forms;
    $p = [System.Windows.Forms.Cursor]::Position;
    Write-Output "$($p.X),$($p.Y)";
  `;
  const output = await runPowerShell(script);
  const [x, y] = output.split(',').map(n => parseInt(n.trim(), 10));
  return { x: x || 0, y: y || 0 };
}

/**
 * Move the mouse pointer instantly to coordinates (x, y)
 * @param {number} x
 * @param {number} y
 */
async function moveMouse(x, y) {
  if (nativeRobot) {
    nativeRobot.moveMouse(x, y);
    return { success: true, x, y };
  }

  const script = `
    ${USER32_TYPE_DEFINITION}
    [Win32Robot]::SetCursorPos(${Math.round(x)}, ${Math.round(y)});
  `;
  await runPowerShell(script);
  return { success: true, x, y };
}

/**
 * Smoothly move the mouse from current position to (x, y)
 * @param {number} targetX
 * @param {number} targetY
 * @param {number} [speed=1] - 1 is normal, higher is faster
 */
async function moveMouseSmooth(targetX, targetY, speed = 1) {
  if (nativeRobot && nativeRobot.moveMouseSmooth) {
    nativeRobot.moveMouseSmooth(targetX, targetY);
    return { success: true, x: targetX, y: targetY };
  }

  const start = await getMousePos();
  const steps = Math.max(10, Math.floor(30 / (speed || 1)));

  const script = `
    ${USER32_TYPE_DEFINITION}
    $startX = ${start.x}; $startY = ${start.y};
    $endX = ${Math.round(targetX)}; $endY = ${Math.round(targetY)};
    $steps = ${steps};
    for ($i = 1; $i -le $steps; $i++) {
      $curX = [int]($startX + (($endX - $startX) * $i / $steps));
      $curY = [int]($startY + (($endY - $startY) * $i / $steps));
      [Win32Robot]::SetCursorPos($curX, $curY);
      Start-Sleep -Milliseconds 8;
    }
  `;
  await runPowerShell(script);
  return { success: true, x: targetX, y: targetY };
}

/**
 * Click a mouse button
 * @param {'left'|'right'|'middle'} [button='left']
 * @param {boolean} [double=false]
 */
async function mouseClick(button = 'left', double = false) {
  if (nativeRobot) {
    nativeRobot.mouseClick(button, double);
    return { success: true, button, double };
  }

  let downFlag = MOUSE_FLAGS.LEFT_DOWN;
  let upFlag = MOUSE_FLAGS.LEFT_UP;

  if (button === 'right') {
    downFlag = MOUSE_FLAGS.RIGHT_DOWN;
    upFlag = MOUSE_FLAGS.RIGHT_UP;
  } else if (button === 'middle') {
    downFlag = MOUSE_FLAGS.MIDDLE_DOWN;
    upFlag = MOUSE_FLAGS.MIDDLE_UP;
  }

  const clicks = double ? 2 : 1;
  const script = `
    ${USER32_TYPE_DEFINITION}
    for ($i = 0; $i -lt ${clicks}; $i++) {
      [Win32Robot]::mouse_event(${downFlag}, 0, 0, 0, 0);
      Start-Sleep -Milliseconds 25;
      [Win32Robot]::mouse_event(${upFlag}, 0, 0, 0, 0);
      Start-Sleep -Milliseconds 40;
    }
  `;
  await runPowerShell(script);
  return { success: true, button, double };
}

/**
 * Toggle mouse button down or up
 * @param {'down'|'up'} [down='down']
 * @param {'left'|'right'|'middle'} [button='left']
 */
async function mouseToggle(down = 'down', button = 'left') {
  if (nativeRobot) {
    nativeRobot.mouseToggle(down, button);
    return { success: true, down, button };
  }

  let flag = down === 'down' ? MOUSE_FLAGS.LEFT_DOWN : MOUSE_FLAGS.LEFT_UP;
  if (button === 'right') {
    flag = down === 'down' ? MOUSE_FLAGS.RIGHT_DOWN : MOUSE_FLAGS.RIGHT_UP;
  } else if (button === 'middle') {
    flag = down === 'down' ? MOUSE_FLAGS.MIDDLE_DOWN : MOUSE_FLAGS.MIDDLE_UP;
  }

  const script = `
    ${USER32_TYPE_DEFINITION}
    [Win32Robot]::mouse_event(${flag}, 0, 0, 0, 0);
  `;
  await runPowerShell(script);
  return { success: true, down, button };
}

/**
 * Drag mouse to specified coordinates
 * @param {number} x
 * @param {number} y
 */
async function dragMouse(x, y) {
  if (nativeRobot) {
    nativeRobot.dragMouse(x, y);
    return { success: true, x, y };
  }

  await mouseToggle('down', 'left');
  await moveMouseSmooth(x, y, 1.5);
  await mouseToggle('up', 'left');
  return { success: true, x, y };
}

/**
 * Scroll mouse wheel
 * @param {'up'|'down'} [direction='down']
 * @param {number} [amount=1]
 */
async function mouseScroll(direction = 'down', amount = 1) {
  if (nativeRobot && nativeRobot.scrollMouse) {
    nativeRobot.scrollMouse(0, direction === 'down' ? -amount * 120 : amount * 120);
    return { success: true, direction, amount };
  }

  const clicks = direction === 'down' ? -amount * 120 : amount * 120;
  const script = `
    ${USER32_TYPE_DEFINITION}
    [Win32Robot]::mouse_event(${MOUSE_FLAGS.WHEEL}, 0, 0, [uint32]${clicks}, 0);
  `;
  await runPowerShell(script);
  return { success: true, direction, amount };
}

/**
 * Type a string of text into the active window
 * @param {string} text
 */
async function typeString(text) {
  if (!text || typeof text !== 'string') return { success: false };

  if (nativeRobot) {
    nativeRobot.typeString(text);
    return { success: true, length: text.length };
  }

  // Escape special SendKeys characters: { } + ^ % ~ ( ) [ ]
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
 * Type text with delay between keystrokes
 * @param {string} text
 * @param {number} [cpm=600] - Characters per minute
 */
async function typeStringDelayed(text, cpm = 600) {
  if (nativeRobot && nativeRobot.typeStringDelayed) {
    nativeRobot.typeStringDelayed(text, cpm);
    return { success: true };
  }

  const delayMs = Math.max(10, Math.floor(60000 / (cpm || 600)));
  for (const char of text) {
    await typeString(char);
    await new Promise(r => setTimeout(r, delayMs));
  }
  return { success: true };
}

/**
 * Tap a specific key (e.g. 'enter', 'tab', 'escape', 'backspace', 'down', 'up')
 * @param {string} key
 * @param {string|Array<string>} [modifiers] - 'control', 'alt', 'shift', 'command'
 */
async function keyTap(key, modifiers = []) {
  if (nativeRobot) {
    nativeRobot.keyTap(key, modifiers);
    return { success: true, key, modifiers };
  }

  const keyMap = {
    enter: '{ENTER}',
    return: '{ENTER}',
    tab: '{TAB}',
    escape: '{ESC}',
    esc: '{ESC}',
    backspace: '{BACKSPACE}',
    delete: '{DELETE}',
    up: '{UP}',
    down: '{DOWN}',
    left: '{LEFT}',
    right: '{RIGHT}',
    home: '{HOME}',
    end: '{END}',
    pageup: '{PGUP}',
    pagedown: '{PGDN}',
    f1: '{F1}', f2: '{F2}', f3: '{F3}', f4: '{F4}',
    f5: '{F5}', f6: '{F6}', f7: '{F7}', f8: '{F8}',
    f9: '{F9}', f10: '{F10}', f11: '{F11}', f12: '{F12}',
    space: ' '
  };

  const keyLower = String(key).toLowerCase();
  const sendKey = keyMap[keyLower] || key;

  const mods = Array.isArray(modifiers) ? modifiers : [modifiers].filter(Boolean);
  let prefix = '';
  for (const mod of mods) {
    const m = mod.toLowerCase();
    if (m === 'ctrl' || m === 'control') prefix += '^';
    if (m === 'alt') prefix += '%';
    if (m === 'shift') prefix += '+';
  }

  const script = `
    Add-Type -AssemblyName System.Windows.Forms;
    [System.Windows.Forms.SendKeys]::SendWait("${prefix}${sendKey}");
  `;
  await runPowerShell(script);
  return { success: true, key, modifiers: mods };
}

/**
 * Capture full desktop screen or a region, saving to a PNG image file
 * @param {string} [outputPath] - Destination filepath (.png)
 * @param {Object} [bounds] - Optional { x, y, width, height }
 * @returns {Promise<{ path: string, width: number, height: number }>}
 */
async function captureScreen(outputPath = null, bounds = null) {
  const targetPath = outputPath || path.join(os.tmpdir(), `agentic_screenshot_${Date.now()}.png`);

  const script = `
    Add-Type -AssemblyName System.Windows.Forms, System.Drawing;
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds;
    $x = ${bounds?.x !== undefined ? bounds.x : '$bounds.X'};
    $y = ${bounds?.y !== undefined ? bounds.y : '$bounds.Y'};
    $w = ${bounds?.width !== undefined ? bounds.width : '$bounds.Width'};
    $h = ${bounds?.height !== undefined ? bounds.height : '$bounds.Height'};

    $bmp = New-Object System.Drawing.Bitmap($w, $h);
    $g = [System.Drawing.Graphics]::FromImage($bmp);
    $g.CopyFromScreen($x, $y, 0, 0, (New-Object System.Drawing.Size($w, $h)));
    $bmp.Save('${targetPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png);
    $g.Dispose();
    $bmp.Dispose();
    Write-Output "$w,$h";
  `;

  const output = await runPowerShell(script);
  const [w, h] = output.split(',').map(n => parseInt(n.trim(), 10));

  return {
    path: path.resolve(targetPath),
    width: w || 1920,
    height: h || 1080
  };
}

/**
 * Get active foreground window title
 * @returns {Promise<{ title: string, handle: string }>}
 */
async function getActiveWindow() {
  const script = `
    ${USER32_TYPE_DEFINITION}
    $h = [Win32Robot]::GetForegroundWindow();
    $sb = New-Object System.Text.StringBuilder 256;
    [Win32Robot]::GetWindowText($h, $sb, 256) | Out-Null;
    Write-Output "$h|$($sb.ToString())";
  `;
  const output = await runPowerShell(script);
  const [h, ...titleParts] = output.split('|');
  return {
    handle: h?.trim() || '0',
    title: titleParts.join('|').trim() || 'Desktop'
  };
}

/**
 * Read text from Windows clipboard
 * @returns {Promise<string>}
 */
async function getClipboard() {
  const script = `
    Add-Type -AssemblyName System.Windows.Forms;
    Write-Output ([System.Windows.Forms.Clipboard]::GetText());
  `;
  return await runPowerShell(script);
}

/**
 * Write text to Windows clipboard
 * @param {string} text
 */
async function setClipboard(text) {
  const script = `
    Add-Type -AssemblyName System.Windows.Forms;
    [System.Windows.Forms.Clipboard]::SetText('${text.replace(/'/g, "''")}');
  `;
  await runPowerShell(script);
  return { success: true };
}

/**
 * Play a system beep sound
 * @param {number} [freq=750] - Frequency in Hz
 * @param {number} [duration=200] - Duration in ms
 */
async function beep(freq = 750, duration = 200) {
  if (!isWindows) return { success: true };
  const script = `[System.Console]::Beep(${freq}, ${duration});`;
  await runPowerShell(script);
  return { success: true, freq, duration };
}

module.exports = {
  // Screen
  getScreenSize,
  captureScreen,

  // Mouse
  getMousePos,
  moveMouse,
  moveMouseSmooth,
  mouseClick,
  mouseToggle,
  dragMouse,
  mouseScroll,

  // Keyboard
  typeString,
  typeStringDelayed,
  keyTap,

  // Windows & System
  getActiveWindow,
  getClipboard,
  setClipboard,
  beep,

  // Driver metadata
  driver: nativeRobot ? 'native-robotjs' : 'windows-powershell-win32',
  isNative: !!nativeRobot
};

