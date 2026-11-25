import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getFirebaseAuthError } from '../../firebase/auth';

const providers = ['Google', 'Microsoft', 'GitHub', 'Facebook'];

export function AuthProviders({ passwordCredentials }) {
  const [message, setMessage] = useState('');
  const { socialAuthMessage, setSocialAuthMessage, startSocialSignIn } = useAuth();

  return (
    <div className="auth-providers">
      <div className="auth-providers__divider">
        <span>or continue with</span>
      </div>
      <div className="auth-providers__buttons">
        {providers.map((provider) => (
          <button
            className="auth-providers__button"
            key={provider}
            type="button"
            onClick={async () => {
              setMessage('');
              setSocialAuthMessage('');
              try {
                await startSocialSignIn(provider.toLowerCase(), passwordCredentials);
                if (window.api?.openSocialLogin) {
                  setMessage(`Continue ${provider} sign-in in your browser.`);
                }
              } catch (error) {
                setMessage(getFirebaseAuthError(error, provider.toLowerCase()));
              }
            }}
          >
            {provider === 'Google' && (
              <svg className="auth-providers__brand-mark" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#4285F4" d="M43.6 20.5H42V20H24v8h11.3A12 12 0 0 1 24 36a12 12 0 1 1 8.5-20.5l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z" />
                <path fill="#34A853" d="M24 44c5.4 0 10.3-2.1 14-5.6l-6.5-5.5A12 12 0 0 1 24 36a12 12 0 0 1-11.3-8l-7 5.4A20 20 0 0 0 24 44Z" />
                <path fill="#FBBC05" d="M12.7 28a12 12 0 0 1 0-8l-7-5.4a20 20 0 0 0 0 18.8l7-5.4Z" />
                <path fill="#EA4335" d="M24 12a12 12 0 0 1 8.5 3.5l5.7-5.7A20 20 0 0 0 5.7 14.6l7 5.4A12 12 0 0 1 24 12Z" />
              </svg>
            )}
            {provider === 'GitHub' && (
              <svg className="auth-providers__brand-mark" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.02c-3.22.7-3.9-1.55-3.9-1.55-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.57-.29-5.28-1.29-5.28-5.74 0-1.27.45-2.31 1.19-3.12-.12-.29-.52-1.47.11-3.07 0 0 .97-.31 3.17 1.19a11 11 0 0 1 5.77 0c2.2-1.5 3.17-1.19 3.17-1.19.63 1.6.23 2.78.11 3.07.74.81 1.19 1.85 1.19 3.12 0 4.46-2.71 5.44-5.29 5.73.42.36.78 1.07.78 2.16v3.22c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
              </svg>
            )}
            {provider === 'Facebook' && (
              <svg className="auth-providers__brand-mark" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="12" fill="#1877F2" />
                <path fill="#fff" d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.7v1.7h-3v3.1h3v8h3.9Z" />
              </svg>
            )}
            {provider === 'Microsoft' && (
              <span className="auth-providers__microsoft-mark" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
            )}
            <span>Continue with {provider}</span>
          </button>
        ))}
      </div>
      {(message || socialAuthMessage) && (
        <p className="auth-providers__message" role="status">
          {message || socialAuthMessage}
        </p>
      )}
    </div>
  );
}
