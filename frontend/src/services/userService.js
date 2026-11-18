import { isFirebaseConfigured } from '../firebase/firebaseConfig';

const USER_API_URL = (import.meta.env.VITE_USER_API_URL || 'http://localhost:3001').replace(/\/$/, '');

async function request(path, user, options = {}) {
  if (!isFirebaseConfigured || !user) {
    throw new Error('A signed-in Firebase user is required to access the profile service.');
  }
  const idToken = await user.getIdToken();
  let response;
  try {
    response = await fetch(`${USER_API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
        ...options.headers
      }
    });
  } catch {
    throw new Error('The profile service is unavailable. Start the backend and check VITE_USER_API_URL.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || 'Unable to load your account profile.');
  }
  return result;
}

export function syncFirebaseUser(user) {
  return request('/api/auth/sync-user', user, { method: 'POST' });
}

export function fetchFirebaseProfile(user) {
  return request('/api/users/profile', user);
}

export function updateFirebaseProfile(user, profile) {
  return request('/api/users/profile', user, {
    method: 'PUT',
    body: JSON.stringify(profile)
  });
}

export function signOutFirebaseSession() {
  return Promise.resolve();
}
