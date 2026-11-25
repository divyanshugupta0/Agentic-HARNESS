const { applicationDefault, cert, getApp, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

function createFirebaseAdmin(env = process.env) {
  const projectId = env.FIREBASE_ADMIN_PROJECT_ID || env.FIREBASE_PROJECT_ID || env.GCLOUD_PROJECT;
  const hasCredentials = Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON || env.GOOGLE_APPLICATION_CREDENTIALS);

  if (!hasCredentials && !projectId) {
    return null;
  }

  let credential;
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON');
    }
    credential = cert(serviceAccount);
  } else if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = applicationDefault();
  }

  const app = getApps().length
    ? getApp()
    : initializeApp({
        ...(credential ? { credential } : {}),
        ...(projectId ? { projectId } : {})
      });
  return { auth: () => getAuth(app) };
}

module.exports = { createFirebaseAdmin };
