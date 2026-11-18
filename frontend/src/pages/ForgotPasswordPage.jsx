import React, { useState } from 'react';
import { ArrowLeft, LoaderCircle, Mail } from 'lucide-react';
import { Button } from '../components/common/Button';
import { firebasePasswordReset } from '../firebase/auth';

export function ForgotPasswordPage({ onBackToSignIn }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await firebasePasswordReset(email);
      setSubmitted(true);
    } catch (requestError) {
      if (['auth/user-not-found', 'auth/invalid-email'].includes(requestError?.code)) {
        setSubmitted(true);
      } else {
        setError('We could not process your request right now. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="password-reset-page">
      <section className="password-reset-card" aria-labelledby="forgot-password-title">
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
          <div className="password-reset-icon"><Mail size={22} aria-hidden="true" /></div>
          <h1 id="forgot-password-title">Forgot your password?</h1>
          <p>Enter your account email and we’ll send a link to reset your password.</p>
        </div>

        {submitted ? (
          <div className="password-reset-notice password-reset-notice--success" role="status">
            If an account exists for <strong>{email.trim()}</strong>, you’ll receive a password reset link shortly.
            Check your inbox and spam folder.
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="password-reset-notice password-reset-notice--error" role="alert">{error}</div>}
            <div className="auth-form__group">
              <label className="auth-form__label" htmlFor="reset-email">Email address</label>
              <div className="auth-form__input-wrapper">
                <Mail size={16} color="var(--text-muted)" aria-hidden="true" />
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  className="auth-form__input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
            </div>
            <Button
              variant="primary"
              type="submit"
              disabled={loading}
              className="password-reset-submit"
            >
              {loading && <LoaderCircle className="password-reset-spinner" size={16} aria-hidden="true" />}
              {loading ? 'Sending link...' : 'Send reset link'}
            </Button>
          </form>
        )}

        {submitted && (
          <Button variant="primary" onClick={onBackToSignIn} className="password-reset-submit">
            Return to sign in
          </Button>
        )}
      </section>
    </main>
  );
}
