-- Supabase Schema for Anonymous Video Face Blur Application
-- This schema supports anonymous users without requiring account creation

-- Enable UUID extension for generating unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create anonymous users table (for tracking sessions without authentication)
CREATE TABLE IF NOT EXISTS anonymous_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
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

-- Create cleanup logs table for tracking expired data removal
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    records_deleted INTEGER NOT NULL,
    cleanup_type VARCHAR(50) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_videos_session_id ON videos(session_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
CREATE INDEX IF NOT EXISTS idx_videos_expires_at ON videos(expires_at);
CREATE INDEX IF NOT EXISTS idx_faces_video_id ON faces(video_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_video_id ON processing_logs(video_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_session_id ON processing_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_created_at ON processing_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_session_id ON anonymous_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_expires_at ON anonymous_sessions(expires_at);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_videos_updated_at 
    BEFORE UPDATE ON videos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired sessions and videos
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_sessions INTEGER := 0;
    deleted_videos INTEGER := 0;
    deleted_faces INTEGER := 0;
    deleted_logs INTEGER := 0;
BEGIN
    -- Clean up expired anonymous sessions
    DELETE FROM anonymous_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
    
    -- Clean up expired videos
    DELETE FROM videos 
    WHERE expires_at < CURRENT_TIMESTAMP;
    GET DIAGNOSTICS deleted_videos = ROW_COUNT;
    
    -- Log the cleanup (faces and processing logs will be automatically deleted due to CASCADE)
    IF deleted_sessions > 0 OR deleted_videos > 0 THEN
        INSERT INTO cleanup_logs (table_name, records_deleted, cleanup_type, details)
        VALUES 
            ('anonymous_sessions', deleted_sessions, 'automatic_cleanup', '{"reason": "expired"}'),
            ('videos', deleted_videos, 'automatic_cleanup', '{"reason": "expired"}');
    END IF;
    
    RETURN deleted_sessions + deleted_videos;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate unique session ID
CREATE OR REPLACE FUNCTION generate_session_id()
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN 'anon_' || TO_CHAR(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000, 'FM999999999999') || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing (optional - remove in production)
-- INSERT INTO anonymous_sessions (session_id, ip_address, user_agent) VALUES 
--     ('test_session_123', '127.0.0.1', 'Mozilla/5.0 Test Browser');

-- Grant permissions (adjust based on your Supabase setup)
-- These permissions are typically handled through Supabase dashboard
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
-- GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add RLS (Row Level Security) policies for anonymous access
ALTER TABLE anonymous_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE faces ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to create sessions
CREATE POLICY "Allow anonymous session creation" ON anonymous_sessions
    FOR INSERT WITH CHECK (true);

-- Policy: Allow anonymous users to read their own sessions
CREATE POLICY "Allow users to read own sessions" ON anonymous_sessions
    FOR SELECT USING (session_id = current_setting('app.current_session_id', true));

-- Policy: Allow anonymous users to update their own sessions
CREATE POLICY "Allow users to update own sessions" ON anonymous_sessions
    FOR UPDATE USING (session_id = current_setting('app.current_session_id', true));

-- Policy: Allow anonymous users to create videos
CREATE POLICY "Allow anonymous video creation" ON videos
    FOR INSERT WITH CHECK (true);

-- Policy: Allow anonymous users to read their own videos
CREATE POLICY "Allow users to read own videos" ON videos
    FOR SELECT USING (session_id = current_setting('app.current_session_id', true));

-- Policy: Allow anonymous users to update their own videos
CREATE POLICY "Allow users to update own videos" ON videos
    FOR UPDATE USING (session_id = current_setting('app.current_session_id', true));

-- Policy: Allow anonymous users to read faces for their videos
CREATE POLICY "Allow users to read faces for own videos" ON faces
    FOR SELECT USING (
        video_id IN (
            SELECT id FROM videos WHERE session_id = current_setting('app.current_session_id', true)
        )
    );

-- Policy: Allow anonymous users to create processing logs
CREATE POLICY "Allow anonymous processing log creation" ON processing_logs
    FOR INSERT WITH CHECK (true);

-- Policy: Allow anonymous users to read their own processing logs
CREATE POLICY "Allow users to read own processing logs" ON processing_logs
    FOR SELECT USING (session_id = current_setting('app.current_session_id', true));

-- Create a function to set the current session ID for RLS
CREATE OR REPLACE FUNCTION set_current_session_id(session_id_text TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_session_id', session_id_text, true);
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old data (to be called by a cron job or manually)
CREATE OR REPLACE FUNCTION perform_cleanup()
RETURNS TABLE(cleanup_type TEXT, records_deleted INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT cl.cleanup_type::TEXT, cl.records_deleted
    FROM cleanup_logs cl
    WHERE cl.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    ORDER BY cl.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE anonymous_sessions IS 'Stores anonymous user sessions without requiring account creation';
COMMENT ON TABLE videos IS 'Stores video processing information for anonymous users';
COMMENT ON TABLE faces IS 'Stores detected face coordinates for video processing';
COMMENT ON TABLE processing_logs IS 'Logs all processing activities for debugging and monitoring';
COMMENT ON TABLE cleanup_logs IS 'Tracks automatic cleanup operations for expired data';
COMMENT ON FUNCTION cleanup_expired_data() IS 'Automatically removes expired sessions and videos older than 7 days';
COMMENT ON FUNCTION generate_session_id() IS 'Generates unique session IDs for anonymous users';

-- Final cleanup command (run this manually to test)
-- SELECT cleanup_expired_data();