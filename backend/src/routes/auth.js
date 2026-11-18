const express = require('express');
const rateLimit = require('express-rate-limit');
const { verifyPassword } = require('../users');

const PROVIDERS = new Set(['google', 'github', 'microsoft']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DESKTOP_TICKET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const MIN_PASSWORD_LENGTH = 10;

function safeUser(user) {
  return {
    id: user.id,
    provider: user.provider,
    name: user.name,
    email: user.email || null,
    avatar: user.avatar || null,
    isAuthenticated: true
  };
}

function createAuthRouter(passport, config, users, desktopAuth) {
  if (!users || !desktopAuth) {
    throw new Error('user and desktop auth stores are required');
  }

  const router = express.Router();
  const successUrl = `${config.frontendUrl}/?auth=success`;
  const failureUrl = `${config.frontendUrl}/?auth=error`;
  router.use(['/signup', '/login'], rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false
  }));

  router.post('/signup', async (req, res, next) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!name || name.length > 100 || !EMAIL_PATTERN.test(email) || email.length > 254
      || password.length < MIN_PASSWORD_LENGTH || password.length > 256) {
      return res.status(400).json({
        error: 'Enter a valid name and email, and a password of at least 10 characters'
      });
    }

    try {
      const user = await users.createPasswordUser({ name, email, password });
      return req.logIn(user, (error) => {
        if (error) return next(error);
        return res.status(201).json(safeUser(user));
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ error: 'An account with that email already exists' });
      }
      return next(error);
    }
  });

  router.post('/login', async (req, res, next) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!EMAIL_PATTERN.test(email) || !password || password.length > 256) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    try {
      const account = await users.findPasswordUser(email);
      if (!account || !(await verifyPassword(password, account.passwordHash))) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const user = safeUser(account);
      return req.logIn(user, (error) => {
        if (error) return next(error);
        return res.json(user);
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/desktop/start', async (req, res, next) => {
    const provider = req.body?.provider;
    if (!PROVIDERS.has(provider)) {
      return res.status(400).json({ error: 'Unsupported social sign-in provider' });
    }
    if (!config[provider]?.enabled) {
      return res.status(503).json({ error: `${provider} sign-in is not configured on this server` });
    }
    try {
      const ticket = await desktopAuth.create();
      const authUrl = new URL(`/auth/${provider}`, config.authPublicUrl);
      authUrl.searchParams.set('desktop_ticket', ticket);
      return res.json({ ticket, authUrl: authUrl.toString() });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/desktop/poll', async (req, res, next) => {
    const ticket = req.body?.ticket;
    if (typeof ticket !== 'string' || !DESKTOP_TICKET_PATTERN.test(ticket)) {
      return res.status(400).json({ error: 'Invalid desktop sign-in ticket' });
    }
    try {
      const result = await desktopAuth.poll(ticket);
      if (result.status === 'complete') {
        const user = safeUser(result.user);
        return req.logIn(user, (error) => {
          if (error) return next(error);
          return req.session.save((saveError) => {
            if (saveError) return next(saveError);
            return res.json({ status: 'complete', user });
          });
        });
      }
      if (result.status === 'expired') {
        return res.status(410).json({ error: 'Desktop sign-in expired or was already completed' });
      }
      return res.status(202).json({ status: 'pending' });
    } catch (error) {
      return next(error);
    }
  });

  function start(provider, options) {
    return (req, res, next) => {
      if (!config[provider]?.enabled) {
        return res.status(503).json({ error: `${provider} sign-in is not configured on this server` });
      }
      const ticket = req.query.desktop_ticket;
      if (ticket !== undefined) {
        if (typeof ticket !== 'string' || !DESKTOP_TICKET_PATTERN.test(ticket)) {
          return res.status(400).json({ error: 'Invalid desktop sign-in ticket' });
        }
        req.session.desktopAuthTicket = ticket;
      }
      return passport.authenticate(provider, options)(req, res, next);
    };
  }

  router.get('/google', start('google', { scope: ['profile', 'email'] }));
  router.get('/github', start('github', { scope: ['user:email'] }));
  router.get('/microsoft', start('microsoft', { scope: ['user.read'] }));

  function callback(provider) {
    return (req, res, next) => {
      if (!config[provider]?.enabled) {
        return res.status(503).json({ error: `${provider} sign-in is not configured on this server` });
      }
      return passport.authenticate(provider, (error, user) => {
        if (error) return next(error);
        if (!user) {
          if (req.session.desktopAuthTicket) {
            delete req.session.desktopAuthTicket;
            return req.session.save((saveError) => {
              if (saveError) return next(saveError);
              return res.status(401).type('text').send('Sign-in was canceled. You can close this tab and return to Agentic Harness.');
            });
          }
          return res.redirect(failureUrl);
        }

        const desktopTicket = req.session.desktopAuthTicket;
        delete req.session.desktopAuthTicket;
        return req.logIn(user, (loginError) => {
          if (loginError) return next(loginError);
          const completeHandoff = desktopTicket
            ? desktopAuth.complete(desktopTicket, safeUser(user))
            : Promise.resolve(true);
          return completeHandoff
            .then((completed) => {
              if (!completed) {
                return res.redirect(failureUrl);
              }
              return req.session.save((saveError) => {
                if (saveError) return next(saveError);
                if (desktopTicket) {
                  return res.status(200).type('text').send('Sign-in complete. You can close this tab and return to Agentic Harness.');
                }
                return res.redirect(successUrl);
              });
            })
            .catch(next);
        });
      })(req, res, next);
    };
  }

  router.get('/google/callback', callback('google'));
  router.get('/github/callback', callback('github'));
  router.get('/microsoft/callback', callback('microsoft'));

  router.get('/user', (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.json(safeUser(req.user));
  });

  router.post('/logout', (req, res, next) => {
    req.logout((logoutError) => {
      if (logoutError) return next(logoutError);
      if (!req.session) {
        res.clearCookie('agentic.sid');
        return res.sendStatus(204);
      }
      return req.session.destroy((destroyError) => {
        if (destroyError) return next(destroyError);
        res.clearCookie('agentic.sid', {
          httpOnly: true,
          secure: config.isProduction || config.sameSite === 'none',
          sameSite: config.sameSite
        });
        return res.sendStatus(204);
      });
    });
  });

  return router;
}

module.exports = { createAuthRouter, safeUser };
