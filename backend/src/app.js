const cors = require('cors');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { createAuthRouter } = require('./routes/auth');
const extensionRoutes = require("./routes/extensionRoutes");

function createApp({ config, passport, sessionStore, users, desktopAuth }) {
  if (!config || !passport || !sessionStore || !users || !desktopAuth) {
    throw new Error('config, passport, sessionStore, users, and desktopAuth are required');
  }

  const app = express();
  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(cors({
    origin: config.frontendUrl,
    credentials: true
  }));
  app.use(express.json({ limit: '10kb' }));
  app.use(session({
    name: 'agentic.sid',
    secret: config.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction || config.sameSite === 'none',
      sameSite: config.sameSite,
      maxAge: 8 * 60 * 60 * 1000
    }
  }));
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(passport.initialize());
  app.use(passport.session());
  app.use('/auth', createAuthRouter(passport, config, users, desktopAuth));
  app.use("/api/extensions", extensionRoutes);

  app.use((error, _req, res, _next) => {
    console.error('Authentication request failed:', error);
    res.status(500).json({ error: 'Authentication request failed' });
  });

  return app;
}

module.exports = { createApp };
