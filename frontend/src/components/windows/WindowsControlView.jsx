import React, { useState, useEffect } from 'react';
import {
  Monitor,
  MousePointer,
  Keyboard,
  Camera,
  Bot,
  Play,
  Layers,
  Terminal,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Sliders,
  CheckCircle2,
  ExternalLink,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { api } from '../../services/api';

/**
 * Windows OS Desktop Control & Ghost Background Automation Center
 * Direct human-like OS access (Robot.js + Windows Operator) and Zero-Hijack background automation (Ghost).
 */
export function WindowsControlView() {
  const [screenSize, setScreenSize] = useState({ width: 1920, height: 1080 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeWindow, setActiveWindow] = useState('Desktop');
  const [screenshotInfo, setScreenshotInfo] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Ghost Background State
  const [ghostWindows, setGhostWindows] = useState([]);
  const [selectedGhostWindow, setSelectedGhostWindow] = useState('');
  const [inspectedElements, setInspectedElements] = useState([]);
  const [isInspecting, setIsInspecting] = useState(false);

  // Operator Actions State
  const [launchAppInput, setLaunchAppInput] = useState('calc');
  const [typeTextInput, setTypeTextInput] = useState('');
  const [actionLog, setActionLog] = useState([]);

  useEffect(() => {
    refreshTelemetry();
  }, []);

  const addLog = (msg, type = 'info') => {
    setActionLog((prev) => [
      { id: Date.now() + Math.random(), time: new Date().toLocaleTimeString(), msg, type },
      ...prev.slice(0, 19)
    ]);
  };

  const refreshTelemetry = async () => {
    try {
      const sizeRes = await api.send('robot:getScreenSize');
      if (sizeRes?.size) setScreenSize(sizeRes.size);

      const posRes = await api.send('robot:getMousePos');
      if (posRes?.pos) setMousePos(posRes.pos);

      const winRes = await api.send('ghost:listWindows');
      if (winRes?.list) {
        setGhostWindows(winRes.list);
        if (winRes.list.length > 0 && !selectedGhostWindow) {
          setSelectedGhostWindow(winRes.list[0].title);
        }
      }
    } catch (err) {
      console.warn('Telemetry refresh notice:', err);
    }
  };

  const handleCaptureScreen = async () => {
    setIsCapturing(true);
    try {
      const res = await api.send('robot:captureScreen');
      if (res && res.success !== false) {
        setScreenshotInfo(res.info || { timestamp: new Date().toLocaleTimeString(), width: screenSize.width, height: screenSize.height });
        if (res.info?.activeWindow) setActiveWindow(res.info.activeWindow);
        addLog(`Captured display screen (${screenSize.width}x${screenSize.height})`, 'success');
      }
    } catch (err) {
      addLog('Failed to capture screen: ' + err.message, 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleHotkey = async (keys) => {
    try {
      await api.send('operator:hotkey', keys);
      addLog(`Dispatched system hotkey [${keys.join('+')}]`, 'success');
    } catch (err) {
      addLog(`Hotkey failed: ${err.message}`, 'error');
    }
  };

  const handleLaunchApp = async () => {
    if (!launchAppInput.trim()) return;
    try {
      await api.send('operator:launchApp', { app: launchAppInput.trim() });
      addLog(`Launched application: "${launchAppInput.trim()}"`, 'success');
      setTimeout(refreshTelemetry, 1500);
    } catch (err) {
      addLog(`App launch error: ${err.message}`, 'error');
    }
  };

  const handleTypeText = async () => {
    if (!typeTextInput) return;
    try {
      await api.send('operator:type', { text: typeTextInput });
      addLog(`Typed string into active window (${typeTextInput.length} chars)`, 'success');
      setTypeTextInput('');
    } catch (err) {
      addLog(`Type error: ${err.message}`, 'error');
    }
  };

  const handleGhostInspect = async () => {
    if (!selectedGhostWindow) return;
    setIsInspecting(true);
    try {
      const res = await api.send('ghost:inspectElements', { windowQuery: selectedGhostWindow, maxDepth: 2 });
      if (res?.elements) {
        setInspectedElements(res.elements);
        addLog(`Ghost inspected ${res.elements.length} elements in "${selectedGhostWindow}"`, 'success');
      } else {
        setInspectedElements([]);
        addLog(`No UI automation elements returned for "${selectedGhostWindow}"`, 'info');
      }
    } catch (err) {
      addLog(`Ghost element inspection error: ${err.message}`, 'error');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleGhostClick = async (elementName) => {
    try {
      const res = await api.send('ghost:clickElement', {
        windowQuery: selectedGhostWindow,
        elementQuery: elementName
      });
      addLog(`Ghost background click on "${elementName}": ${res?.success ? 'Success' : 'Sent'}`, 'success');
    } catch (err) {
      addLog(`Ghost background click error: ${err.message}`, 'error');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
      {/* Title & Telemetry Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Windows OS Control & Ghost Background Automation
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-cyan)',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              <Bot size={13} />
              Human OS Operator
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Physical desktop control via Robot.js + Zero-Hijack background UI Automation via NORTHTEKDevs/ghost.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshTelemetry}
          className="btn-icon"
          title="Refresh OS Telemetry"
          style={{ padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: '8px' }}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Safety & Self-Termination Protection Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '12px',
          color: 'var(--text-primary)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={18} color="var(--accent-emerald)" />
          <span>
            <strong>Self-Termination Prevention Active: </strong>
            Agent process and harness windows are strictly immune to accidental or malicious close commands.
          </span>
        </div>
        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
          PID: PROTECTED
        </span>
      </div>

      {/* Grid: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Column 1: Screen Perception & Robot.js Foreground Control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Screen Perception Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Monitor size={17} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  Screen Perception & Vision
                </span>
              </div>
              <button
                type="button"
                onClick={handleCaptureScreen}
                disabled={isCapturing}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-blue)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isCapturing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Camera size={14} />
                <span>{isCapturing ? 'Capturing...' : 'Capture Screenshot'}</span>
              </button>
            </div>

            {/* Display Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Resolution</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {screenSize.width} × {screenSize.height}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Mouse Pos</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  ({mousePos.x}, {mousePos.y})
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Active Window</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeWindow}
                </div>
              </div>
            </div>

            {/* Screenshot Preview Box */}
            <div
              style={{
                width: '100%',
                height: '180px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                fontSize: '12px',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <Monitor size={32} color="var(--border-default)" />
              <span>
                {screenshotInfo
                  ? `Screenshot captured at ${screenshotInfo.timestamp || 'just now'} (${screenshotInfo.width || screenSize.width}x${screenshotInfo.height || screenSize.height})`
                  : 'Click "Capture Screenshot" to feed desktop vision'}
              </span>
            </div>
          </div>

          {/* Foreground Robot & Human Shortcuts */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Keyboard size={17} color="var(--accent-purple)" />
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                System Hotkeys & App Launcher
              </span>
            </div>

            {/* Hotkey Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {[
                { label: 'Win + D (Desktop)', keys: ['win', 'd'] },
                { label: 'Win + R (Run)', keys: ['win', 'r'] },
                { label: 'Alt + Tab', keys: ['alt', 'tab'] },
                { label: 'Ctrl + C', keys: ['control', 'c'] },
                { label: 'Ctrl + V', keys: ['control', 'v'] },
                { label: 'Ctrl + S', keys: ['control', 's'] }
              ].map((hk) => (
                <button
                  key={hk.label}
                  type="button"
                  onClick={() => handleHotkey(hk.keys)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {hk.label}
                </button>
              ))}
            </div>

            {/* Quick App Launcher */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <input
                type="text"
                placeholder="Executable (e.g. calc, notepad, cmd)"
                value={launchAppInput}
                onChange={(e) => setLaunchAppInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              />
              <button
                type="button"
                onClick={handleLaunchApp}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-purple)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Launch
              </button>
            </div>

            {/* Type String into Active Window */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Type text directly into foreground window..."
                value={typeTextInput}
                onChange={(e) => setTypeTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTypeText()}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              />
              <button
                type="button"
                onClick={handleTypeText}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Type
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: Ghost Background UI Automation & Audit Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Ghost Background UI Automation Card */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={17} color="var(--accent-emerald)" />
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                  Ghost Zero-Hijack Automation
                </span>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--accent-emerald)',
                  fontWeight: 600
                }}
              >
                NO MOUSE HIJACK
              </span>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Inspect UI Automation element trees and click buttons in background windows without moving the user's cursor.
            </p>

            {/* Window Query Dropdown */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <select
                value={selectedGhostWindow}
                onChange={(e) => setSelectedGhostWindow(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontSize: '12px'
                }}
              >
                {ghostWindows.length === 0 && <option value="">No running windows detected</option>}
                {ghostWindows.map((w, idx) => (
                  <option key={idx} value={w.title}>
                    {w.title} ({w.processName})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleGhostInspect}
                disabled={isInspecting || !selectedGhostWindow}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-emerald)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isInspecting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Layers size={14} />
                <span>{isInspecting ? 'Scanning...' : 'Inspect Elements'}</span>
              </button>
            </div>

            {/* Inspected Elements Tree */}
            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '10px',
                maxHeight: '160px',
                overflowY: 'auto',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {inspectedElements.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                  Select a window and click "Inspect Elements" to view UI tree
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {inspectedElements.map((el, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: '4px'
                      }}
                    >
                      <span style={{ color: 'var(--accent-cyan)' }}>
                        [{el.ControlType || 'Control'}] {el.Name || el.AutomationId || 'Unnamed element'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleGhostClick(el.Name || el.AutomationId)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--accent-blue)',
                          color: '#fff',
                          border: 'none',
                          fontSize: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        Bg Click
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action & Audit Log */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '18px',
              flex: 1
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={16} color="var(--accent-amber)" />
                <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                  OS Action Audit Stream
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActionLog([])}
                style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '8px',
                padding: '10px',
                height: '160px',
                overflowY: 'auto',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {actionLog.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                  No actions executed yet.
                </div>
              ) : (
                actionLog.map((log) => (
                  <div key={log.id} style={{ marginBottom: '4px', color: log.type === 'error' ? 'var(--accent-rose)' : log.type === 'success' ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span> {log.msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

