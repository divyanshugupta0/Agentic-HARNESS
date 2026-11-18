const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { createProfileRouter } = require('./routes/firebaseUsers');

function createFirebaseProfileApp({ frontendUrl, firebaseAdmin, profileDatabase }) {
  if (!frontendUrl || !firebaseAdmin || !profileDatabase) {
    throw new Error('frontendUrl, firebaseAdmin, and profileDatabase are required');
  }

  const app = express();
  app.use(helmet());
  app.use(cors({
    origin: frontendUrl,
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  app.use(express.json({ limit: '10kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', createProfileRouter(firebaseAdmin, profileDatabase));
  app.use((error, _req, res, _next) => {
    console.error('Firebase profile request failed:', error);
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Firebase profile request failed'
    });
  });

  return app;
}

module.exports = { createFirebaseProfileApp };
