import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { AuthProviders } from './AuthProviders';
import { getFirebaseAuthError } from '../../firebase/auth';

export function SignIn({ onSwitchMode, onForgotPassword }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ email, password });
    } catch (err) {
      setError(getFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" id="signin-form" onSubmit={handleSubmit}>
      {error && (
        <div className="auth-form__error-alert">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div className="auth-form__group">
        <label className="auth-form__label">Email Address</label>
        <div className="auth-form__input-wrapper">
          <Mail size={15} style={{ color: 'var(--text-muted)' }} />
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
          <Lock size={15} style={{ color: 'var(--text-muted)' }} />
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
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      <div className="auth-form__row">
        <span />
        <button
          type="button"
          className="auth-form__switch-link"
          onClick={onForgotPassword}
          disabled={loading}
        >
          Forgot password?
        </button>
      </div>

      <Button
        variant="primary"
        type="submit"
        disabled={loading}
        id="signin-submit-btn"
        style={{ width: '100%', marginTop: '4px', justifyContent: 'center' }}
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>

      <AuthProviders passwordCredentials={{ email, password }} />

      <div className="auth-form__footer-switch">
        <span>Don't have an account?</span>
        <button
          type="button"
          className="auth-form__switch-link"
          onClick={onSwitchMode}
          disabled={loading}
        >
          Create Profile
        </button>
      </div>

    </form>
  );
}
