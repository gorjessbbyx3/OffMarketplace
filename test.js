
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Running API Tests...\n');

  try {
    // Test 1: Basic GROQ API test
    console.log('1. Testing GROQ API Hello endpoint...');
    const helloResponse = await axios.get(`${BASE_URL}/api/test/hello`);
    console.log('✅ Hello test passed');
    console.log('Response:', helloResponse.data.message.substring(0, 100) + '...\n');

    // Test 2: Kakaako search test
    console.log('2. Testing Kakaako apartment search...');
    const searchResponse = await axios.get(`${BASE_URL}/api/test/kakaako-search`);
    console.log('✅ Kakaako search test passed');
    console.log('Search criteria:', searchResponse.data.search_criteria);
    console.log('Results preview:', searchResponse.data.search_results.substring(0, 150) + '...\n');

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your server is running first. Click the Run button or run: npm run dev');
    }
  }
}

runTests();
