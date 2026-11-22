import React from 'react';
import { Shield, Lock, FileCode, CheckCircle } from 'lucide-react';

export function PrivacySettings() {
  return (
    <div className="appearance-settings">
      <h2 className="appearance-settings__title">Privacy, Security & Sandboxing</h2>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Agentic Harness is built with a local-first security architecture ensuring complete code isolation.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 16px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)'
          }}
        >
          <Shield size={20} style={{ color: 'var(--status-success)', marginTop: '2px' }} />
          <div>
            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
              Local Workstation Execution
            </span>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
              All filesystem actions, terminal processes, and memory indexes run exclusively on your machine. No telemetry or source code is uploaded to third-party tracking services.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 16px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)'
          }}
        >
          <Lock size={20} style={{ color: 'var(--accent-indigo)', marginTop: '2px' }} />
          <div>
            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
              Electron Context Isolation & Sandboxing
            </span>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
              The renderer process is strictly isolated from Node.js runtime primitives. All system tool invocations transit through verified IPC handlers with strict parameter validation.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '14px 16px',
            borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)'
          }}
        >
          <FileCode size={20} style={{ color: 'var(--status-info)', marginTop: '2px' }} />
          <div>
            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
              Credential Storage
            </span>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
              API tokens and provider keys are persisted only in sandboxed application local storage and never exposed in browser console logs or error dumps.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
