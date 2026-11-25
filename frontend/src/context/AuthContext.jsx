import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import {
  firebaseLinkProviderWithPassword,
  firebaseSocialSignIn
} from '../firebase/auth';
import { mapFirebaseUser } from '../utils/userProfile';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin'); // 'signin' | 'signup'
  const [socialAuthMessage, setSocialAuthMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('auth');
    if (result === 'error') {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
      setSocialAuthMessage('Social sign-in failed. Please try again.');
      setAuthModalMode('signin');
      setIsAuthModalOpen(true);
      return;
    }
    if (result && result !== 'success') {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
      return;
    }
    if (result === 'success') {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
    } else if (!window.api?.getAuthUser && !['http:', 'https:'].includes(window.location.protocol)) {
      return;
    }

    authService.getSessionUser()
      .then((sessionUser) => {
        if (!sessionUser) {
          authService.clearCurrentUser();
          setUser(authService.getCurrentUser());
          if (result === 'success') {
            setSocialAuthMessage('The social login session was not established. Please try again.');
            setAuthModalMode('signin');
            setIsAuthModalOpen(true);
          }
          return;
        }
        authService.setCurrentUser(sessionUser);
        setUser({ ...sessionUser });
        setIsAuthModalOpen(false);
      })
      .catch((error) => {
        console.error('Failed to restore social login session:', error);
        authService.clearCurrentUser();
        setUser(authService.getCurrentUser());
        if (result === 'success') {
          setSocialAuthMessage('Unable to complete sign-in. Please try again.');
          setAuthModalMode('signin');
          setIsAuthModalOpen(true);
        }
      });
  }, []);

  const signIn = async (credentials) => {
    const loggedInUser = await authService.signIn(credentials);
    setUser({ ...loggedInUser });
    setIsAuthModalOpen(false);
    return loggedInUser;
  };

  const signUp = async (data) => {
    const newUser = await authService.signUp(data);
    setUser({ ...newUser });
    setIsAuthModalOpen(false);
    return newUser;
  };

  const startSocialSignIn = async (provider, passwordCredentials) => {
    if (!window.api?.openSocialLogin) {
      let credential;
      try {
        credential = await firebaseSocialSignIn(provider);
      } catch (error) {
        if (!['facebook', 'github'].includes(provider)
          || error.code !== 'auth/account-exists-with-different-credential'
          || !passwordCredentials?.email?.trim()
          || !passwordCredentials.password) {
          throw error;
        }

        const firebaseUser = await firebaseLinkProviderWithPassword(
          provider,
          passwordCredentials.email,
          passwordCredentials.password,
          error
        );
        const linkedUser = mapFirebaseUser(firebaseUser, undefined, `${provider}.com`);
        authService.setCurrentUser(linkedUser);
        setUser(linkedUser);
        setIsAuthModalOpen(false);
        setSocialAuthMessage('');
        return linkedUser;
      }

      if (credential?.user) {
        const loggedInUser = mapFirebaseUser(
          credential.user,
          undefined,
          credential.providerId
        );
        authService.setCurrentUser(loggedInUser);
        setUser(loggedInUser);
        setIsAuthModalOpen(false);
        setSocialAuthMessage('');
        return loggedInUser;
      }
      return null;
    }

    const result = await authService.startSocialSignIn(provider);
    if (result) {
      authService.setCurrentUser({ ...result, isAuthenticated: true });
      setUser({ ...result, isAuthenticated: true });
      setIsAuthModalOpen(false);
    }
    return result;
  };

  const signOut = async () => {
    const guestUser = await authService.signOut();
    setUser({ ...guestUser });
  };

  const openSignInModal = () => {
    setAuthModalMode('signin');
    setIsAuthModalOpen(true);
  };

  const openSignUpModal = () => {
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user?.isAuthenticated || false,
        signIn,
        signUp,
        startSocialSignIn,
        signOut,
        isAuthModalOpen,
        authModalMode,
        socialAuthMessage,
        openSignInModal,
        openSignUpModal,
        closeAuthModal,
        setAuthModalMode,
        setSocialAuthMessage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
