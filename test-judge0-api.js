// Test Judge0 API Key
const https = require('https');

const API_KEY = '611a646ea9msh052affb0d888dd5p173bf2jsnbe9763eb46ac';

const options = {
  method: 'GET',
  hostname: 'judge0-ce.p.rapidapi.com',
  port: null,
  path: '/about',
  headers: {
    'x-rapidapi-key': API_KEY,
    'x-rapidapi-host': 'judge0-ce.p.rapidapi.com'
  }
};

console.log('Testing Judge0 API Key...');
console.log('API Key:', API_KEY);
console.log('Endpoint: https://judge0-ce.p.rapidapi.com/about');
console.log('');

const req = https.request(options, function (res) {
  const chunks = [];

  console.log('Status Code:', res.statusCode);
  console.log('Status Message:', res.statusMessage);
  console.log('');

  res.on('data', function (chunk) {
    chunks.push(chunk);
  });

  res.on('end', function () {
    const body = Buffer.concat(chunks);
    const response = body.toString();
    
    console.log('Response:');
    console.log(response);
    console.log('');

    if (res.statusCode === 200) {
      console.log('✅ SUCCESS: Judge0 API key is valid!');
    } else if (res.statusCode === 403) {
      console.log('❌ ERROR: API key is invalid or expired');
      console.log('');
      console.log('Solutions:');
      console.log('1. Get a new API key from: https://rapidapi.com/judge0-official/api/judge0-ce');
      console.log('2. Subscribe to the Judge0 CE API (free tier available)');
      console.log('3. Update VITE_JUDGE0_API_KEY in your .env file');
    } else {
      console.log('⚠️ WARNING: Unexpected status code');
    }
  });
});

req.on('error', function (error) {
  console.error('❌ Request failed:', error);
});

req.end();
