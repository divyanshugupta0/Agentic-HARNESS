import React from 'react';
import './styles/variables.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/responsive.css';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ChatProvider } from './context/ChatContext';
import { useAuth } from './hooks/useAuth';
import { Workspace } from './pages/Workspace';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

function AppContent() {
  const { authPage, navigateAuthPage, openSignInModal } = useAuth();

  if (authPage === '/forgot-password') {
    return (
      <ForgotPasswordPage
        onBackToSignIn={() => {
          navigateAuthPage('/');
          openSignInModal();
        }}
      />
    );
  }
  if (authPage === '/reset-password') {
    return (
      <ResetPasswordPage
        onBackToSignIn={() => {
          navigateAuthPage('/');
          openSignInModal();
        }}
        onResetComplete={() => {
          navigateAuthPage('/');
          openSignInModal();
        }}
      />
    );
  }

  return (
    <WorkspaceProvider>
      <ChatProvider>
        <Workspace />
      </ChatProvider>
    </WorkspaceProvider>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
