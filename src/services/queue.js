const Bull = require('bull');
const Redis = require('ioredis');
const { logger } = require('../utils/logger');

// Create Redis connection for queue
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Create video processing queue
const videoProcessingQueue = new Bull('video-processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Create webhook queue for notifications
const webhookQueue = new Bull('webhook-notifications', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 10,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  }
});

// Queue event handlers
videoProcessingQueue.on('completed', (job, result) => {
  logger.info('Video processing job completed', {
    jobId: job.id,
    videoId: job.data.videoId,
    result
  });
});

videoProcessingQueue.on('failed', (job, err) => {
  logger.error('Video processing job failed', {
    jobId: job.id,
    videoId: job.data.videoId,
    error: err.message
  });
});

videoProcessingQueue.on('progress', (job, progress) => {
  logger.info('Video processing job progress', {
    jobId: job.id,
    videoId: job.data.videoId,
    progress
  });
});

webhookQueue.on('completed', (job) => {
  logger.info('Webhook notification sent', {
    jobId: job.id,
    videoId: job.data.videoId
  });
});

webhookQueue.on('failed', (job, err) => {
  logger.error('Webhook notification failed', {
    jobId: job.id,
    videoId: job.data.videoId,
    error: err.message
  });
});

// Job processors
const processVideoJob = async (job) => {
  const { videoId, selectedFaceIds, blurIntensity, blurType, processingMode } = job.data;
  
  logger.info('Starting video processing job', {
    jobId: job.id,
    videoId,
    selectedFaceIds: selectedFaceIds.length,
    blurIntensity,
    blurType,
    processingMode
  });

  try {
    // Import VideoProcessor dynamically to avoid circular dependencies
    const VideoProcessor = require('../workers/videoProcessor');
    const processor = new VideoProcessor();
    
    const result = await processor.processVideo(videoId, selectedFaceIds, blurIntensity, blurType, processingMode);
    
    // Add webhook notification job
    await addWebhookJob({
      videoId,
      status: 'completed',
      outputUrl: result.outputPath,
      processingTime: result.processingTime
    });
    
    return result;
  } catch (error) {
    logger.error('Video processing error:', error);
    
    // Add webhook notification for failure
    await addWebhookJob({
      videoId,
      status: 'failed',
      error: error.message
    });
    
    throw error;
  }
};

const processWebhookJob = async (job) => {
  const { videoId, status, outputUrl, processingTime, error } = job.data;
  
  logger.info('Processing webhook notification', {
    jobId: job.id,
    videoId,
    status
  });

  try {
    // Get user's webhook URL from database
    const { query } = require('../config/database');
    const result = await query(`
      SELECT u.webhook_url 
      FROM videos v 
      JOIN users u ON v.user_id = u.id 
      WHERE v.id = $1
    `, [videoId]);

    if (result.rows.length === 0 || !result.rows[0].webhook_url) {
      logger.info('No webhook URL configured for user');
      return { success: true, message: 'No webhook URL configured' };
    }

    const webhookUrl = result.rows[0].webhook_url;
    const axios = require('axios');
    const crypto = require('crypto');
    
    // Create webhook payload
    const payload = {
      videoId,
      status,
      timestamp: new Date().toISOString(),
      outputUrl,
      processingTime,
      error
    };

    // Create signature
    const signature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Send webhook
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': 'video.processing.complete'
      },
      timeout: 10000
    });

    logger.info('Webhook sent successfully', {
      jobId: job.id,
      videoId,
      statusCode: response.status
    });

    return { success: true, statusCode: response.status };
  } catch (error) {
    logger.error('Webhook sending failed:', error);
    throw error;
  }
};

// Register job processors
videoProcessingQueue.process(processVideoJob);
webhookQueue.process(processWebhookJob);

// Queue management functions
const addVideoProcessingJob = async (data, options = {}) => {
  try {
    const job = await videoProcessingQueue.add('process-video', data, {
      delay: options.delay || 0,
      priority: options.priority || 1,
      attempts: options.attempts || 3
    });
    
    logger.info('Video processing job added to queue', {
      jobId: job.id,
      videoId: data.videoId
    });
    
    return job;
  } catch (error) {
    logger.error('Failed to add video processing job:', error);
    throw error;
  }
};

const addWebhookJob = async (data, options = {}) => {
  try {
    const job = await webhookQueue.add('send-webhook', data, {
      delay: options.delay || 0,
      attempts: options.attempts || 5
    });
    
    return job;
  } catch (error) {
    logger.error('Failed to add webhook job:', error);
    throw error;
  }
};

const getQueueStats = async () => {
  try {
    const videoStats = await videoProcessingQueue.getJobCounts();
    const webhookStats = await webhookQueue.getJobCounts();
    
    return {
      videoProcessing: videoStats,
      webhookNotifications: webhookStats
    };
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    return null;
  }
};

const getJobStatus = async (jobId) => {
  try {
    const videoJob = await videoProcessingQueue.getJob(jobId);
    if (videoJob) {
      return {
        queue: 'video-processing',
        status: await videoJob.getState(),
        data: videoJob.data,
        result: videoJob.returnvalue,
        failedReason: videoJob.failedReason
      };
    }
    
    const webhookJob = await webhookQueue.getJob(jobId);
    if (webhookJob) {
      return {
        queue: 'webhook-notifications',
        status: await webhookJob.getState(),
        data: webhookJob.data,
        result: webhookJob.returnvalue,
        failedReason: webhookJob.failedReason
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Failed to get job status:', error);
    return null;
  }
};

module.exports = {
  videoProcessingQueue,
  webhookQueue,
  addVideoProcessingJob,
  addWebhookJob,
  getQueueStats,
  getJobStatus
};