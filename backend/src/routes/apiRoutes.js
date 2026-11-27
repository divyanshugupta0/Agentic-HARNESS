const express = require('express');
const { routeModelRequest, streamModelRequest, fetchProviderModels } = require('../services/modelRouter');

const router = express.Router();

/**
 * POST /api/models
 * Fetches the live model list from the target provider using only its API key.
 */
router.post('/models', async (req, res) => {
  try {
    const { provider } = req.body || {};
    const models = await fetchProviderModels({ provider });
    return res.status(200).json({
      success: true,
      models
    });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 400;
    return res.status(status).json({
      success: false,
      error: error.message || 'Failed to fetch provider models'
    });
  }
});

/**
 * POST /api/chat
 * Routes a model request strictly to the selected provider's endpoint
 * using only that provider's API key.
 */
router.post('/chat', async (req, res) => {
  try {
    const { provider, model, messages, audio } = req.body || {};
    const result = await routeModelRequest({ provider, model, messages, audio });
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 400;
    return res.status(status).json({
      success: false,
      error: error.message || 'Model request routing failed'
    });
  }
});

/**
 * POST /api/chat/stream
 * Streams model tokens in real time via Server-Sent Events (SSE).
 */
router.post('/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const { provider, model, messages, audio, images, files } = req.body || {};
    const result = await streamModelRequest({
      provider,
      model,
      messages,
      audio,
      images,
      files,
      onThinking: (thinkingDelta) => {
        res.write(`data: ${JSON.stringify({ thinkingDelta })}\n\n`);
      },
      onChunk: (delta) => {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    });
    res.write(`data: ${JSON.stringify({ done: true, model: result.model, endpoint: result.endpoint })}\n\n`);
    return res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message || 'Model stream failed' })}\n\n`);
    return res.end();
  }
});

module.exports = router;
