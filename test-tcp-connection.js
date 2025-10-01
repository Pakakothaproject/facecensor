const net = require('net');

// Test direct TCP connection to Supabase PostgreSQL port
const SUPABASE_HOST = 'aaitxlxpoplreysthvrf.supabase.co';
const SUPABASE_PORT = 5432;

console.log('Testing direct TCP connection to Supabase PostgreSQL port...');
console.log('Host:', SUPABASE_HOST);
console.log('Port:', SUPABASE_PORT);

function testTCPConnection() {
  const socket = new net.Socket();
  
  socket.setTimeout(10000); // 10 second timeout
  
  socket.on('connect', () => {
    console.log('✅ TCP connection successful - port is open');
    console.log('✅ Supabase PostgreSQL port is reachable');
    socket.destroy();
    process.exit(0);
  });
  
  socket.on('error', (error) => {
    console.error('❌ TCP connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused - PostgreSQL port is not accessible');
    } else if (error.code === 'ENOTFOUND') {
      console.error('Host not found - check Supabase host');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection timeout - check network connectivity');
    } else if (error.code === 'EHOSTUNREACH') {
      console.error('Host unreachable - network routing issue');
    }
    process.exit(1);
  });
  
  socket.on('timeout', () => {
    console.error('❌ Connection timeout');
    socket.destroy();
    process.exit(1);
  });
  
  console.log('Attempting TCP connection...');
  socket.connect(SUPABASE_PORT, SUPABASE_HOST);
}

testTCPConnection();