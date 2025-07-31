
const express = require('express');
const router = express.Router();
const HawaiiPropertyScraper = require('../scrapers/hawaiiPropertyScraper');

// Test RESO API connection and data retrieval
router.get('/test-reso', async (req, res) => {
  try {
    const scraper = new HawaiiPropertyScraper();
    
    console.log('Testing Hawaii RESO API connection...');
    
    // Test the RESO API
    const mlsData = await scraper.getHawaiiMLSData();
    
    res.json({
      success: true,
      message: 'RESO API test completed',
      total_properties: mlsData.length,
      sample_properties: mlsData.slice(0, 3),
      api_status: mlsData.length > 0 ? 'Connected' : 'No data or API key missing',
      data_sources: mlsData.length > 0 ? 'Hawaii MLS via RESO Web API' : 'API key required'
    });

  } catch (error) {
    console.error('RESO API test error:', error);
    res.status(500).json({
      success: false,
      error: 'RESO API test failed',
      message: error.message,
      recommendation: 'Check HAWAII_RESO_API_KEY environment variable'
    });
  }
});

// Get specific property types from RESO API
router.post('/reso-search', async (req, res) => {
  try {
    const { property_type, status, min_price, max_price, zip } = req.body;
    
    const scraper = new HawaiiPropertyScraper();
    const mlsData = await scraper.getHawaiiMLSData();
    
    // Filter results based on criteria
    let filteredProperties = mlsData;
    
    if (property_type) {
      filteredProperties = filteredProperties.filter(p => 
        p.property_type?.toLowerCase().includes(property_type.toLowerCase())
      );
    }
    
    if (status) {
      filteredProperties = filteredProperties.filter(p => 
        p.distress_status?.toLowerCase().includes(status.toLowerCase())
      );
    }
    
    if (min_price) {
      filteredProperties = filteredProperties.filter(p => p.price >= min_price);
    }
    
    if (max_price) {
      filteredProperties = filteredProperties.filter(p => p.price <= max_price);
    }
    
    if (zip) {
      filteredProperties = filteredProperties.filter(p => p.zip === zip);
    }

    res.json({
      success: true,
      total_found: filteredProperties.length,
      properties: filteredProperties.slice(0, 20), // Limit to 20 results
      search_criteria: { property_type, status, min_price, max_price, zip }
    });

  } catch (error) {
    console.error('RESO search error:', error);
    res.status(500).json({
      success: false,
      error: 'RESO search failed',
      message: error.message
    });
  }
});

module.exports = router;
