const { logger } = require('./src/utils/logger');
const { videoProcessingQueue, webhookQueue } = require('./src/services/queue');

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    // Stop accepting new jobs
    await videoProcessingQueue.pause();
    await webhookQueue.pause();
    
    // Wait for current jobs to complete
    logger.info('Waiting for current jobs to complete...');
    
    // Close queues
    await videoProcessingQueue.close();
    await webhookQueue.close();
    
    logger.info('Worker shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start worker
const startWorker = async () => {
  try {
    logger.info('Starting background worker...');
    
    // Initialize queues (they're already initialized in queue.js)
    logger.info('Worker queues initialized');
    
    logger.info('Background worker started successfully');
    logger.info('Worker is ready to process video processing and webhook jobs');
    
  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
};

// Start the worker
startWorker();