const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { logger } = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const API_KEY_SECRET = process.env.API_KEY_SECRET;

if (!JWT_SECRET || !API_KEY_SECRET) {
  throw new Error('JWT_SECRET and API_KEY_SECRET environment variables are required');
}

// Generate API key
const generateApiKey = () => {
  return `vfb_${uuidv4().replace(/-/g, '')}${Date.now().toString(36)}`;
};

// Hash password
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const apiKey = req.headers['x-api-key'];

    let user = null;

    if (token) {
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token'
          }
        });
      }

      const result = await query(
        'SELECT id, email, api_key, credits FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      user = result.rows[0];
    } else if (apiKey) {
      const result = await query(
        'SELECT id, email, api_key, credits FROM users WHERE api_key = $1',
        [apiKey]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key'
          }
        });
      }

      user = result.rows[0];
    } else {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required. Provide JWT token or API key'
        }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error'
      }
    });
  }
};

// Middleware to require specific roles (optional)
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required'
        }
      });
    }

    // For now, we'll just check if user exists
    // You can extend this to check user roles later
    next();
  };
};

module.exports = {
  generateApiKey,
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  authenticateToken,
  requireRole
};