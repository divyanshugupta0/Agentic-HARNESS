import { useAuth as useAuthContext } from '../context/AuthContext';

/**
 * Custom hook to access authentication state and controls
 * @returns {{
 *   user: Object,
 *   isAuthenticated: boolean,
 *   signIn: Function,
 *   signUp: Function,
 *   signOut: Function,
 *   isAuthModalOpen: boolean,
 *   authModalMode: string,
 *   openSignInModal: Function,
 *   openSignUpModal: Function,
 *   closeAuthModal: Function,
 *   setAuthModalMode: Function
 * }}
 */
export function useAuth() {
  return useAuthContext();
}
