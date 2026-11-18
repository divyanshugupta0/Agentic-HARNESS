function createFirebaseAuthMiddleware(firebaseAdmin) {
  return async function verifyFirebaseToken(req, res, next) {
    if (!firebaseAdmin) {
      return res.status(503).json({ error: 'Firebase Admin is not configured on this server.' });
    }

    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ error: 'A Firebase ID token is required.' });
    }

    try {
      req.firebaseToken = await firebaseAdmin.auth().verifyIdToken(match[1]);
      return next();
    } catch (error) {
      if (['auth/id-token-expired', 'auth/id-token-revoked', 'auth/invalid-id-token', 'auth/argument-error'].includes(error.code)) {
        return res.status(401).json({ error: 'The Firebase ID token is invalid or expired.' });
      }
      return next(error);
    }
  };
}

module.exports = { createFirebaseAuthMiddleware };
