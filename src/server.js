const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { logger } = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const { createTables } = require('./config/migrate');
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const webhookRoutes = require('./routes/webhooks');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins for development
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 3000;

// Trust proxy if behind load balancer
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('subscribe-video', (videoId) => {
    socket.join(`video-${videoId}`);
    logger.info(`Client ${socket.id} subscribed to video ${videoId}`);
  });
  
  socket.on('unsubscribe-video', (videoId) => {
    socket.leave(`video-${videoId}`);
    logger.info(`Client ${socket.id} unsubscribed from video ${videoId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', authenticateToken, videoRoutes);
app.use('/api/webhooks', webhookRoutes);
// app.use('/api/admin', authenticateToken, adminRoutes); // Admin routes not implemented yet

// Default route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Video Face Blur API',
    version: '1.0.0',
    documentation: '/docs'
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    try {
      await connectDatabase();
      logger.info('Database connected successfully');
      // Run migration after successful connection
      try {
        await createTables();
        logger.info('Database migration completed');
      } catch (migrationError) {
        logger.error('Database migration failed:', migrationError);
        // Continue even if migration fails - tables might already exist
      }
    } catch (dbError) {
      logger.warn(`Database connection failed, continuing without database: ${dbError.message}`);
      logger.warn('Some features may not be available');
    }
    
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    console.error('Server startup error:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, io };