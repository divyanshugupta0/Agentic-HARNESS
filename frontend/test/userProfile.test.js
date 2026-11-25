import assert from 'node:assert/strict';
import test from 'node:test';
import { mapFirebaseUser } from '../src/utils/userProfile.js';

test('uses the current provider profile before stale backend values', () => {
  const user = mapFirebaseUser({
    uid: 'user-1',
    email: null,
    displayName: null,
    photoURL: null,
    emailVerified: true,
    providerData: [{
      providerId: 'github.com',
      displayName: 'GitHub Name',
      email: 'github@example.com',
      photoURL: 'https://example.com/github.png'
    }]
  }, {
    fullName: 'Old Name',
    email: 'old@example.com',
    profilePicture: 'https://example.com/old.png',
    authProvider: 'google.com'
  });

  assert.equal(user.name, 'GitHub Name');
  assert.equal(user.email, 'github@example.com');
  assert.equal(user.avatar, 'https://example.com/github.png');
  assert.equal(user.authProvider, 'github.com');
});

test('falls back to the stored profile when provider details are absent', () => {
  const user = mapFirebaseUser({
    uid: 'user-2',
    email: '',
    emailVerified: false,
    providerData: [{ providerId: 'google.com' }]
  }, {
    fullName: 'Saved Name',
    email: 'saved@example.com',
    profilePicture: 'https://example.com/saved.png',
    authProvider: 'google.com'
  });

  assert.equal(user.name, 'Saved Name');
  assert.equal(user.email, 'saved@example.com');
  assert.equal(user.avatar, 'https://example.com/saved.png');
  assert.equal(user.isAuthenticated, true);
});

test('uses the provider used for this sign-in when multiple providers are linked', () => {
  const user = mapFirebaseUser({
    uid: 'user-4',
    email: 'linked@example.com',
    displayName: 'Linked User',
    emailVerified: true,
    providerData: [
      { providerId: 'google.com' },
      { providerId: 'github.com' }
    ]
  }, undefined, 'github.com');

  assert.equal(user.role, 'github.com');
  assert.equal(user.authProvider, 'github.com');
});

test('uses the saved Firebase display name for email and password accounts', () => {
  const user = mapFirebaseUser({
    uid: 'user-3',
    email: 'ada@example.com',
    displayName: 'Ada Lovelace',
    photoURL: null,
    emailVerified: true,
    providerData: [{
      providerId: 'password',
      displayName: 'Ada Lovelace',
      email: 'ada@example.com'
    }]
  });

  assert.equal(user.name, 'Ada Lovelace');
  assert.equal(user.email, 'ada@example.com');
  assert.equal(user.avatar, null);
});
