const https = require('https');

// Supabase credentials
const SUPABASE_URL = 'aaitxlxpoplreysthvrf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYWl0eGx4cG9wbHJleXN0aHZyZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM1OTY2NDAwLCJleHAiOjIwNTE1NDI0MDB9.jf34M4M4kPXt0mXg8wQ4F9X9Z9X9X9X9X9X9X9X9X9X9';

console.log('Testing Supabase REST API connection...');
console.log('URL:', SUPABASE_URL);
console.log('Using anon key for authentication');

function testRestAPI() {
  const options = {
    hostname: SUPABASE_URL,
    port: 443,
    path: '/rest/v1/videos?select=*&limit=1',
    method: 'GET',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 10000 // 10 second timeout
  };

  console.log('Attempting to connect to Supabase REST API...');
  
  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response status:', res.statusCode);
      console.log('Response headers:', res.headers);
      
      if (res.statusCode === 200) {
        try {
          const result = JSON.parse(data);
          console.log('✅ Supabase REST API connection successful!');
          console.log('✅ Sample data:', result);
          process.exit(0);
        } catch (parseError) {
          console.log('Raw response:', data);
          console.log('✅ Supabase REST API connection successful (non-JSON response)');
          process.exit(0);
        }
      } else {
        console.error('❌ Supabase REST API returned error status:', res.statusCode);
        console.error('Response:', data);
        process.exit(1);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Supabase REST API connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    process.exit(1);
  });
  
  req.on('timeout', () => {
    console.error('❌ Connection timeout');
    req.destroy();
    process.exit(1);
  });
  
  req.end();
}

testRestAPI();