const { query } = require('./database');
const { logger } = require('../utils/logger');

const createTables = async () => {
  try {
    logger.info('Starting database migration...');

    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        api_key VARCHAR(255) UNIQUE,
        webhook_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create videos table
    await query(`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        input_url TEXT NOT NULL,
        output_url TEXT,
        status VARCHAR(50) DEFAULT 'uploaded',
        processing_progress INTEGER DEFAULT 0,
        upload_progress INTEGER DEFAULT 0,
        total_frames INTEGER DEFAULT 0,
        frame_screenshot_url TEXT,
      frame_screenshot_public_id TEXT,
      blur_intensity INTEGER DEFAULT 25,
      processing_mode VARCHAR(20) DEFAULT 'blur',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `);

    // Create faces table
    await query(`
      CREATE TABLE IF NOT EXISTS faces (
        id SERIAL PRIMARY KEY,
        video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
        face_id INTEGER NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        confidence DECIMAL(3,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create processing_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS processing_logs (
        id SERIAL PRIMARY KEY,
        video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await query('CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status)');
    await query('CREATE INDEX IF NOT EXISTS idx_faces_video_id ON faces(video_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_processing_logs_video_id ON processing_logs(video_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_processing_logs_created_at ON processing_logs(created_at)');

    logger.info('Database migration completed successfully');
  } catch (error) {
    logger.error('Database migration failed:', error);
    throw error;
  }
};

// Run migration if this script is executed directly
if (require.main === module) {
  createTables()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { createTables };