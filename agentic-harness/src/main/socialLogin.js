const SUPPORTED_PROVIDERS = new Set(['google', 'github', 'microsoft']);

function createSocialLoginHandler({
  apiUrl,
  fetchImpl,
  openExternal,
  pollIntervalMs = 1000,
  timeoutMs = 300000
}) {
  const baseUrl = new URL(apiUrl);
  if (!['http:', 'https:'].includes(baseUrl.protocol)
    || baseUrl.username
    || baseUrl.password
    || (baseUrl.pathname !== '/' && baseUrl.pathname !== '')
    || baseUrl.search
    || baseUrl.hash) {
    throw new Error('AUTH_API_URL must be an HTTP(S) origin');
  }

  return async function openSocialLogin(provider) {
    if (!SUPPORTED_PROVIDERS.has(provider)) {
      throw new Error('Unsupported social sign-in provider');
    }

    let response;
    try {
      response = await fetchImpl(new URL('/auth/desktop/start', baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider }),
        signal: AbortSignal.timeout(3000)
      });
    } catch {
      throw new Error('The sign-in service is not running. Configure backend/.env and start it with npm run auth:dev.');
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'The sign-in service is unavailable. Check the backend configuration and try again.');
    }

    const { ticket, authUrl } = await response.json();
    const loginUrl = new URL(authUrl);
    if (loginUrl.origin !== baseUrl.origin || loginUrl.pathname !== `/auth/${provider}`) {
      throw new Error('The sign-in service returned an invalid login URL.');
    }
    if (typeof ticket !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) {
      throw new Error('The sign-in service returned an invalid desktop sign-in ticket.');
    }
    await openExternal(loginUrl.toString());

    const expiresAt = Date.now() + timeoutMs;
    while (Date.now() < expiresAt) {
      let pollResponse;
      try {
        pollResponse = await fetchImpl(new URL('/auth/desktop/poll', baseUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ticket })
        });
      } catch {
        throw new Error('Lost connection to the sign-in service while waiting for authentication.');
      }

      if (pollResponse.status === 202) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        continue;
      }
      if (pollResponse.status === 410) {
        throw new Error('Desktop sign-in expired. Please try again.');
      }
      if (!pollResponse.ok) {
        throw new Error('Unable to complete desktop sign-in.');
      }
      const result = await pollResponse.json();
      if (result.status !== 'complete' || !result.user?.id || !result.user?.provider) {
        throw new Error('The sign-in service returned an invalid user session.');
      }
      return result.user;
    }

    throw new Error('Desktop sign-in timed out. Please try again.');
  };
}

module.exports = { createSocialLoginHandler };
