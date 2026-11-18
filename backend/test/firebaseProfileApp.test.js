const assert = require('node:assert/strict');
const test = require('node:test');
const { createFirebaseProfileApp } = require('../src/firebaseProfileApp');
const { createProfileDatabase } = require('../src/profileDatabase');

test('SQLite Firebase profile API verifies tokens and stores profiles', async (t) => {
  const profileDatabase = createProfileDatabase(':memory:');
  const firebaseAdmin = {
    auth: () => ({
      verifyIdToken: async (token) => {
        assert.equal(token, 'valid-test-token');
        return {
          uid: 'firebase-user-1',
          name: 'Test User',
          email: 'test@example.com',
          picture: 'https://example.com/avatar.png',
          email_verified: true,
          firebase: { sign_in_provider: 'github.com' }
        };
      }
    })
  };
  const app = createFirebaseProfileApp({
    frontendUrl: 'http://localhost:5173',
    firebaseAdmin,
    profileDatabase
  });
  const server = app.listen(0);
  t.after(() => {
    server.close();
    profileDatabase.close();
  });

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/auth/sync-user`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid-test-token',
      'Content-Type': 'application/json',
      Origin: 'http://localhost:5173'
    }
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.user.firebaseUid, 'firebase-user-1');
  assert.equal(body.user.email, 'test@example.com');
  assert.equal(body.user.fullName, 'Test User');
  assert.equal(body.user.profilePicture, 'https://example.com/avatar.png');
  assert.equal(body.user.authProvider, 'github.com');
  assert.equal(body.user.emailVerified, true);
  assert.equal(profileDatabase.findByUid('firebase-user-1').email, 'test@example.com');
});

test('SQLite Firebase profile API rejects requests without an ID token', async (t) => {
  const profileDatabase = createProfileDatabase(':memory:');
  const app = createFirebaseProfileApp({
    frontendUrl: 'http://localhost:5173',
    firebaseAdmin: { auth: () => ({}) },
    profileDatabase
  });
  const server = app.listen(0);
  t.after(() => {
    server.close();
    profileDatabase.close();
  });

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/sync-user`, {
    method: 'POST'
  });
  assert.equal(response.status, 401);
});
