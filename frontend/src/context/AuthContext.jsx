import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { authService } from '../services/authService';
import { syncFirebaseUser } from '../services/userService';
import { isFirebaseConfigured } from '../firebase/firebaseConfig';
import { mapFirebaseUser } from '../utils/userProfile';
import {
  firebasePasswordReset,
  firebaseLinkGithubWithPassword,
  firebaseSignIn,
  firebaseSignOut,
  firebaseSignUp,
  firebaseSocialSignIn,
  getFirebaseAuthError,
  getFirebaseRedirectResult,
  initializeFirebasePersistence,
  subscribeToFirebaseAuth
} from '../firebase/auth';

const AuthContext = createContext(null);
const STORAGE_KEY = 'agentic_harness_user';

const GUEST_USER = {
  id: 'guest',
  name: 'Guest User',
  email: '',
  avatar: null,
  role: 'Guest',
  isAuthenticated: false
};

function getInitialUser() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.isAuthenticated) return parsed;
    }
  } catch (error) {
    console.error('Failed to restore the saved user profile:', error);
  }
  return GUEST_USER;
}

export function AuthProvider({ children }) {
  const [authPage, setAuthPage] = useState(() => window.location.pathname);
  const [user, setUser] = useState(getInitialUser);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin');
  const [socialAuthMessage, setSocialAuthMessage] = useState('');
  const pendingProfileSyncs = useRef(new Map());

  const syncAuthenticatedUser = async (firebaseUser) => {
    const pendingSync = pendingProfileSyncs.current.get(firebaseUser.uid);
    if (pendingSync) return pendingSync;

    const profileSync = window.api?.authenticateFirebase
      ? authService.authenticateFirebase(firebaseUser)
      : syncFirebaseUser(firebaseUser);
    pendingProfileSyncs.current.set(firebaseUser.uid, profileSync);
    try {
      return await profileSync;
    } finally {
      if (pendingProfileSyncs.current.get(firebaseUser.uid) === profileSync) {
        pendingProfileSyncs.current.delete(firebaseUser.uid);
      }
    }
  };

  useEffect(() => {
    const handlePageNavigation = () => setAuthPage(window.location.pathname);
    window.addEventListener('popstate', handlePageNavigation);
    return () => window.removeEventListener('popstate', handlePageNavigation);
  }, []);

  const navigateAuthPage = (path) => {
    if (!['/', '/forgot-password', '/reset-password'].includes(path)) {
      throw new Error('Unsupported authentication page');
    }
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setAuthPage(path);
  };

  useEffect(() => {
    // If Firebase is not configured, run in Local Desktop Workspace mode
    if (!isFirebaseConfigured) {
      const savedUser = getInitialUser();
      if (savedUser.isAuthenticated) {
        setUser(savedUser);
        if (window.api?.sendMessage) {
          window.api.sendMessage('auth:local-login', savedUser);
        }
      }
      setAuthLoading(false);
      return undefined;
    }

    let active = true;
    let unsubscribe;
    let currentUid = null;
    const handleAuthState = async (firebaseUser) => {
      if (!active) return;
      setProfileError('');
      if (!firebaseUser) {
        currentUid = null;
        setUser(GUEST_USER);
        localStorage.removeItem(STORAGE_KEY);
        if (window.api) {
          try {
            await authService.signOut();
          } catch (error) {
            console.error('Failed to clear the verified desktop session:', error);
            if (active) setProfileError(error.message || 'Unable to clear the desktop sign-in session.');
          }
        }
        setAuthLoading(false);
        return;
      }

      currentUid = firebaseUser.uid;
      if (!window.api) {
        setUser(mapFirebaseUser(firebaseUser));
        setIsAuthModalOpen(false);
      }
      try {
        const result = await syncAuthenticatedUser(firebaseUser);
        if (active && currentUid === firebaseUser.uid) {
          const mapped = mapFirebaseUser(firebaseUser, result.user);
          setUser(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          setIsAuthModalOpen(false);
        }
      } catch (error) {
        console.error('Failed to synchronize Firebase profile:', error);
        if (active && currentUid === firebaseUser.uid) {
          setProfileError(error.message || 'Signed in, but unable to load your application profile.');
        }
      } finally {
        if (active && currentUid === firebaseUser.uid) setAuthLoading(false);
      }
    };

    initializeFirebasePersistence()
      .then(async () => {
        let redirectResult;
        try {
          redirectResult = await getFirebaseRedirectResult();
        } catch (error) {
          console.error('Firebase redirect sign-in failed:', error);
          if (active) {
            setSocialAuthMessage(getFirebaseAuthError(error));
            setAuthModalMode('signin');
            setIsAuthModalOpen(true);
          }
        }
        if (!active) return;
        unsubscribe = subscribeToFirebaseAuth(handleAuthState, (error) => {
          console.error('Firebase authentication state failed:', error);
          if (active) {
            setProfileError(getFirebaseAuthError(error));
            setAuthLoading(false);
          }
        });
        if (redirectResult?.user) await handleAuthState(redirectResult.user);
      })
      .catch((error) => {
        console.error('Firebase authentication initialization failed:', error);
        if (active) {
          setProfileError(getFirebaseAuthError(error));
          setAuthLoading(false);
        }
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signIn = async (credentials) => {
    // If Firebase is not configured, authenticate locally
    if (!isFirebaseConfigured) {
      const localUser = {
        id: 'usr_local_' + Math.random().toString(36).substring(2, 9),
        name: credentials.email.split('@')[0] || 'Developer',
        email: credentials.email,
        avatar: null,
        role: 'Local Developer',
        isAuthenticated: true
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localUser));
      if (window.api?.sendMessage) {
        await window.api.sendMessage('auth:local-login', localUser);
      }
      setUser(localUser);
      setIsAuthModalOpen(false);
      setProfileError('');
      setSocialAuthMessage('');
      return localUser;
    }

    const { user: firebaseUser } = await firebaseSignIn(credentials.email, credentials.password);
    const result = await syncAuthenticatedUser(firebaseUser);
    const mapped = mapFirebaseUser(firebaseUser, result.user);
    setUser(mapped);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
    setIsAuthModalOpen(false);
    setSocialAuthMessage('');
    return mapped;
  };

  const signUp = async (data) => {
    // If Firebase is not configured, create a local desktop profile
    if (!isFirebaseConfigured) {
      const localUser = {
        id: 'usr_local_' + Math.random().toString(36).substring(2, 9),
        name: data.name || data.email.split('@')[0] || 'Developer',
        email: data.email,
        avatar: null,
        role: 'Local Developer',
        isAuthenticated: true
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localUser));
      if (window.api?.sendMessage) {
        await window.api.sendMessage('auth:local-login', localUser);
      }
      setUser(localUser);
      setIsAuthModalOpen(false);
      setProfileError('');
      setSocialAuthMessage('');
      return localUser;
    }

    const { user: firebaseUser } = await firebaseSignUp(data.name, data.email, data.password);
    const result = await syncAuthenticatedUser(firebaseUser);
    const mapped = mapFirebaseUser(firebaseUser, result.user);
    setUser(mapped);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
    setIsAuthModalOpen(false);
    setSocialAuthMessage('');
    return mapped;
  };

  const completeSocialSignIn = async (firebaseUser) => {
    if (!window.api) {
      setUser(mapFirebaseUser(firebaseUser));
      setIsAuthModalOpen(false);
    }

    setProfileError('');
    try {
      const result = await syncAuthenticatedUser(firebaseUser);
      setUser(mapFirebaseUser(firebaseUser, result.user));
    } catch (error) {
      if (!window.api) {
        setProfileError(error.message || 'Signed in, but unable to load your application profile.');
      }
      throw error;
    }
    setIsAuthModalOpen(false);
    setSocialAuthMessage('');
  };

  const startSocialSignIn = async (provider, passwordCredentials) => {
    if (!isFirebaseConfigured) {
      const localUser = {
        id: 'usr_' + provider.toLowerCase() + '_' + Math.random().toString(36).substring(2, 9),
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
        email: `${provider.toLowerCase()}@local.desktop`,
        avatar: null,
        role: `${provider} Developer`,
        isAuthenticated: true
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localUser));
      if (window.api?.sendMessage) {
        await window.api.sendMessage('auth:local-login', localUser);
      }
      setUser(localUser);
      setIsAuthModalOpen(false);
      setProfileError('');
      setSocialAuthMessage('');
      return;
    }

    let credential;
    try {
      credential = await firebaseSocialSignIn(provider);
    } catch (error) {
      if (provider !== 'github'
        || error.code !== 'auth/account-exists-with-different-credential'
        || !passwordCredentials?.email?.trim()
        || !passwordCredentials.password) {
        throw error;
      }

      const firebaseUser = await firebaseLinkGithubWithPassword(
        passwordCredentials.email,
        passwordCredentials.password,
        error
      );
      await completeSocialSignIn(firebaseUser);
      return;
    }

    if (credential?.user) {
      await completeSocialSignIn(credential.user);
      return;
    }
    setIsAuthModalOpen(false);
    setSocialAuthMessage('');
  };

  const sendPasswordReset = async (email) => {
    if (!isFirebaseConfigured) {
      throw new Error('Password reset is unavailable in local offline mode.');
    }
    await firebasePasswordReset(email);
  };

  const signOut = async () => {
    if (isFirebaseConfigured) await firebaseSignOut();
    localStorage.removeItem(STORAGE_KEY);
    if (window.api?.logout) await window.api.logout();
    setUser(GUEST_USER);
  };

  const openSignInModal = () => {
    navigateAuthPage('/');
    setAuthModalMode('signin');
    setIsAuthModalOpen(true);
  };

  const openSignUpModal = () => {
    navigateAuthPage('/');
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    if (window.api && !user?.isAuthenticated) return;
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authPage,
        navigateAuthPage,
        isAuthenticated: user?.isAuthenticated || false,
        authLoading,
        profileError,
        signIn,
        signUp,
        startSocialSignIn,
        sendPasswordReset,
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
