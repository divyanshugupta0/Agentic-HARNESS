const assert = require('node:assert/strict');
const test = require('node:test');
const { createFirebaseAdmin } = require('../src/firebaseAdmin');

test('Firebase Admin initializes token verification with project ID only', async () => {
  const firebaseAdmin = createFirebaseAdmin({
    FIREBASE_ADMIN_PROJECT_ID: 'agentic-ai-harness'
  });

  assert.equal(typeof firebaseAdmin.auth().verifyIdToken, 'function');
  await assert.rejects(firebaseAdmin.auth().verifyIdToken('not-a-firebase-token'));
});
