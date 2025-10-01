const { Pool } = require('pg');

// Supabase connection string format (typically provided by Supabase)
const SUPABASE_CONNECTION_STRING = 'postgresql://postgres:Mantoman12%40@aaitxlxpoplreysthvrf.supabase.co:5432/postgres';

console.log('Testing Supabase database connection with connection string...');
console.log('Using hardcoded Supabase connection string');

const pool = new Pool({
  connectionString: SUPABASE_CONNECTION_STRING,
  ssl: { 
    rejectUnauthorized: false,
    require: true
  },
  connectionTimeoutMillis: 30000, // 30 second timeout
  idleTimeoutMillis: 30000,
  max: 20
});

async function testConnection() {
  try {
    console.log('Attempting to connect to Supabase...');
    const client = await pool.connect();
    console.log('✅ Supabase connection successful!');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query successful! Current time:', result.rows[0].current_time);
    
    const versionResult = await client.query('SELECT version()');
    console.log('✅ PostgreSQL version:', versionResult.rows[0].version);
    
    // Test if our tables exist
    console.log('Testing table existence...');
    const tables = ['anonymous_sessions', 'videos', 'faces', 'processing_logs'];
    for (const table of tables) {
      try {
        await client.query(`SELECT 1 FROM ${table} LIMIT 1`);
        console.log(`✅ Table ${table} exists`);
      } catch (err) {
        console.log(`❌ Table ${table} does not exist or is not accessible`);
      }
    }
    
    client.release();
    await pool.end();
    console.log('✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Supabase connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error detail:', error.detail);
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - check if Supabase is accessible');
    } else if (error.code === 'ENOTFOUND') {
      console.error('Host not found - check Supabase host');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection timeout - check network connectivity');
    } else if (error.code === '28P01') {
      console.error('Authentication failed - check credentials');
    } else if (error.code === '3D000') {
      console.error('Database does not exist - check database name');
    }
    await pool.end();
    process.exit(1);
  }
}

testConnection();