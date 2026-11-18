const path = require('node:path');
const dotenv = require('dotenv');
const { createFirebaseProfileApp } = require('./firebaseProfileApp');
const { createFirebaseAdmin } = require('./firebaseAdmin');
const { createProfileDatabase } = require('./profileDatabase');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getFrontendOrigin() {
  let url;
  try {
    url = new URL(required('FRONTEND_URL'));
  } catch {
    throw new Error('FRONTEND_URL must be an absolute URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('FRONTEND_URL must be an http(s) origin without a path, query, or fragment');
  }
  return url.origin;
}

async function start() {
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const firebaseAdmin = createFirebaseAdmin();
  if (!firebaseAdmin) {
    throw new Error('Set FIREBASE_ADMIN_PROJECT_ID to the Firebase project ID before starting the SQLite profile API.');
  }

  const profileDatabase = createProfileDatabase(
    process.env.FIREBASE_PROFILE_DB_PATH
      ? path.resolve(process.env.FIREBASE_PROFILE_DB_PATH)
      : undefined
  );
  const app = createFirebaseProfileApp({
    frontendUrl: getFrontendOrigin(),
    firebaseAdmin,
    profileDatabase
  });
  const server = app.listen(port, () => {
    console.log(`Firebase profile API (SQLite) listening on port ${port}`);
  });

  const shutdown = () => {
    server.close(() => {
      profileDatabase.close();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error('Firebase profile API failed to start:', error);
  process.exitCode = 1;
});
