/**
 * Agentic Harness — Authentication Service
 * Manages user authentication state, profiles, and persistence.
 */

const AUTH_STORAGE_KEY = 'agentic_harness_user';
const AUTH_API_URL = (import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001').replace(/\/$/, '');

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
    this.currentUser = this.loadStoredUser();
  }

  loadStoredUser() {
    if (window.api) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return DEFAULT_GUEST_USER;
    }
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_GUEST_USER, ...parsed, isAuthenticated: Boolean(parsed.isAuthenticated) };
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored auth user', e);
    }
    return DEFAULT_GUEST_USER;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  setCurrentUser(user, rememberMe = true) {
    if (!user || !user.isAuthenticated) {
      this.currentUser = DEFAULT_GUEST_USER;
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return this.currentUser;
    }

    this.currentUser = { ...DEFAULT_GUEST_USER, ...user, isAuthenticated: true };
    if (window.api) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return this.currentUser;
    }

    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    return this.currentUser;
  }

  clearCurrentUser() {
    this.currentUser = DEFAULT_GUEST_USER;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return this.currentUser;
  }

  async startSocialSignIn(provider) {
    if (!['google', 'github', 'microsoft'].includes(provider)) {
      throw new Error('Unsupported social sign-in provider');
    }

    if (window.api?.openSocialLogin) {
      return window.api.openSocialLogin(provider);
    }

    let response;
    try {
      response = await fetch(`${AUTH_API_URL}/health`, {
        credentials: 'include',
        cache: 'no-store'
      });
    } catch {
      throw new Error('The sign-in service is not running. Configure backend/.env and start it with npm run auth:dev.');
    }
    if (!response.ok) {
      throw new Error('The sign-in service is unavailable. Check the backend configuration and try again.');
    }

    window.location.assign(`${AUTH_API_URL}/auth/${provider}`);
  }

  async getSessionUser() {
    if (window.api?.getAuthUser) {
      const user = await window.api.getAuthUser();
      return user ? { ...user, isAuthenticated: true } : null;
    }

    const response = await fetch(`${AUTH_API_URL}/auth/user`, {
      credentials: 'include',
      cache: 'no-store'
    });
    if (response.status === 401) {
      return null;
    }
    if (!response.ok) {
      throw new Error('Unable to restore the social login session');
    }
    return { ...(await response.json()), isAuthenticated: true };
  }

  async signIn({ email, password, rememberMe }) {
    const user = await this.requestAuth('/login', { email, password });
    return this.setCurrentUser(user, rememberMe !== false);
  }

  async requestAuth(route, data) {
    if (window.api?.authenticate) {
      const action = route === '/login' ? 'login' : 'signup';
      const user = await window.api.authenticate({ action, ...data });
      return this.setCurrentUser(user, true);
    }

    let response;
    try {
      response = await fetch(`${AUTH_API_URL}/auth${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
    } catch {
      throw new Error('The sign-in service is not running. Configure backend/.env and start it with npm run auth:dev.');
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = result?.error || result?.message || 'Authentication failed';
      throw new Error(message);
    }
    return result;
  }

  async signUp({ name, email, password }) {
    const user = await this.requestAuth('/signup', { name, email, password });
    return this.setCurrentUser(user, true);
  }

  async signOut() {
    if (this.currentUser?.isAuthenticated && window.api?.logout) {
      await window.api.logout();
    } else if (this.currentUser?.isAuthenticated) {
      const response = await fetch(`${AUTH_API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Unable to sign out of the social login session');
      }
    }
    await new Promise((res) => setTimeout(res, 200));
    return this.clearCurrentUser();
  }
}

export const authService = new AuthService();
