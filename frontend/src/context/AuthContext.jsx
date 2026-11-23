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
const GUEST_USER = {
  id: 'guest',
  name: 'Guest User',
  email: '',
  avatar: null,
  role: 'Guest',
  isAuthenticated: false
};

export function AuthProvider({ children }) {
  const [authPage, setAuthPage] = useState(() => window.location.pathname);
  const [user, setUser] = useState(GUEST_USER);
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
    if (!isFirebaseConfigured) {
      if (window.api) {
        setProfileError('Firebase is not configured. Add the VITE_FIREBASE_* values to frontend/.env and rebuild the desktop app.');
        setIsAuthModalOpen(true);
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
        if (window.api) {
          try {
            await authService.signOut();
          } catch (error) {
            console.error('Failed to clear the verified desktop session:', error);
            if (active) setProfileError(error.message || 'Unable to clear the desktop sign-in session.');
          }
          setIsAuthModalOpen(true);
        }
        setAuthLoading(false);
        return;
      }

      currentUid = firebaseUser.uid;
      if (window.api) {
        setUser(GUEST_USER);
        setIsAuthModalOpen(true);
      } else {
        setUser(mapFirebaseUser(firebaseUser));
        setIsAuthModalOpen(false);
      }
      try {
        const result = await syncAuthenticatedUser(firebaseUser);
        if (active && currentUid === firebaseUser.uid) {
          setUser(mapFirebaseUser(firebaseUser, result.user));
          setIsAuthModalOpen(false);
        }
      } catch (error) {
        console.error('Failed to synchronize Firebase profile:', error);
        if (active && currentUid === firebaseUser.uid) {
          if (window.api) {
            setUser(GUEST_USER);
            setIsAuthModalOpen(true);
          }
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
            if (window.api) setIsAuthModalOpen(true);
            setAuthLoading(false);
          }
        });
        if (redirectResult?.user) await handleAuthState(redirectResult.user);
      })
      .catch((error) => {
        console.error('Firebase authentication initialization failed:', error);
        if (active) {
          setProfileError(getFirebaseAuthError(error));
          if (window.api) setIsAuthModalOpen(true);
          setAuthLoading(false);
        }
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signIn = async (credentials) => {
    const { user: firebaseUser } = await firebaseSignIn(credentials.email, credentials.password);
    const result = await syncAuthenticatedUser(firebaseUser);
    setUser(mapFirebaseUser(firebaseUser, result.user));
    setIsAuthModalOpen(false);
    setSocialAuthMessage('');
  };

  const signUp = async (data) => {
    const { user: firebaseUser } = await firebaseSignUp(data.name, data.email, data.password);
    const result = await syncAuthenticatedUser(firebaseUser);
    setUser(mapFirebaseUser(firebaseUser, result.user));
    setIsAuthModalOpen(false);
    setSocialAuthMessage('');
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
    await firebasePasswordReset(email);
  };

  const signOut = async () => {
    await firebaseSignOut();
    if (window.api) await authService.signOut();
    setUser(GUEST_USER);
    if (window.api) setIsAuthModalOpen(true);
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
