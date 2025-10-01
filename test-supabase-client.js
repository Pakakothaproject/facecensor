const { createClient } = require('@supabase/supabase-js');

// Hardcoded Supabase credentials
const SUPABASE_URL = 'https://aaitxlxpoplreysthvrf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYWl0eGx4cG9wbHJleXN0aHZyZiIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE3MzU5NjY0MDAsImV4cCI6MjA1MTU0MjQwMH0.jf34M4M4kPXt0mXg8wQ4F9X9Z9X9X9X9X9X9X9X9X9X9';

console.log('Testing Supabase client connection...');
console.log('URL:', SUPABASE_URL);
console.log('Using service role key for authentication');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testConnection() {
  try {
    console.log('Attempting to connect to Supabase...');
    
    // Test basic connection by fetching some data
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase query failed:');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error detail:', error.details);
      process.exit(1);
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('✅ Query successful! Sample data:', data);
    
    // Test if our tables exist by checking the schema
    const { data: tableData, error: tableError } = await supabase
      .rpc('pg_tables', {}, { count: 'exact' })
      .select('*')
      .like('tablename', 'videos');
    
    if (!tableError && tableData) {
      console.log('✅ Tables appear to be accessible');
    }
    
    console.log('✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Supabase connection failed:');
    console.error('Error message:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  }
}

testConnection();