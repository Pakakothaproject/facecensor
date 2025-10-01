-- Simple Supabase Schema for Anonymous Video Face Blur Application
-- No Row Level Security - simpler setup for anonymous usage

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create anonymous sessions table
CREATE TABLE IF NOT EXISTS anonymous_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
);

-- Create videos table for anonymous uploads
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
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
    processed_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- Create faces table for storing detected faces
CREATE TABLE IF NOT EXISTS faces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    face_id INTEGER NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create processing logs table
CREATE TABLE IF NOT EXISTS processing_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_videos_session_id ON videos(session_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
CREATE INDEX IF NOT EXISTS idx_faces_video_id ON faces(video_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_video_id ON processing_logs(video_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_session_id ON processing_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_session_id ON anonymous_sessions(session_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_videos_updated_at 
    BEFORE UPDATE ON videos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate unique session ID
CREATE OR REPLACE FUNCTION generate_session_id()
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN 'anon_' || TO_CHAR(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000, 'FM999999999999') || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing (optional)
-- INSERT INTO anonymous_sessions (session_id, ip_address, user_agent) VALUES 
--     ('demo_session_123', '127.0.0.1', 'Demo Browser');

-- Insert sample video (optional)
-- INSERT INTO videos (session_id, filename, input_url, status) VALUES 
--     ('demo_session_123', 'demo-video.mp4', 'https://example.com/video.mp4', 'completed');

-- Simple cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete videos older than 7 days
    DELETE FROM videos WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete expired sessions
    DELETE FROM anonymous_sessions WHERE expires_at < CURRENT_TIMESTAMP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Instructions for Supabase setup:
-- 1. Go to https://app.supabase.com and create a new project
-- 2. In the SQL Editor, paste and run this entire script
-- 3. Get your connection string from Settings > Database
-- 4. Update your Render environment variables with the Supabase credentials

-- Example connection string format:
-- postgresql://username:password@db.supabase.co:5432/postgres