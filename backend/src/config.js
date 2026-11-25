const path = require('node:path');
const { URL } = require('node:url');

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function absoluteUrl(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${name} must use http or https`);
  }
  return url.toString().replace(/\/$/, '');
}

function providerConfig(env, name, port) {
  const prefix = name.toUpperCase();
  const clientID = env[`${prefix}_CLIENT_ID`]?.trim() || '';
  const clientSecret = env[`${prefix}_CLIENT_SECRET`]?.trim() || '';
  if (Boolean(clientID) !== Boolean(clientSecret)) {
    throw new Error(`${prefix}_CLIENT_ID and ${prefix}_CLIENT_SECRET must both be configured`);
  }
  return {
    enabled: Boolean(clientID),
    clientID,
    clientSecret,
    callbackURL: absoluteUrl(
      env[`${prefix}_CALLBACK_URL`] || `http://localhost:${port}/auth/${name}/callback`,
      `${prefix}_CALLBACK_URL`
    )
  };
}

function loadConfig(env = process.env) {
  const sessionSecret = required(env, 'SESSION_SECRET');
  if (Buffer.byteLength(sessionSecret) < 32) {
    throw new Error('SESSION_SECRET must be at least 32 bytes long');
  }

  const sameSite = (env.SESSION_COOKIE_SAME_SITE || 'lax').toLowerCase();
  if (!['lax', 'strict', 'none'].includes(sameSite)) {
    throw new Error('SESSION_COOKIE_SAME_SITE must be lax, strict, or none');
  }

  const frontendUrl = absoluteUrl(required(env, 'FRONTEND_URL'), 'FRONTEND_URL');
  const frontend = new URL(frontendUrl);
  if (frontend.pathname !== '/' || frontend.search || frontend.hash) {
    throw new Error('FRONTEND_URL must be an origin without a path, query, or fragment');
  }

  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const authPublicUrl = absoluteUrl(
    env.AUTH_PUBLIC_URL || `http://localhost:${port}`,
    'AUTH_PUBLIC_URL'
  );
  const authPublicOrigin = new URL(authPublicUrl);
  if (authPublicOrigin.pathname !== '/' || authPublicOrigin.search || authPublicOrigin.hash) {
    throw new Error('AUTH_PUBLIC_URL must be an origin without a path, query, or fragment');
  }

  const microsoftTenant = (env.MICROSOFT_TENANT || 'common').trim();
  if (!/^(common|organizations|consumers|[a-zA-Z0-9.-]+)$/.test(microsoftTenant)) {
    throw new Error('MICROSOFT_TENANT must be common, organizations, consumers, a tenant ID, or a verified domain');
  }

  return {
    port,
    databasePath: path.resolve(__dirname, '..', env.AUTH_DATABASE_PATH || path.join('database', 'app.db')),
    authPublicUrl,
    isProduction: env.NODE_ENV === 'production',
    frontendUrl,
    sessionSecret,
    sameSite,
    trustProxy: env.TRUST_PROXY === 'true',
    google: providerConfig(env, 'google', port),
    github: providerConfig(env, 'github', port),
    microsoft: {
      ...providerConfig(env, 'microsoft', port),
      tenant: microsoftTenant
    }
  };
}

module.exports = { loadConfig };
