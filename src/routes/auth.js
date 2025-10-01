const express = require('express');
const Joi = require('joi');
const { query } = require('../config/database');
const { 
  generateApiKey, 
  hashPassword, 
  comparePassword, 
  generateToken,
  authenticateToken 
} = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register new user
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { email, password } = value;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User already exists with this email'
        }
      });
    }

    // Hash password and generate API key
    const hashedPassword = await hashPassword(password);
    const apiKey = generateApiKey();

    // Insert new user
    const result = await query(
      `INSERT INTO users (email, password, api_key, credits, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW()) 
       RETURNING id, email, api_key, credits, created_at`,
      [email, hashedPassword, apiKey, 100] // Start with 100 credits
    );

    const user = result.rows[0];
    const token = generateToken(user.id, user.email);

    logger.info('User registered successfully', { userId: user.id, email });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          api_key: user.api_key,
          credits: user.credits,
          created_at: user.created_at
        }
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    next(error);
  }
});

// Login user
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message
        }
      });
    }

    const { email, password } = value;

    // Find user by email
    const result = await query(
      'SELECT id, email, password, api_key, credits, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    logger.info('User logged in successfully', { userId: user.id, email });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          api_key: user.api_key,
          credits: user.credits,
          created_at: user.created_at
        }
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
});

// Get user profile (requires authentication)
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user stats including video count and processing stats
    const userResult = await query(
      `SELECT u.id, u.email, u.api_key, u.credits, u.created_at,
              COUNT(v.id) as video_count,
              COUNT(CASE WHEN v.status = 'completed' THEN 1 END) as completed_videos,
              COUNT(CASE WHEN v.status = 'processing' THEN 1 END) as processing_videos
       FROM users u
       LEFT JOIN videos v ON u.id = v.user_id
       WHERE u.id = $1
       GROUP BY u.id, u.email, u.api_key, u.credits, u.created_at`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          api_key: user.api_key,
          credits: user.credits,
          video_count: parseInt(user.video_count),
          completed_videos: parseInt(user.completed_videos),
          processing_videos: parseInt(user.processing_videos),
          created_at: user.created_at
        }
      }
    });
  } catch (error) {
    logger.error('Profile fetch error:', error);
    next(error);
  }
});

// Regenerate API key (requires authentication)
router.post('/regenerate-api-key', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const newApiKey = generateApiKey();

    const result = await query(
      'UPDATE users SET api_key = $1, updated_at = NOW() WHERE id = $2 RETURNING api_key',
      [newApiKey, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    logger.info('API key regenerated', { userId });

    res.json({
      success: true,
      data: {
        api_key: result.rows[0].api_key
      }
    });
  } catch (error) {
    logger.error('API key regeneration error:', error);
    next(error);
  }
});

module.exports = router;