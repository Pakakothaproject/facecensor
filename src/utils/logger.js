const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'video-face-blur-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    new winston.transports.File({ 
      filename: path.join('logs', 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log processing events
const logProcessingEvent = (videoId, event, data = {}) => {
  logger.info('Processing event', {
    videoId,
    event,
    data,
    timestamp: new Date().toISOString()
  });
};

// Log API events
const logApiEvent = (userId, endpoint, method, statusCode, duration, data = {}) => {
  logger.info('API event', {
    userId,
    endpoint,
    method,
    statusCode,
    duration,
    data,
    timestamp: new Date().toISOString()
  });
};

// Log error events
const logError = (error, context = {}) => {
  logger.error('Error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  logProcessingEvent,
  logApiEvent,
  logError
};