import React from 'react';

/**
 * Reusable Button Component
 * @param {'primary' | 'secondary' | 'ghost' | 'danger'} variant
 * @param {'sm' | 'md'} size
 */
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  id,
  style
}) {
  const variantClass = `btn--${variant}`;
  const sizeClass = size === 'sm' ? 'btn--sm' : '';

  return (
    <button
      id={id}
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 15} style={{ flexShrink: 0 }} />}
      {children}
    </button>
  );
}
