const { createClient } = require('@supabase/supabase-js');

// Hardcoded Supabase credentials from your project
const SUPABASE_URL = 'https://aaitxlxpoplreysthvrf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXR4bHhwb3BscmV5c3RodnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTYxNDUsImV4cCI6MjA3NDg3MjE0NX0.jvC1XyxEDDis38hD39UzPGu4x2llShtv65iW-Iq8qpU';

console.log('Testing Supabase database connection...');
console.log('Using Supabase client with anon key');
console.log('Project URL: https://aaitxlxpoplreysthvrf.supabase.co');
console.log('Project ID: aaitxlxpoplreysthvrf');
console.log('Project Name: Pakakothaproject\'s Project');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  try {
    console.log('Attempting to connect to Supabase...');
    
    // Test basic connection by fetching from a table
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:');
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      process.exit(1);
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('✅ Query successful! Sample data:', data);
    
    // Test if our tables exist by trying to query them
    console.log('Testing table existence...');
    const tables = ['anonymous_sessions', 'videos', 'faces', 'processing_logs'];
    
    for (const table of tables) {
      try {
        const { data: tableData, error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (tableError) {
          console.log(`❌ Table ${table} does not exist or is not accessible:`, tableError.message);
        } else {
          console.log(`✅ Table ${table} exists and is accessible`);
        }
      } catch (err) {
        console.log(`❌ Error checking table ${table}:`, err.message);
      }
    }
    
    console.log('✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Supabase connection failed:');
    console.error('Error message:', error.message);
    process.exit(1);
  }
}

testConnection();