import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../common/Button';
import { AuthProviders } from './AuthProviders';

export function SignUp({ onSwitchMode }) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp({ name, email, password });
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" id="signup-form" onSubmit={handleSubmit}>
      {error && (
        <div className="auth-form__error-alert">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div className="auth-form__group">
        <label className="auth-form__label">Full Name</label>
        <div className="auth-form__input-wrapper">
          <User size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="auth-form__input"
            placeholder="Ada Lovelace"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
      </div>

      <div className="auth-form__group">
        <label className="auth-form__label">Email Address</label>
        <div className="auth-form__input-wrapper">
          <Mail size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="email"
            className="auth-form__input"
            placeholder="ada@agenticharness.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            placeholder="At least 8 characters"
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

      <div className="auth-form__group">
        <label className="auth-form__label">Confirm Password</label>
        <div className="auth-form__input-wrapper">
          <Lock size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type={showPassword ? 'text' : 'password'}
            className="auth-form__input"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
      </div>

      <Button
        variant="primary"
        type="submit"
        disabled={loading}
        id="signup-submit-btn"
        style={{ width: '100%', marginTop: '4px', justifyContent: 'center' }}
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </Button>

      <div className="auth-form__footer-switch">
        <span>Already have an account?</span>
        <button
          type="button"
          className="auth-form__switch-link"
          onClick={onSwitchMode}
          disabled={loading}
        >
          Sign In
        </button>
      </div>

      <AuthProviders />
    </form>
  );
}
