const assert = require('node:assert/strict');
const test = require('node:test');
const { createAuthenticatedSessionVerifier } = require('../src/main/authSession');

test('requires a valid authenticated backend session', async () => {
  let requestUrl;
  let requestOptions;
  const verify = createAuthenticatedSessionVerifier({
    apiUrl: 'http://localhost:3001',
    fetchImpl: async (url, options) => {
      requestUrl = url.toString();
      requestOptions = options;
      return {
        status: 200,
        ok: true,
        json: async () => ({
          id: 'user-1',
          isAuthenticated: true
        })
      };
    }
  });

  const user = await verify();

  assert.equal(requestUrl, 'http://localhost:3001/auth/user');
  assert.equal(requestOptions.credentials, 'include');
  assert.equal(requestOptions.cache, 'no-store');
  assert.equal(user.id, 'user-1');
});

test('rejects unauthenticated sessions', async () => {
  const verify = createAuthenticatedSessionVerifier({
    apiUrl: 'http://localhost:3001',
    fetchImpl: async () => ({ status: 401, ok: false })
  });

  await assert.rejects(verify, /Sign in to use the desktop harness/);
});

test('rejects invalid session responses', async () => {
  const verify = createAuthenticatedSessionVerifier({
    apiUrl: 'http://localhost:3001',
    fetchImpl: async () => ({
      status: 200,
      ok: true,
      json: async () => ({ id: 'user-1', isAuthenticated: false })
    })
  });

  await assert.rejects(verify, /invalid session response/);
});

test('requires the authentication API URL to be an origin', () => {
  assert.throws(() => createAuthenticatedSessionVerifier({
    apiUrl: 'http://localhost:3001/auth',
    fetchImpl: async () => ({})
  }), /must be an HTTP\(S\) origin/);
});
