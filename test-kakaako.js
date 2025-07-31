const axios = require('axios');

async function testKakaakoSearch() {
  try {
    console.log('🏠 Testing Kakaako property search...');

    const response = await axios.post('http://localhost:5000/api/off-market/leads', {
      location: 'Kakaako',
      property_type: 'condo'
    });

    console.log('✅ Response received:', response.data);

    if (response.data.success && response.data.leads) {
      console.log(`Found ${response.data.leads.length} potential leads`);

      response.data.leads.slice(0, 3).forEach((lead, index) => {
        console.log(`\nLead ${index + 1}:`);
        console.log(`Address: ${lead.address}`);
        console.log(`Score: ${lead.off_market_score}`);
        console.log(`Analysis: ${lead.off_market_analysis?.summary || 'No analysis'}`);
      });
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

// Run the test
testKakaakoSearch();