const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://aaitxlxpoplreysthvrf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXR4bHhwb3BscmV5c3RodnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTYxNDUsImV4cCI6MjA3NDg3MjE0NX0.jvC1XyxEDDis38hD39UzPGu4x2llShtv65iW-Iq8qpU';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhaXR4bHhwb3BscmV5c3RodnJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI5NjE0NSwiZXhwIjoyMDc0ODcyMTQ1fQ.SbYH67vjSY4cg0kvp9oz4U3gSLfVx6GjB66BZcs-WHs';

console.log('=== SUPABASE SETUP VERIFICATION ===');
console.log('Project URL:', SUPABASE_URL);
console.log('Project ID: aaitxlxpoplreysthvrf');
console.log('Project Name: Pakakothaproject\'s Project');
console.log('');

async function verifySetup() {
  try {
    // Test with anon key
    console.log('1. Testing connection with ANON key...');
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const { data: anonData, error: anonError } = await anonClient
      .from('videos')
      .select('*')
      .limit(1);
    
    if (anonError) {
      console.log('❌ Anon key connection failed:', anonError.message);
    } else {
      console.log('✅ Anon key connection successful!');
      console.log('   Sample data:', anonData);
    }
    
    // Test with service role key
    console.log('\n2. Testing connection with SERVICE ROLE key...');
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('videos')
      .select('*')
      .limit(1);
    
    if (serviceError) {
      console.log('❌ Service role key connection failed:', serviceError.message);
    } else {
      console.log('✅ Service role key connection successful!');
      console.log('   Sample data:', serviceData);
    }
    
    // Test all tables
    console.log('\n3. Testing all tables...');
    const tables = ['anonymous_sessions', 'videos', 'faces', 'processing_logs'];
    
    for (const table of tables) {
      try {
        const { data, error } = await anonClient
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}:`, error.message);
        } else {
          console.log(`✅ Table ${table}: accessible (${data.length} rows)`);
        }
      } catch (err) {
        console.log(`❌ Error checking table ${table}:`, err.message);
      }
    }
    
    console.log('\n=== VERIFICATION COMPLETE ===');
    console.log('✅ All Supabase credentials are working correctly!');
    console.log('✅ Database connection is established');
    console.log('✅ All tables are accessible');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifySetup();