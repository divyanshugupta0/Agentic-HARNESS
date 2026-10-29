import React, { useState, useEffect, useRef } from 'react';
import './style.css';

function App() {
  const [goal, setGoal] = useState('');
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const logsEndRef = useRef(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [logs]);

  // Listen for agent log events from main process
  useEffect(() => {
    if (window.api?.onMessage) {
      window.api.onMessage('agent:log', (message) => {
        setLogs(prev => [...prev, { type: 'log', text: message }]);
      });
      window.api.onMessage('agent:result', (result) => {
        setLogs(prev => [...prev, { type: 'result', text: JSON.stringify(result, null, 2) }]);
        setIsRunning(false);
        setIsPaused(false);
      });
      window.api.onMessage('agent:error', (error) => {
        setLogs(prev => [...prev, { type: 'error', text: error }]);
        setIsRunning(false);
      });
    }
  }, []);

  const handleStart = async () => {
    if (!goal.trim()) return;
    setIsRunning(true);
    setLogs([]);
    try {
      const result = await window.api.sendMessage('agent:start', goal);
      setLogs(prev => [...prev, { type: 'system', text: JSON.stringify(result, null, 2) }]);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'error', text: err.message }]);
      setIsRunning(false);
    }
  };

  const handleStop = async () => {
    try {
      const result = await window.api.sendMessage('agent:stop');
      setLogs(prev => [...prev, { type: 'system', text: JSON.stringify(result, null, 2) }]);
      setIsRunning(false);
      setIsPaused(false);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'error', text: err.message }]);
    }
  };

  const handlePause = async () => {
    try {
      const result = await window.api.sendMessage('agent:pause');
      setLogs(prev => [...prev, { type: 'system', text: JSON.stringify(result, null, 2) }]);
      setIsPaused(true);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'error', text: err.message }]);
    }
  };

  const handleResume = async () => {
    try {
      const result = await window.api.sendMessage('agent:resume');
      setLogs(prev => [...prev, { type: 'system', text: JSON.stringify(result, null, 2) }]);
      setIsPaused(false);
    } catch (err) {
      setLogs(prev => [...prev, { type: 'error', text: err.message }]);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Agentic Harness</h1>
        <div className="status-indicator">
          <span className={`status-dot ${isRunning ? (isPaused ? 'paused' : 'running') : 'idle'}`}></span>
          <span className="status-text">
            {isRunning ? (isPaused ? 'Paused' : 'Running') : 'Idle'}
          </span>
        </div>
      </header>

      <div className="input-section">
        <textarea
          id="goal"
          className="goal-input"
          placeholder="Enter a goal for the agent..."
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={isRunning && !isPaused}
          rows="3"
        />
        <div className="button-group">
          <button
            id="start"
            className="btn btn-primary"
            onClick={handleStart}
            disabled={isRunning && !isPaused}
          >
            Start Agent
          </button>
          <button
            id="pause"
            className="btn btn-secondary"
            onClick={handlePause}
            disabled={!isRunning || isPaused}
          >
            Pause
          </button>
          <button
            id="resume"
            className="btn btn-secondary"
            onClick={handleResume}
            disabled={!isPaused}
          >
            Resume
          </button>
          <button
            id="stop"
            className="btn btn-danger"
            onClick={handleStop}
            disabled={!isRunning}
          >
            Stop
          </button>
        </div>
      </div>

      <div className="logs-section">
        <h2>Agent Logs</h2>
        <div className="logs-container">
          {logs.map((entry, idx) => (
            <div key={idx} className={`log-entry log-${entry.type}`}>
              <span className="log-time">
                {new Date().toLocaleTimeString()}
              </span>
              <span className="log-text">{entry.text}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}

export default App;