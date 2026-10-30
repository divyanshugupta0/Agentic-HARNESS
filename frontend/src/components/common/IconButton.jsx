import React from 'react';

/**
 * Reusable Icon Button
 */
export function IconButton({
  icon: Icon,
  size = 18,
  onClick,
  title,
  isActive = false,
  className = '',
  disabled = false,
  id
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`btn-icon ${isActive ? 'btn-icon--active' : ''} ${className}`.trim()}
    >
      <Icon size={size} />
    </button>
  );
}
