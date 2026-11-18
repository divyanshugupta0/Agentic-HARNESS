const express = require('express');
const { createFirebaseAuthMiddleware } = require('../middleware/firebaseAuth');

function toPublicProfile(user) {
  return {
    id: user.id,
    firebaseUid: user.firebase_uid,
    fullName: user.full_name,
    email: user.email,
    profilePicture: user.profile_picture,
    authProvider: user.auth_provider,
    emailVerified: Boolean(user.email_verified),
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
}

function createProfileRouter(firebaseAdmin, profileDatabase) {
  const router = express.Router();
  const requireFirebaseUser = createFirebaseAuthMiddleware(firebaseAdmin);

  const syncProfile = (decodedToken) => {
    const email = typeof decodedToken.email === 'string'
      ? decodedToken.email.trim().toLowerCase()
      : '';
    if (!email || email.length > 254) {
      const error = new Error('A valid email address is required to create an application profile.');
      error.status = 400;
      throw error;
    }

    const profile = {
      firebase_uid: decodedToken.uid,
      full_name: (typeof decodedToken.name === 'string' ? decodedToken.name : email.split('@')[0]).trim().slice(0, 100),
      email,
      profile_picture: typeof decodedToken.picture === 'string' ? decodedToken.picture : null,
      auth_provider: decodedToken.firebase?.sign_in_provider || 'unknown',
      email_verified: decodedToken.email_verified ? 1 : 0
    };
    return profileDatabase.syncUser(profile);
  };

  router.post('/auth/sync-user', requireFirebaseUser, async (req, res, next) => {
    try {
      const profile = await syncProfile(req.firebaseToken);
      return res.status(200).json({ user: toPublicProfile(profile) });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'This email is already associated with another account. Sign in with the original provider.' });
      }
      return next(error);
    }
  });

  router.get('/auth/me', requireFirebaseUser, (req, res, next) => {
    try {
      const profile = profileDatabase.findByUid(req.firebaseToken.uid);
      if (!profile) {
        return res.status(404).json({ error: 'Profile has not been synchronized yet.' });
      }
      return res.json({ user: toPublicProfile(profile) });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/auth/logout', requireFirebaseUser, (_req, res) => res.sendStatus(204));

  router.get('/users/profile', requireFirebaseUser, (req, res, next) => {
    try {
      const profile = profileDatabase.findByUid(req.firebaseToken.uid);
      if (!profile) return res.status(404).json({ error: 'Profile not found.' });
      return res.json({ user: toPublicProfile(profile) });
    } catch (error) {
      return next(error);
    }
  });

  router.put('/users/profile', requireFirebaseUser, (req, res, next) => {
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const picture = req.body?.profilePicture;
    if (!fullName || fullName.length > 100) {
      return res.status(400).json({ error: 'Full name must be between 1 and 100 characters.' });
    }
    if (picture !== null && picture !== undefined && (typeof picture !== 'string' || picture.length > 2048)) {
      return res.status(400).json({ error: 'Profile picture URL must be a valid URL or null.' });
    }
    if (typeof picture === 'string') {
      let url;
      try {
        url = new URL(picture);
      } catch {
        return res.status(400).json({ error: 'Profile picture URL must be a valid URL or null.' });
      }
      if (!['http:', 'https:'].includes(url.protocol)) {
        return res.status(400).json({ error: 'Profile picture URL must use HTTPS or HTTP.' });
      }
    }

    try {
      const profile = profileDatabase.updateProfile(req.firebaseToken.uid, {
        fullName,
        profilePicture: picture || null
      });
      if (!profile) return res.status(404).json({ error: 'Profile not found.' });
      return res.json({ user: toPublicProfile(profile) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

module.exports = { createProfileRouter };
