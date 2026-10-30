import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';

export function SignIn({ onSwitchMode }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ email, password, rememberMe });
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" id="signin-form" onSubmit={handleSubmit}>
      {error && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--accent-rose)',
            fontSize: '12px'
          }}
        >
          {error}
        </div>
      )}

      <div className="auth-form__group">
        <label className="auth-form__label">Email Address</label>
        <div className="auth-form__input-wrapper">
          <Mail size={16} color="var(--text-muted)" />
          <input
            type="email"
            className="auth-form__input"
            placeholder="developer@local.workspace"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
      </div>

      <div className="auth-form__group">
        <label className="auth-form__label">Password</label>
        <div className="auth-form__input-wrapper">
          <Lock size={16} color="var(--text-muted)" />
          <input
            type={showPassword ? 'text' : 'password'}
            className="auth-form__input"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="btn-icon"
            style={{ width: '24px', height: '24px' }}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <div className="auth-form__row">
        <label className="auth-form__checkbox-label">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span>Remember me</span>
        </label>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Local sandbox session</span>
      </div>

      <Button
        variant="primary"
        type="submit"
        disabled={loading}
        id="signin-submit-btn"
        style={{ width: '100%', marginTop: '4px' }}
      >
        {loading ? 'Authenticating...' : 'Sign In to Workspace'}
      </Button>

      <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
        Don't have an account?{' '}
        <span className="auth-form__switch-link" onClick={onSwitchMode}>
          Create account
        </span>
      </div>
    </form>
  );
}
