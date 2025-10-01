const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { logger } = require('../utils/logger');

// Add hashCode method to String prototype for demo user ID generation
if (!String.prototype.hashCode) {
  String.prototype.hashCode = function() {
    let hash = 0;
    if (this.length === 0) return hash;
    for (let i = 0; i < this.length; i++) {
      const char = this.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  };
}

const JWT_SECRET = 'super-secret-jwt-key-for-video-face-blur-app-2024';
const API_KEY_SECRET = 'api-key-secret-for-video-processing-backend-service';

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

    logger.info('Authentication attempt', { 
      hasAuthHeader: !!authHeader, 
      hasToken: !!token, 
      hasApiKey: !!apiKey,
      endpoint: req.originalUrl,
      method: req.method 
    });

    let user = null;

    if (token) {
      const decoded = verifyToken(token);
      if (!decoded) {
        logger.warn('Authentication failed: Invalid or expired token', { 
          endpoint: req.originalUrl,
          tokenLength: token ? token.length : 0
        });
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token'
          }
        });
      }

      // Try to authenticate with database, fallback to demo mode
      try {
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
        logger.info('Authentication successful (database)', { userId: user.id, email: user.email });
      } catch (dbError) {
        // Database not available, create demo user from token
        logger.warn('Database not available, using demo user from token', { userId: decoded.userId, email: decoded.email });
        
        user = {
          id: decoded.userId,
          email: decoded.email || 'demo@example.com',
          api_key: generateApiKey(),
          credits: 100,
          demo_mode: true
        };
        logger.info('Authentication successful (demo mode)', { userId: user.id, email: user.email });
      }
    } else if (apiKey) {
      // Try to authenticate with database, fallback to demo mode
      try {
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
      } catch (dbError) {
        // Database not available, create demo user for API key
        logger.warn('Database not available, using demo user for API key', { apiKey: apiKey.substring(0, 8) + '...' });
        
        user = {
          id: Math.abs(apiKey.hashCode() || 99999),
          email: 'api-demo@example.com',
          api_key: apiKey,
          credits: 100,
          demo_mode: true
        };
      }
    } else {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Authentication required. Provide JWT token or API key'
        }
      });
    }

    logger.info('Authentication successful', { 
      userId: user.id, 
      email: user.email,
      demoMode: user.demo_mode || false,
      endpoint: req.originalUrl,
      method: req.method 
    });

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