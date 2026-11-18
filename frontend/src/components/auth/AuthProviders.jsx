import React, { useState } from 'react';
import { Github } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getFirebaseAuthError } from '../../firebase/auth';

const providers = ['Google', 'Microsoft', 'GitHub'];

export function AuthProviders() {
  const [message, setMessage] = useState('');
  const [loadingProvider, setLoadingProvider] = useState('');
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
            disabled={Boolean(loadingProvider)}
            onClick={async () => {
              setMessage('');
              setSocialAuthMessage('');
              setLoadingProvider(provider);
              try {
                await startSocialSignIn(provider.toLowerCase());
              } catch (error) {
                setMessage(getFirebaseAuthError(error));
              } finally {
                setLoadingProvider('');
              }
            }}
          >
            {provider === 'Google' && <span className="auth-providers__google-mark" aria-hidden="true">G</span>}
            {provider === 'GitHub' && <Github size={17} aria-hidden="true" />}
            {provider === 'Microsoft' && (
              <span className="auth-providers__microsoft-mark" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
            )}
            <span>{loadingProvider === provider ? 'Connecting...' : `Continue with ${provider}`}</span>
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
