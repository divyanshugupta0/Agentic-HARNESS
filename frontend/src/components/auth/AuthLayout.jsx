import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../common/Modal';
import { SignIn } from './SignIn';
import { SignUp } from './SignUp';

export function AuthLayout() {
  const { isAuthModalOpen, closeAuthModal, authModalMode, setAuthModalMode } = useAuth();

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      title={authModalMode === 'signin' ? 'Sign In to Agentic Harness' : 'Create Agentic Harness Profile'}
      id="auth-modal"
    >
      {authModalMode === 'signin' ? (
        <SignIn onSwitchMode={() => setAuthModalMode('signup')} />
      ) : (
        <SignUp onSwitchMode={() => setAuthModalMode('signin')} />
      )}
    </Modal>
  );
}
