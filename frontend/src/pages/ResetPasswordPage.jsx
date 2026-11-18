import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, LoaderCircle, Lock } from 'lucide-react';
import { Button } from '../components/common/Button';
import {
  firebaseConfirmPasswordReset,
  firebaseVerifyPasswordResetCode
} from '../firebase/auth';
import { getPasswordRequirements, isStrongPassword } from '../utils/passwordValidation';

function getResetCodeError(code) {
  if (code === 'auth/expired-action-code') {
    return 'This password reset link has expired. Request a new link to continue.';
  }
  if (code === 'auth/invalid-action-code') {
    return 'This password reset link is invalid or has already been used. Request a new link to continue.';
  }
  return 'We could not verify this reset link. Check your connection or request a new link.';
}

function isInvalidResetCode(code) {
  return ['auth/expired-action-code', 'auth/invalid-action-code'].includes(code);
}

function readResetAction() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('oobCode');
  return {
    mode: params.get('mode'),
    code: code && code.length <= 4096 ? code : null
  };
}

export function ResetPasswordPage({ onBackToSignIn, onResetComplete }) {
  const [resetAction] = useState(readResetAction);
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const redirectTimer = useRef(null);
  const requirements = useMemo(() => getPasswordRequirements(password), [password]);
  const strength = requirements.filter((requirement) => requirement.valid).length;
  const passwordIsStrong = isStrongPassword(password);

  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname);
    if (resetAction.mode !== 'resetPassword' || !resetAction.code) {
      setStatus('invalid');
      setError('This password reset link is invalid. Request a new link to continue.');
      return undefined;
    }

    let active = true;
    firebaseVerifyPasswordResetCode(resetAction.code)
      .then(() => {
        if (active) setStatus('ready');
      })
      .catch((verificationError) => {
        if (!active) return;
        setError(getResetCodeError(verificationError?.code));
        setStatus(isInvalidResetCode(verificationError?.code) ? 'invalid' : 'error');
      });

    return () => {
      active = false;
    };
  }, [resetAction]);

  useEffect(() => () => window.clearTimeout(redirectTimer.current), []);

  const submitReset = async (event) => {
    event.preventDefault();
    setError('');
    if (!passwordIsStrong) {
      setError('Meet all password requirements before continuing.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await firebaseConfirmPasswordReset(resetAction.code, password);
      setPassword('');
      setConfirmPassword('');
      setStatus('success');
      redirectTimer.current = window.setTimeout(onResetComplete, 1800);
    } catch (resetError) {
      if (isInvalidResetCode(resetError?.code)) {
        setError(getResetCodeError(resetError.code));
        setStatus('invalid');
      } else if (['auth/weak-password', 'auth/password-does-not-meet-requirements'].includes(resetError?.code)) {
        setError('Choose a password that meets all the requirements below.');
      } else {
        setError('We could not update your password. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const strengthLabel = strength < 3 ? 'Weak' : strength < 5 ? 'Fair' : 'Strong';

  return (
    <main className="password-reset-page">
      <section className="password-reset-card" aria-labelledby="reset-password-title">
        <button
          type="button"
          className="password-reset-back"
          onClick={onBackToSignIn}
          aria-label="Back to sign in"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to sign in</span>
        </button>

        <div className="password-reset-heading">
          <div className="password-reset-icon"><KeyRound size={22} aria-hidden="true" /></div>
          <h1 id="reset-password-title">Reset your password</h1>
          <p>Choose a new password for your account.</p>
        </div>

        {status === 'checking' && (
          <p className="password-reset-progress" role="status">
            <LoaderCircle className="password-reset-spinner" size={17} aria-hidden="true" />
            Verifying your reset link...
          </p>
        )}

        {status === 'ready' && (
          <form className="auth-form" onSubmit={submitReset}>
            {error && <div className="password-reset-notice password-reset-notice--error" role="alert">{error}</div>}
            <div className="auth-form__group">
              <label className="auth-form__label" htmlFor="new-password">New password</label>
              <div className="auth-form__input-wrapper">
                <Lock size={16} color="var(--text-muted)" aria-hidden="true" />
                <input
                  id="new-password"
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-form__input"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="password-reset-visibility"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="password-strength" aria-live="polite">
              <div className="password-strength__header">
                <span>Password strength</span>
                <strong className={`password-strength__label password-strength__label--${strengthLabel.toLowerCase()}`}>
                  {password ? strengthLabel : 'Not entered'}
                </strong>
              </div>
              <div
                className="password-strength__meter"
                role="meter"
                aria-label="Password strength"
                aria-valuemin={0}
                aria-valuemax={5}
                aria-valuenow={strength}
              >
                {requirements.map((requirement) => (
                  <span
                    key={requirement.label}
                    className={requirement.valid ? 'password-strength__segment password-strength__segment--valid' : 'password-strength__segment'}
                  />
                ))}
              </div>
              <ul className="password-requirements">
                {requirements.map((requirement) => (
                  <li
                    key={requirement.label}
                    className={requirement.valid ? 'password-requirements__item password-requirements__item--valid' : 'password-requirements__item'}
                  >
                    <Check size={13} aria-hidden="true" />
                    {requirement.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="auth-form__group">
              <label className="auth-form__label" htmlFor="confirm-password">Confirm new password</label>
              <div className="auth-form__input-wrapper">
                <Lock size={16} color="var(--text-muted)" aria-hidden="true" />
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="auth-form__input"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="password-reset-visibility"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="password-reset-mismatch" role="status">The passwords do not match.</p>
            )}

            <Button
              variant="primary"
              type="submit"
              disabled={loading || !passwordIsStrong || !confirmPassword}
              className="password-reset-submit"
            >
              {loading && <LoaderCircle className="password-reset-spinner" size={16} aria-hidden="true" />}
              {loading ? 'Updating password...' : 'Update password'}
            </Button>
          </form>
        )}

        {status === 'success' && (
          <div className="password-reset-notice password-reset-notice--success" role="status">
            Password updated successfully. Redirecting you to sign in...
          </div>
        )}

        {(status === 'invalid' || status === 'error') && (
          <>
            <div className="password-reset-notice password-reset-notice--error" role="alert">{error}</div>
            <Button variant="primary" onClick={onBackToSignIn} className="password-reset-submit">
              Return to sign in
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
