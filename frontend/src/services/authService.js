/**
 * Agentic Harness — Authentication Service
 * Manages user authentication state, profiles, and persistence.
 */

const AUTH_STORAGE_KEY = 'agentic_harness_user';

const DEFAULT_DEMO_USER = {
  id: 'usr_dev_01',
  name: 'Alex Developer',
  email: 'alex@agenticharness.local',
  avatar: null,
  role: 'AI Systems Architect',
  isAuthenticated: true,
  createdAt: new Date().toISOString()
};

class AuthService {
  constructor() {
    this.currentUser = this.loadStoredUser();
  }

  loadStoredUser() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse stored auth user', e);
    }
    return DEFAULT_DEMO_USER;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  async signIn({ email, password, rememberMe }) {
    // Simulating authentication delay
    await new Promise((res) => setTimeout(res, 400));

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: email.split('@')[0],
      email,
      avatar: null,
      role: 'Engineer',
      isAuthenticated: true,
      lastLogin: new Date().toISOString()
    };

    this.currentUser = user;
    if (rememberMe !== false) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
    return user;
  }

  async signUp({ name, email, password }) {
    await new Promise((res) => setTimeout(res, 400));

    if (!email || !password || !name) {
      throw new Error('Name, email, and password are required');
    }

    const user = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name,
      email,
      avatar: null,
      role: 'Member',
      isAuthenticated: true,
      createdAt: new Date().toISOString()
    };

    this.currentUser = user;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return user;
  }

  async signOut() {
    await new Promise((res) => setTimeout(res, 200));
    this.currentUser = {
      id: 'guest',
      name: 'Guest User',
      email: '',
      avatar: null,
      role: 'Guest',
      isAuthenticated: false
    };
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return this.currentUser;
  }
}

export const authService = new AuthService();
