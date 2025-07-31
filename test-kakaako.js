
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testKakaakoSearch() {
  console.log('🏢 Testing Kakaako Apartment Search...\n');

  try {
    console.log('🔍 Searching for 4-unit apartment in Kakaako (pre-foreclosure, ~$2M)...');
    
    const response = await axios.get(`${BASE_URL}/api/test/kakaako-search`);
    
    console.log('✅ Kakaako search completed successfully!\n');
    
    // Display search criteria
    console.log('📋 Search Criteria:');
    console.log(`   Location: ${response.data.search_criteria.location}`);
    console.log(`   Property Type: ${response.data.search_criteria.property_type}`);
    console.log(`   Status: ${response.data.search_criteria.status}`);
    console.log(`   Price Target: ${response.data.search_criteria.price_target}`);
    console.log(`   Model Used: ${response.data.model}\n`);
    
    // Display search results preview
    console.log('🏠 AI Search Results:');
    console.log('─'.repeat(60));
    console.log(response.data.search_results);
    console.log('─'.repeat(60));
    
    // Test the enhanced Kakaako search endpoint if available
    console.log('\n🤖 Testing enhanced AI analysis endpoint...');
    
    try {
      const enhancedResponse = await axios.post(`${BASE_URL}/api/ai/find-kakaako-apartment`);
      console.log('✅ Enhanced search completed!');
      console.log('Database matches:', enhancedResponse.data.database_matches?.length || 0);
      console.log('AI insights available:', !!enhancedResponse.data.ai_search_result);
    } catch (enhancedError) {
      console.log('ℹ️  Enhanced endpoint not available or requires different parameters');
    }
    
    console.log('\n🎉 Kakaako test completed successfully!');

  } catch (error) {
    console.error('❌ Kakaako test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure your server is running first. Click the Run button or run: npm run dev');
    } else if (error.response?.status === 500) {
      console.log('\n💡 Check that your GROQ_API_KEY is set in environment variables');
    }
  }
}

testKakaakoSearch();
