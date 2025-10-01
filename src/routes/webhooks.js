const express = require('express');
const { logger } = require('../utils/logger');

const router = express.Router();

// Webhook endpoint for external integrations
router.post('/', (req, res) => {
  try {
    const { event, data } = req.body;
    
    logger.info('Webhook received', { event, data });
    
    // Handle different webhook events
    switch (event) {
      case 'video.processed':
        logger.info('Video processing completed', { videoId: data?.videoId });
        break;
      case 'video.failed':
        logger.error('Video processing failed', { videoId: data?.videoId, error: data?.error });
        break;
      default:
        logger.warn('Unknown webhook event', { event });
    }
    
    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_PROCESSING_ERROR',
        message: 'Failed to process webhook'
      }
    });
  }
});

// Health check for webhooks
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;