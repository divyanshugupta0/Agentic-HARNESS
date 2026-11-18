/**
 * Agentic Harness — Authentication Service
 * Manages user authentication state, profiles, and persistence.
 */

const DEFAULT_GUEST_USER = {
  id: 'guest',
  name: 'Guest User',
  email: '',
  avatar: null,
  role: 'Guest',
  isAuthenticated: false
};

class AuthService {
  constructor() {
    this.currentUser = DEFAULT_GUEST_USER;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  setCurrentUser(user) {
    if (!user || !user.isAuthenticated) {
      this.currentUser = DEFAULT_GUEST_USER;
      return this.currentUser;
    }

    this.currentUser = { ...DEFAULT_GUEST_USER, ...user, isAuthenticated: true };
    return this.currentUser;
  }

  clearCurrentUser() {
    this.currentUser = DEFAULT_GUEST_USER;
    return this.currentUser;
  }

  async authenticateFirebase(firebaseUser) {
    if (!window.api?.authenticateFirebase) {
      throw new Error('Firebase verification is unavailable in the desktop app.');
    }
    const idToken = await firebaseUser.getIdToken();
    const user = await window.api.authenticateFirebase(idToken);
    return { user: this.setCurrentUser({ ...user, isAuthenticated: true }) };
  }

  async signOut() {
    if (window.api?.logout) {
      await window.api.logout();
    }
    return this.clearCurrentUser();
  }
}

export const authService = new AuthService();
