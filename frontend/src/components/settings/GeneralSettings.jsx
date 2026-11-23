import React, { useState } from 'react';
import { Sliders, Check } from 'lucide-react';
import { Button } from '../common/Button';

export function GeneralSettings() {
  const [workspaceName, setWorkspaceName] = useState('Agentic Harness Workspace');
  const [autoScroll, setAutoScroll] = useState(true);
  const [soundEffects, setSoundEffects] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="appearance-settings">
      <h2 className="appearance-settings__title">General Workspace Settings</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Configure general workspace environment preferences and agent interaction behavior.
      </p>

      <div className="appearance-settings__panel">
        <div className="appearance-settings__row">
          <div className="appearance-settings__row-label">
            <span>Workspace Display Name</span>
            <small>Label displayed in the workspace header.</small>
          </div>
          <input
            type="text"
            className="auth-form__input-wrapper"
            style={{ width: '220px', fontSize: '13px' }}
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
          />
        </div>

        <div className="appearance-settings__row">
          <div className="appearance-settings__row-label">
            <span>Chat Auto-Scroll</span>
            <small>Automatically scroll to latest agent message on update.</small>
          </div>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
        </div>

        <div className="appearance-settings__row appearance-settings__row--last">
          <div className="appearance-settings__row-label">
            <span>Audio & Sound Feedback</span>
            <small>Play subtle audio chimes when tasks complete.</small>
          </div>
          <input
            type="checkbox"
            checked={soundEffects}
            onChange={(e) => setSoundEffects(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
        <Button variant="primary" size="sm" icon={saved ? Check : null} onClick={handleSave}>
          {saved ? 'Saved' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
