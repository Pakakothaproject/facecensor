const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err.message, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, code: 'RESOURCE_NOT_FOUND' };
    return res.status(404).json({
      success: false,
      error
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, code: 'DUPLICATE_FIELD' };
    return res.status(400).json({
      success: false,
      error
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, code: 'VALIDATION_ERROR' };
    return res.status(400).json({
      success: false,
      error
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, code: 'INVALID_TOKEN' };
    return res.status(401).json({
      success: false,
      error
    });
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, code: 'TOKEN_EXPIRED' };
    return res.status(401).json({
      success: false,
      error
    });
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { message, code: 'FILE_TOO_LARGE' };
    return res.status(400).json({
      success: false,
      error
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files';
    error = { message, code: 'TOO_MANY_FILES' };
    return res.status(400).json({
      success: false,
      error
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = { message, code: 'UNEXPECTED_FILE' };
    return res.status(400).json({
      success: false,
      error
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Server Error',
      code: error.code || 'INTERNAL_SERVER_ERROR'
    }
  });
};

module.exports = { errorHandler };