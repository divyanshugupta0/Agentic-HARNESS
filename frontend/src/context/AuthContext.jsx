import React, { createContext, useContext, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin'); // 'signin' | 'signup'

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
        signOut,
        isAuthModalOpen,
        authModalMode,
        openSignInModal,
        openSignUpModal,
        closeAuthModal,
        setAuthModalMode
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

