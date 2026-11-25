const admin = require('firebase-admin');

function createFirebaseAdmin(env = process.env) {
  const projectId = env.FIREBASE_ADMIN_PROJECT_ID || env.FIREBASE_PROJECT_ID || env.GCLOUD_PROJECT;
  const hasCredentials = Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON || env.GOOGLE_APPLICATION_CREDENTIALS || projectId);

  if (!hasCredentials) {
    return null;
  }

  if (admin.apps.length) {
    return admin;
  }

  let credential;
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON');
    }
    credential = admin.credential.cert(serviceAccount);
  } else {
    credential = admin.credential.applicationDefault();
  }

  admin.initializeApp({
    credential,
    ...(projectId ? { projectId } : {})
  });
  return admin;
}

module.exports = { createFirebaseAdmin };
