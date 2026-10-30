import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const PRESET_GOALS = [
  'Analyze repository architecture and suggest optimization paths',
  'Scan local files for security vulnerabilities and secret leaks',
  'Execute automated code review and generate summary report',
  'Fetch latest release notes and synchronize workspace configuration'
];

function App() {
  const [goal, setGoal] = useState('');
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const logsEndRef = useRef(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Listen for agent log events from main process
  useEffect(() => {
    if (window.api?.onMessage) {
      window.api.onMessage('agent:log', (message) => {
        setLogs((prev) => [...prev, { type: 'log', text: message, time: new Date().toLocaleTimeString() }]);
      });
      window.api.onMessage('agent:result', (result) => {
        const text = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
        setLogs((prev) => [...prev, { type: 'result', text, time: new Date().toLocaleTimeString() }]);
        setIsRunning(false);
        setIsPaused(false);
      });
      window.api.onMessage('agent:error', (error) => {
        const text = typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error);
        setLogs((prev) => [...prev, { type: 'error', text, time: new Date().toLocaleTimeString() }]);
        setIsRunning(false);
        setIsPaused(false);
      });
    }
  }, []);

  const handleStart = async () => {
    if (!goal.trim()) return;
    setIsRunning(true);
    setIsPaused(false);
    setLogs((prev) => [
      ...prev,
      { type: 'system', text: `Initiating agent mission: "${goal}"`, time: new Date().toLocaleTimeString() }
    ]);
    try {
      const result = await window.api.sendMessage('agent:start', goal);
      setLogs((prev) => [
        ...prev,
        { type: 'system', text: JSON.stringify(result, null, 2), time: new Date().toLocaleTimeString() }
      ]);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: 'error', text: err.message || 'Execution error', time: new Date().toLocaleTimeString() }
      ]);
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    try {
      const result = await window.api.sendMessage('agent:stop');
      setLogs((prev) => [
        ...prev,
        { type: 'system', text: `Agent stopped. ${JSON.stringify(result)}`, time: new Date().toLocaleTimeString() }
      ]);
      setIsRunning(false);
      setIsPaused(false);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: 'error', text: err.message, time: new Date().toLocaleTimeString() }
      ]);
    }
  };

  const handlePause = async () => {
    try {
      const result = await window.api.sendMessage('agent:pause');
      setLogs((prev) => [
        ...prev,
        { type: 'system', text: `Agent paused: ${JSON.stringify(result)}`, time: new Date().toLocaleTimeString() }
      ]);
      setIsPaused(true);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: 'error', text: err.message, time: new Date().toLocaleTimeString() }
      ]);
    }
  };

  const handleResume = async () => {
    try {
      const result = await window.api.sendMessage('agent:resume');
      setLogs((prev) => [
        ...prev,
        { type: 'system', text: `Agent resumed: ${JSON.stringify(result)}`, time: new Date().toLocaleTimeString() }
      ]);
      setIsPaused(false);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: 'error', text: err.message, time: new Date().toLocaleTimeString() }
      ]);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter((entry) => {
    if (activeTab === 'all') return true;
    return entry.type === activeTab;
  });

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <div>
            <h1>Agentic Harness</h1>
            <p className="header-subtitle">Local Autonomous Agent Runtime & Supervisor</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="stats-badges">
            <span className="badge badge-tool">Tools: fs • shell • http</span>
            <span className="badge badge-env">Electron 25 + React 18</span>
          </div>

          <div className={`status-indicator ${isRunning ? (isPaused ? 'paused' : 'running') : 'idle'}`}>
            <span className={`status-dot ${isRunning ? (isPaused ? 'paused' : 'running') : 'idle'}`}></span>
            <span className="status-text">
              {isRunning ? (isPaused ? 'Paused' : 'Running') : 'Ready'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="main-content">
        {/* Goal Input Section */}
        <section className="input-section glass-panel">
          <div className="section-header">
            <label htmlFor="goal" className="section-title">
              <span className="label-icon">🎯</span> Agent Objective
            </label>
            <span className="char-hint">{goal.length} characters</span>
          </div>

          <textarea
            id="goal"
            className="goal-input"
            placeholder="Describe the autonomous goal for the agent to plan, execute, and monitor..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={isRunning && !isPaused}
            rows="3"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleStart();
              }
            }}
          />

          {/* Quick Presets */}
          <div className="presets-container">
            <span className="presets-title">Presets:</span>
            {PRESET_GOALS.map((preset, index) => (
              <button
                key={index}
                type="button"
                className="preset-chip"
                onClick={() => setGoal(preset)}
                disabled={isRunning && !isPaused}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div className="button-group">
            <button
              id="start"
              className="btn btn-primary"
              onClick={handleStart}
              disabled={isRunning && !isPaused || !goal.trim()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span>Start Agent</span>
            </button>

            <button
              id="pause"
              className="btn btn-secondary"
              onClick={handlePause}
              disabled={!isRunning || isPaused}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
              <span>Pause</span>
            </button>

            <button
              id="resume"
              className="btn btn-secondary"
              onClick={handleResume}
              disabled={!isPaused}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span>Resume</span>
            </button>

            <button
              id="stop"
              className="btn btn-danger"
              onClick={handleStop}
              disabled={!isRunning}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14"/>
              </svg>
              <span>Stop</span>
            </button>
          </div>
        </section>

        {/* Live Logs Section */}
        <section className="logs-section glass-panel">
          <div className="logs-header">
            <div className="logs-header-left">
              <h2>Agent Execution Stream</h2>
              <span className="log-counter">{logs.length} entries</span>
            </div>

            <div className="logs-toolbar">
              <div className="tabs-filter">
                <button
                  className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveTab('all')}
                >
                  All
                </button>
                <button
                  className={`tab-btn ${activeTab === 'log' ? 'active' : ''}`}
                  onClick={() => setActiveTab('log')}
                >
                  Logs
                </button>
                <button
                  className={`tab-btn ${activeTab === 'result' ? 'active' : ''}`}
                  onClick={() => setActiveTab('result')}
                >
                  Results
                </button>
                <button
                  className={`tab-btn ${activeTab === 'system' ? 'active' : ''}`}
                  onClick={() => setActiveTab('system')}
                >
                  System
                </button>
              </div>

              {logs.length > 0 && (
                <button className="btn-icon" onClick={handleClearLogs} title="Clear logs">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="logs-container">
            {filteredLogs.length === 0 ? (
              <div className="empty-logs">
                <div className="empty-icon">⚡</div>
                <p className="empty-title">Runtime Ready</p>
                <p className="empty-subtitle">
                  {logs.length === 0
                    ? 'Enter an objective above and start the agent to stream live reasoning, tool executions, and results.'
                    : 'No logs match the selected filter category.'}
                </p>
              </div>
            ) : (
              filteredLogs.map((entry, idx) => (
                <div key={idx} className={`log-entry log-${entry.type}`}>
                  <div className="log-meta">
                    <span className={`log-type-tag tag-${entry.type}`}>
                      {entry.type.toUpperCase()}
                    </span>
                    <span className="log-time">{entry.time || new Date().toLocaleTimeString()}</span>
                  </div>
                  <pre className="log-text">{entry.text}</pre>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </section>
      </div>
    </div>
  );
}

// Mount React into DOM
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

export default App;