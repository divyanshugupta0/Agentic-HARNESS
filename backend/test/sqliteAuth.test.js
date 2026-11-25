const assert = require('node:assert/strict');
const test = require('node:test');
const Database = require('better-sqlite3');
const { loadConfig } = require('../src/config');
const { createDesktopAuthStore } = require('../src/desktopAuth');
const { SQLiteSessionStore } = require('../src/sqliteSessionStore');
const { createUserRepository, verifyPassword } = require('../src/users');

function callStore(store, method, ...args) {
  return new Promise((resolve, reject) => {
    store[method](...args, (error, value) => {
      if (error) reject(error);
      else resolve(value);
    });
  });
}

test('auth config defaults to SQLite without requiring MongoDB', () => {
  const config = loadConfig({
    SESSION_SECRET: 'a-session-secret-with-at-least-32-bytes',
    FRONTEND_URL: 'http://localhost:5173'
  });
  assert.match(config.databasePath, /backend[\\/]database[\\/]app\.db$/);
});

test('SQLite user repository supports password and social accounts', async () => {
  const database = new Database(':memory:');
  try {
    const users = createUserRepository(database);
    await users.initialize();
    const created = await users.createPasswordUser({
      name: 'Test User',
      email: 'test@example.com',
      password: 'a-long-test-password'
    });
    const account = await users.findPasswordUser('test@example.com');
    assert.equal(created.id, account.id);
    assert.equal(await verifyPassword('a-long-test-password', account.passwordHash), true);
    await assert.rejects(
      users.createPasswordUser({
        name: 'Duplicate User',
        email: 'test@example.com',
        password: 'another-long-password'
      }),
      { code: 'USER_EMAIL_TAKEN' }
    );

    const socialUser = await users.upsertProviderUser('github', {
      id: 'github-123',
      name: 'GitHub User',
      email: 'social@example.com'
    });
    const updatedSocialUser = await users.upsertProviderUser('github', {
      id: 'github-123',
      name: 'Updated GitHub User',
      email: 'social@example.com'
    });
    assert.equal(updatedSocialUser.id, socialUser.id);
    assert.equal(updatedSocialUser.name, 'Updated GitHub User');
  } finally {
    database.close();
  }
});

test('SQLite desktop handoffs are single-use and expire', async () => {
  const database = new Database(':memory:');
  try {
    const desktopAuth = createDesktopAuthStore(database);
    await desktopAuth.initialize();
    const ticket = await desktopAuth.create();
    assert.deepEqual(await desktopAuth.poll(ticket), { status: 'pending' });
    const user = { id: 'user-123', provider: 'google' };
    assert.equal(await desktopAuth.complete(ticket, user), true);
    assert.deepEqual(await desktopAuth.poll(ticket), { status: 'complete', user });
    assert.deepEqual(await desktopAuth.poll(ticket), { status: 'expired' });

    const expiredTicket = await desktopAuth.create(-1);
    assert.deepEqual(await desktopAuth.poll(expiredTicket), { status: 'expired' });
  } finally {
    database.close();
  }
});

test('SQLite session store reads and destroys persisted sessions', async () => {
  const database = new Database(':memory:');
  try {
    const store = new SQLiteSessionStore(database);
    const sessionData = {
      cookie: { expires: new Date(Date.now() + 60_000) },
      passport: { user: { id: 'user-123' } }
    };
    await callStore(store, 'set', 'session-123', sessionData);
    assert.deepEqual(await callStore(store, 'get', 'session-123'), sessionData);
    await callStore(store, 'destroy', 'session-123');
    assert.equal(await callStore(store, 'get', 'session-123'), null);
  } finally {
    database.close();
  }
});
