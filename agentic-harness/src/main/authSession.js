function createAuthenticatedSessionVerifier({ apiUrl, fetchImpl }) {
  const baseUrl = new URL(apiUrl);
  if (!['http:', 'https:'].includes(baseUrl.protocol)
    || baseUrl.username
    || baseUrl.password
    || (baseUrl.pathname !== '/' && baseUrl.pathname !== '')
    || baseUrl.search
    || baseUrl.hash) {
    throw new Error('AUTH_API_URL must be an HTTP(S) origin');
  }

  return async function requireAuthenticatedSession() {
    let response;
    try {
      response = await fetchImpl(new URL('/auth/user', baseUrl), {
        headers: { Accept: 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      });
    } catch {
      throw new Error('Unable to verify the desktop sign-in session. Check the authentication service.');
    }

    if (response.status === 401) {
      throw new Error('Sign in to use the desktop harness.');
    }
    if (!response.ok) {
      throw new Error('Unable to verify the desktop sign-in session.');
    }

    let user;
    try {
      user = await response.json();
    } catch {
      throw new Error('The authentication service returned an invalid session response.');
    }
    if (!user || typeof user.id !== 'string' || user.isAuthenticated !== true) {
      throw new Error('The authentication service returned an invalid session response.');
    }
    return user;
  };
}

module.exports = { createAuthenticatedSessionVerifier };
