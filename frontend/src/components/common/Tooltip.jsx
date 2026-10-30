import React, { useState } from 'react';

/**
 * Lightweight Tooltip Component
 */
export function Tooltip({ text, children, position = 'top' }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && text && (
        <div
          style={{
            position: 'absolute',
            [position === 'top' ? 'bottom' : 'top']: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '6px',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 100,
            pointerEvents: 'none'
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
