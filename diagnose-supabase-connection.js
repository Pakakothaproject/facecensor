const { Pool } = require('pg');
const https = require('https');

// Supabase configuration
const SUPABASE_HOST = 'aws-0-us-west-1.pooler.supabase.com';
const SUPABASE_PORT = 6543;
const SUPABASE_DATABASE = 'postgres';
const SUPABASE_USER = 'postgres.aaitxlxpoplreysthvrf';
const SUPABASE_PASSWORD = 'Mantoman12@';

console.log('=== SUPABASE CONNECTION DIAGNOSTIC ===');
console.log('Host:', SUPABASE_HOST);
console.log('Port:', SUPABASE_PORT);
console.log('Database:', SUPABASE_DATABASE);
console.log('User:', SUPABASE_USER);
console.log('');

async function runDiagnostics() {
  console.log('1. Testing network connectivity...');
  
  // Test 1: DNS resolution
  try {
    const dns = require('dns').promises;
    const addresses = await dns.resolve4(SUPABASE_HOST);
    console.log('✅ DNS resolution successful:', addresses);
  } catch (error) {
    console.error('❌ DNS resolution failed:', error.message);
    return;
  }
  
  // Test 2: TCP connection
  console.log('\n2. Testing TCP connection to PostgreSQL port...');
  const net = require('net');
  
  const tcpTest = new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      console.log('✅ TCP connection successful - PostgreSQL port is open');
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', (error) => {
      console.error('❌ TCP connection failed:', error.message);
      resolve(false);
    });
    
    socket.on('timeout', () => {
      console.error('❌ TCP connection timeout');
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(SUPABASE_PORT, SUPABASE_HOST);
  });
  
  const tcpSuccess = await tcpTest;
  if (!tcpSuccess) {
    console.log('\n❌ Network connectivity test failed. Cannot proceed.');
    return;
  }
  
  // Test 3: PostgreSQL connection
  console.log('\n3. Testing PostgreSQL authentication...');
  console.log('⚠️  WARNING: The current password appears to be an invalid JWT token.');
  console.log('   You need to get the actual PostgreSQL password from your Supabase dashboard.');
  
  const pool = new Pool({
    host: SUPABASE_HOST,
    port: SUPABASE_PORT,
    database: SUPABASE_DATABASE,
    user: SUPABASE_USER,
    password: SUPABASE_PASSWORD,
    ssl: { 
      rejectUnauthorized: false,
      require: true
    },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 5
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection successful!');
    
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Query successful! Current time:', result.rows[0].current_time);
    
    const versionResult = await client.query('SELECT version()');
    console.log('✅ PostgreSQL version:', versionResult.rows[0].version.split(' ').slice(0, 2).join(' '));
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 ALL TESTS PASSED! Your Supabase connection is working.');
    
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    
    if (error.code === '28P01') {
      console.error('\n🔧 AUTHENTICATION FAILED - SOLUTION:');
      console.error('   1. Go to https://app.supabase.com');
      console.error('   2. Select your project');
      console.error('   3. Go to Settings > Database');
      console.error('   4. Find your connection details or reset your password');
      console.error('   5. Update the password in your code');
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.error('\n🔧 TIMEOUT ERROR - SOLUTION:');
      console.error('   1. Check if your Supabase project is fully initialized');
      console.error('   2. Try increasing the connection timeout');
      console.error('   3. Check if there are any firewall restrictions');
    } else {
      console.error('\n🔧 CONNECTION ERROR - Check the error details above');
    }
    
    await pool.end();
  }
}

runDiagnostics().catch(console.error);