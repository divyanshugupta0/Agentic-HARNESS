/**
 * Agentic Harness - Ghost Background Desktop Automation Engine
 * Inspired by NORTHTEKDevs/ghost (https://github.com/NORTHTEKDevs/ghost)
 *
 * Provides background-first desktop control without hijacking the user's physical
 * mouse cursor or stealing active window focus. Uses Windows UI Automation (UIA)
 * and Win32 PostMessage/PrintWindow background primitives, plus MCP/CLI bridge support.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const isWindows = process.platform === 'win32';

/**
 * Execute PowerShell script returning structured data
 */
function runPowerShell(script) {
  return new Promise((resolve, reject) => {
    if (!isWindows) {
      return reject(new Error('Ghost background desktop engine currently requires Windows.'));
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
        return reject(new Error(`Ghost PowerShell error: ${stderr.trim()}`));
      }
      resolve(stdout.trim());
    });

    ps.on('error', err => reject(err));
  });
}

// C# Win32 definitions for background window capture and messaging
const WIN32_BACKGROUND_DEFINITIONS = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;

public class GhostWin32 {
    [DllImport("user32.dll")]
    public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBmp, uint nFlags);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public static Bitmap CaptureWindowBackground(IntPtr hWnd) {
        RECT rect;
        GetWindowRect(hWnd, out rect);
        int width = rect.Right - rect.Left;
        int height = rect.Bottom - rect.Top;
        if (width <= 0 || height <= 0) return null;

        Bitmap bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp)) {
            IntPtr hdc = g.GetHdc();
            PrintWindow(hWnd, hdc, 2); // 2 = PW_RENDERFULLCONTENT
            g.ReleaseHdc(hdc);
        }
        return bmp;
    }
}
"@ -ReferencedAssemblies System.Drawing;
`;

/**
 * Check if the official Ghost CLI or binary is installed on the host system
 */
function isGhostCliAvailable() {
  try {
    const res = execSync('where ghost', { encoding: 'utf8', stdio: 'pipe' });
    return Boolean(res && res.trim().length > 0);
  } catch {
    return false;
  }
}

/**
 * List all open windows with title, HWND, process ID, and bounding rectangles
 * @param {string} [titleFilter] - Optional filter query
 * @returns {Promise<Array<{ handle: string, title: string, processId: number, processName: string, bounds: Object }>>}
 */
async function listWindows(titleFilter = '') {
  const filterPattern = titleFilter ? titleFilter.toLowerCase() : '';

  const script = `
    Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes;
    ${WIN32_BACKGROUND_DEFINITIONS}
    $root = [System.Windows.Automation.AutomationElement]::RootElement;
    $condition = [System.Windows.Automation.Condition]::TrueCondition;
    $windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $condition);
    $results = @();

    foreach ($w in $windows) {
      try {
        $name = $w.Current.Name;
        $h = $w.Current.NativeWindowHandle;
        $pid = $w.Current.ProcessId;
        if ($name -and $name.Trim().Length -gt 0 -and $h -gt 0) {
          $rect = $w.Current.BoundingRectangle;
          $pName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName;
          $results += [PSCustomObject]@{
            handle = $h.ToString();
            title = $name;
            processId = $pid;
            processName = $pName;
            x = [int]$rect.X;
            y = [int]$rect.Y;
            width = [int]$rect.Width;
            height = [int]$rect.Height;
          };
        }
      } catch {}
    }

    $results | ConvertTo-Json -Compress;
  `;

  const output = await runPowerShell(script);
  if (!output || output === '') return [];

  try {
    const parsed = JSON.parse(output);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    if (filterPattern) {
      return list.filter(w => (w.title && w.title.toLowerCase().includes(filterPattern)) ||
        (w.processName && w.processName.toLowerCase().includes(filterPattern)));
    }
    return list;
  } catch {
    return [];
  }
}

/**
 * Inspect UI elements inside a window using UI Automation (Accessibility Tree)
 * without stealing window focus or moving the cursor.
 *
 * @param {string} windowQuery - Window title or process name
 * @param {number} [maxDepth=2] - Inspection depth
 * @returns {Promise<Array<{ name: string, controlType: string, automationId: string, bounds: Object }>>}
 */
async function inspectElements(windowQuery, maxDepth = 2) {
  if (!windowQuery) throw new Error('Target windowQuery is required.');

  const script = `
    Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes;
    $query = "${windowQuery.replace(/"/g, '`"')}";
    $root = [System.Windows.Automation.AutomationElement]::RootElement;
    $win = $root.FindFirst([System.Windows.Automation.TreeScope]::Children, (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $query)));

    if (-not $win) {
      $all = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition);
      foreach ($w in $all) {
        if ($w.Current.Name -like "*$query*" -or (Get-Process -Id $w.Current.ProcessId -ErrorAction SilentlyContinue).ProcessName -like "*$query*") {
          $win = $w;
          break;
        }
      }
    }

    if (-not $win) {
      Write-Output "[]";
      exit 0;
    }

    $elements = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition);
    $results = @();
    $count = 0;

    foreach ($el in $elements) {
      if ($count -ge 100) { break; }
      try {
        $cur = $el.Current;
        if ($cur.Name -or $cur.AutomationId) {
          $results += [PSCustomObject]@{
            name = $cur.Name;
            controlType = $cur.ControlType.ProgrammaticName.Replace("ControlType.", "");
            automationId = $cur.AutomationId;
            className = $cur.ClassName;
            isEnabled = $cur.IsEnabled;
            x = [int]$cur.BoundingRectangle.X;
            y = [int]$cur.BoundingRectangle.Y;
            width = [int]$cur.BoundingRectangle.Width;
            height = [int]$cur.BoundingRectangle.Height;
          };
          $count++;
        }
      } catch {}
    }

    $results | ConvertTo-Json -Compress;
  `;

  const output = await runPowerShell(script);
  if (!output || output === '') return [];

  try {
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

/**
 * Click a UI element in the background using UI Automation InvokePattern
 * (Zero mouse movement — user cursor is untouched)
 *
 * @param {string} windowQuery - Window title or process name
 * @param {string} elementQuery - Element name or automationId
 * @returns {Promise<{ success: boolean, action: string, target: string }>}
 */
async function clickElement(windowQuery, elementQuery) {
  if (!windowQuery || !elementQuery) {
    throw new Error('Both windowQuery and elementQuery are required.');
  }

  // Self-termination protection: Prohibit closing the harness application window
  const winLower = String(windowQuery || '').toLowerCase();
  const elLower = String(elementQuery || '').toLowerCase();
  if ((winLower.includes('agentic harness') || winLower.includes('agentic-harness') || winLower === 'electron') &&
      (elLower === 'close' || elLower.includes('system.menu.close'))) {
    throw new Error(`Security Violation: Agent is strictly prohibited from closing its own application window.`);
  }

  const script = `
    Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes;
    $winQ = "${windowQuery.replace(/"/g, '`"')}";
    $elQ = "${elementQuery.replace(/"/g, '`"')}";

    $root = [System.Windows.Automation.AutomationElement]::RootElement;
    $all = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition);
    $win = $null;
    foreach ($w in $all) {
      if ($w.Current.Name -like "*$winQ*" -or (Get-Process -Id $w.Current.ProcessId -ErrorAction SilentlyContinue).ProcessName -like "*$winQ*") {
        $win = $w;
        break;
      }
    }

    if (-not $win) {
      Write-Output "WINDOW_NOT_FOUND";
      exit 0;
    }

    $descendants = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition);
    $target = $null;

    foreach ($el in $descendants) {
      try {
        if ($el.Current.Name -like "*$elQ*" -or $el.Current.AutomationId -eq $elQ) {
          $target = $el;
          break;
        }
      } catch {}
    }

    if (-not $target) {
      Write-Output "ELEMENT_NOT_FOUND";
      exit 0;
    }

    # Try UI Automation InvokePattern
    $invoked = $false;
    try {
      $pattern = $target.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern);
      if ($pattern) {
        $pattern.Invoke();
        $invoked = $true;
      }
    } catch {}

    # Try TogglePattern (checkboxes / toggles)
    if (-not $invoked) {
      try {
        $toggle = $target.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern);
        if ($toggle) {
          $toggle.Toggle();
          $invoked = $true;
        }
      } catch {}
    }

    if ($invoked) {
      Write-Output "INVOKED";
    } else {
      Write-Output "NO_INVOKE_PATTERN";
    }
  `;

  const output = await runPowerShell(script);
  if (output === 'WINDOW_NOT_FOUND') {
    throw new Error(`Window matching "${windowQuery}" not found.`);
  }
  if (output === 'ELEMENT_NOT_FOUND') {
    throw new Error(`Element matching "${elementQuery}" not found in window "${windowQuery}".`);
  }

  return {
    success: true,
    action: 'background_invoke',
    target: elementQuery,
    status: output
  };
}

/**
 * Set text value in an input control in the background using ValuePattern
 * @param {string} windowQuery - Window title or process name
 * @param {string} elementQuery - Control name or automationId
 * @param {string} text - Text to enter
 */
async function setText(windowQuery, elementQuery, text) {
  if (!windowQuery || !elementQuery) {
    throw new Error('Both windowQuery and elementQuery are required.');
  }

  const safeText = text.replace(/"/g, '`"');
  const script = `
    Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes;
    $winQ = "${windowQuery.replace(/"/g, '`"')}";
    $elQ = "${elementQuery.replace(/"/g, '`"')}";
    $val = "${safeText}";

    $root = [System.Windows.Automation.AutomationElement]::RootElement;
    $all = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition);
    $win = $null;
    foreach ($w in $all) {
      if ($w.Current.Name -like "*$winQ*" -or (Get-Process -Id $w.Current.ProcessId -ErrorAction SilentlyContinue).ProcessName -like "*$winQ*") {
        $win = $w;
        break;
      }
    }

    if (-not $win) { Write-Output "WINDOW_NOT_FOUND"; exit 0; }

    $descendants = $win.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition);
    $target = $null;

    foreach ($el in $descendants) {
      try {
        if ($el.Current.Name -like "*$elQ*" -or $el.Current.AutomationId -eq $elQ) {
          $target = $el;
          break;
        }
      } catch {}
    }

    if (-not $target) { Write-Output "ELEMENT_NOT_FOUND"; exit 0; }

    try {
      $valPattern = $target.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern);
      if ($valPattern) {
        $valPattern.SetValue($val);
        Write-Output "SUCCESS";
      } else {
        Write-Output "NO_VALUE_PATTERN";
      }
    } catch {
      Write-Output "ERROR: $($_.Exception.Message)";
    }
  `;

  const output = await runPowerShell(script);
  if (output === 'WINDOW_NOT_FOUND') throw new Error(`Window "${windowQuery}" not found.`);
  if (output === 'ELEMENT_NOT_FOUND') throw new Error(`Element "${elementQuery}" not found.`);

  return {
    success: output === 'SUCCESS',
    target: elementQuery,
    status: output
  };
}

/**
 * Capture screenshot of a background window even if it is occluded or not in front
 * Uses PrintWindow Win32 API.
 *
 * @param {string} windowQuery - Window title or process name
 * @param {string} [outputPath] - Destination PNG filepath
 * @returns {Promise<{ path: string, width: number, height: number }>}
 */
async function captureWindow(windowQuery, outputPath = null) {
  const targetPath = outputPath || path.join(os.tmpdir(), `ghost_window_${Date.now()}.png`);

  const script = `
    Add-Type -AssemblyName System.Drawing, UIAutomationClient;
    ${WIN32_BACKGROUND_DEFINITIONS}
    $query = "${windowQuery.replace(/"/g, '`"')}";
    $root = [System.Windows.Automation.AutomationElement]::RootElement;
    $all = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition);
    $win = $null;
    foreach ($w in $all) {
      if ($w.Current.Name -like "*$query*" -or (Get-Process -Id $w.Current.ProcessId -ErrorAction SilentlyContinue).ProcessName -like "*$query*") {
        $win = $w;
        break;
      }
    }

    if (-not $win) {
      Write-Output "WINDOW_NOT_FOUND";
      exit 0;
    }

    $h = [IntPtr]$win.Current.NativeWindowHandle;
    $bmp = [GhostWin32]::CaptureWindowBackground($h);
    if (-not $bmp) {
      Write-Output "CAPTURE_FAILED";
      exit 0;
    }

    $outPath = "${targetPath.replace(/\\/g, '\\\\')}";
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png);
    Write-Output "$($bmp.Width),$($bmp.Height)";
    $bmp.Dispose();
  `;

  const output = await runPowerShell(script);
  if (output === 'WINDOW_NOT_FOUND') {
    throw new Error(`Window matching "${windowQuery}" not found.`);
  }
  if (output === 'CAPTURE_FAILED') {
    throw new Error(`Failed to capture background window "${windowQuery}".`);
  }

  const [w, h] = output.split(',').map(n => parseInt(n.trim(), 10));
  return {
    path: path.resolve(targetPath),
    width: w || 800,
    height: h || 600
  };
}

/**
 * Focus a specific window (brings it to front if requested)
 * @param {string} windowQuery
 */
async function focusWindow(windowQuery) {
  const script = `
    Add-Type -AssemblyName UIAutomationClient;
    ${WIN32_BACKGROUND_DEFINITIONS}
    $query = "${windowQuery.replace(/"/g, '`"')}";
    $root = [System.Windows.Automation.AutomationElement]::RootElement;
    $all = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition);
    foreach ($w in $all) {
      if ($w.Current.Name -like "*$query*" -or (Get-Process -Id $w.Current.ProcessId -ErrorAction SilentlyContinue).ProcessName -like "*$query*") {
        [GhostWin32]::SetForegroundWindow([IntPtr]$w.Current.NativeWindowHandle);
        Write-Output "SUCCESS";
        exit 0;
      }
    }
    Write-Output "NOT_FOUND";
  `;

  const output = await runPowerShell(script);
  return {
    success: output === 'SUCCESS',
    query: windowQuery
  };
}

/**
 * Click a coordinate (x, y) relative to a window's client area in the background
 * without moving the user's mouse cursor.
 * Uses Win32 PostMessage (WM_LBUTTONDOWN / WM_LBUTTONUP).
 *
 * @param {string} windowQuery - Window title or process name
 * @param {number} x - Client X coordinate
 * @param {number} y - Client Y coordinate
 */
async function clickCoordinates(windowQuery, x, y) {
  const script = `
    Add-Type -AssemblyName UIAutomationClient;
    ${WIN32_BACKGROUND_DEFINITIONS}
    $query = "${windowQuery.replace(/"/g, '`"')}";
    $root = [System.Windows.Automation.AutomationElement]::RootElement;
    $all = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition);
    foreach ($w in $all) {
      if ($w.Current.Name -like "*$query*" -or (Get-Process -Id $w.Current.ProcessId -ErrorAction SilentlyContinue).ProcessName -like "*$query*") {
        $h = [IntPtr]$w.Current.NativeWindowHandle;
        $lParam = [IntPtr](${Math.round(x)} -bor (${Math.round(y)} -shl 16));
        [GhostWin32]::PostMessage($h, 0x0201, [IntPtr]1, $lParam); # WM_LBUTTONDOWN
        Start-Sleep -Milliseconds 25;
        [GhostWin32]::PostMessage($h, 0x0202, [IntPtr]0, $lParam); # WM_LBUTTONUP
        Write-Output "SUCCESS";
        exit 0;
      }
    }
    Write-Output "NOT_FOUND";
  `;

  const output = await runPowerShell(script);
  return { success: output === 'SUCCESS', x, y };
}

/**
 * Send text directly to a background window via WM_CHAR messages
 * without taking focus or moving the keyboard cursor.
 *
 * @param {string} windowQuery - Target window title or process name
 * @param {string} text - Text to send
 */
async function sendTextBackground(windowQuery, text) {
  const safeText = text.replace(/"/g, '`"');
  const script = `
    Add-Type -AssemblyName UIAutomationClient;
    ${WIN32_BACKGROUND_DEFINITIONS}
    $query = "${windowQuery.replace(/"/g, '`"')}";
    $text = "${safeText}";
    $root = [System.Windows.Automation.AutomationElement]::RootElement;
    $all = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition);
    foreach ($w in $all) {
      if ($w.Current.Name -like "*$query*" -or (Get-Process -Id $w.Current.ProcessId -ErrorAction SilentlyContinue).ProcessName -like "*$query*") {
        $h = [IntPtr]$w.Current.NativeWindowHandle;
        foreach ($c in $text.ToCharArray()) {
          [GhostWin32]::PostMessage($h, 0x0102, [IntPtr][int]$c, [IntPtr]0); # WM_CHAR
          Start-Sleep -Milliseconds 10;
        }
        Write-Output "SUCCESS";
        exit 0;
      }
    }
    Write-Output "NOT_FOUND";
  `;

  const output = await runPowerShell(script);
  return { success: output === 'SUCCESS', length: text.length };
}

/**
 * Act-Then-Verify Loop: Ghost's signature verified execution pattern
 * @param {Function} actFn - Async action
 * @param {Function} verifyFn - Async verification predicate returning boolean
 * @param {number} [timeoutMs=5000]
 */
async function actThenVerify(actFn, verifyFn, timeoutMs = 5000) {
  await actFn();
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const verified = await verifyFn();
    if (verified) {
      return { success: true, verified: true, durationMs: Date.now() - startTime };
    }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Ghost Verification Failed: Action completed but state did not verify within ${timeoutMs}ms.`);
}

module.exports = {
  // Discovery & Inspection
  listWindows,
  inspectElements,

  // Zero-Hijack Background Actions
  clickElement,
  clickCoordinates,
  setText,
  sendTextBackground,
  captureWindow,
  focusWindow,

  // Verified Execution
  actThenVerify,

  // Protocol metadata
  engine: 'ghost-uia-background',
  isGhostCliAvailable: isGhostCliAvailable(),
  sourceRepo: 'https://github.com/NORTHTEKDevs/ghost'
};

