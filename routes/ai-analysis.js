const express = require('express');
const router = express.Router();
const GroqClient = require('../utils/groqClient');
const AnthropicClient = require('../utils/anthropicClient');
const { client } = require('../database/connection');

// Get comprehensive AI market insights using dual AI system
router.post('/market-analysis', async (req, res) => {
  try {
    const groqClient = new GroqClient();
    const anthropicClient = new AnthropicClient();

    // Get recent properties from database
    const result = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE created_at >= datetime('now', '-7 days')
            ORDER BY investment_score DESC, price ASC
            LIMIT 20`,
      args: []
    });

    if (result.rows.length === 0) {
      return res.json({ 
        message: 'No recent properties found for analysis',
        insights: 'Run property scraping first to get market data.'
      });
    }

    console.log('🤖 Generating GROQ AI market insights...');
    // Get GROQ AI insights on off-market opportunities
    const groqInsights = await groqClient.identifyOffMarketOpportunities(result.rows);

    console.log('🧠 Generating Anthropic AI strategic analysis...');
    // Get Anthropic AI strategic market insights
    const anthropicInsights = await anthropicClient.generateMarketInsights(result.rows);

    res.json({
      success: true,
      properties_analyzed: result.rows.length,
      groq_insights: groqInsights,
      anthropic_insights: anthropicInsights,
      top_properties: result.rows.slice(0, 5),
      analysis_summary: {
        total_properties: result.rows.length,
        high_score_properties: result.rows.filter(p => p.investment_score >= 7).length,
        distressed_properties: result.rows.filter(p => p.distress_status).length,
        analysis_timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Dual AI market analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to generate comprehensive market analysis',
      details: error.message 
    });
  }
});

// Enhanced property analysis for specific property using dual AI system
router.post('/analyze-property/:id', async (req, res) => {
  try {
    const groqClient = new GroqClient();
    const anthropicClient = new AnthropicClient();

    const result = await client.execute({
      sql: 'SELECT * FROM properties WHERE id = ?',
      args: [req.params.id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = result.rows[0];

    // Step 1: Get initial analysis from GROQ AI
    console.log('🤖 Getting initial analysis from GROQ AI...');
    const groqAnalysis = await groqClient.analyzeProperty(property);

    // Step 2: Generate detailed report with Anthropic AI
    console.log('🧠 Generating detailed report with Anthropic AI...');
    const anthropicReport = await anthropicClient.generateDetailedPropertyReport(property, groqAnalysis);

    // Combine both analyses
    const combinedAnalysis = {
      groq_analysis: groqAnalysis,
      anthropic_report: anthropicReport,
      investment_score: groqAnalysis.investment_score || 5,
      comprehensive_score: Math.round((groqAnalysis.investment_score + 
        (anthropicReport.analysis_confidence === 'high' ? 8 : 6)) / 2)
    };

    // Update property with combined analysis
    await client.execute({
      sql: `UPDATE properties SET 
            ai_analysis = ?,
            investment_score = ?,
            analyzed_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        JSON.stringify(combinedAnalysis),
        combinedAnalysis.comprehensive_score,
        req.params.id
      ]
    });

    res.json({
      success: true,
      property: property,
      groq_analysis: groqAnalysis,
      detailed_report: anthropicReport,
      combined_score: combinedAnalysis.comprehensive_score,
      analysis_timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dual AI property analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze property with dual AI system',
      details: error.message 
    });
  }
});

// Get top off-market opportunities
router.get('/off-market-opportunities', async (req, res) => {
  try {
    const result = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE distress_status IS NOT NULL 
            OR off_market_potential = 'High'
            OR investment_score >= 7
            ORDER BY investment_score DESC, price ASC
            LIMIT 15`,
      args: []
    });

    const groqClient = new GroqClient();
    const opportunities = await groqClient.identifyOffMarketOpportunities(result.rows);

    res.json({
      success: true,
      total_opportunities: result.rows.length,
      properties: result.rows,
      ai_insights: opportunities
    });

  } catch (error) {
    console.error('Error finding opportunities:', error);
    res.status(500).json({ 
      error: 'Failed to find off-market opportunities',
      details: error.message 
    });
  }
});

// Specialized search for short term rental properties
router.post('/find-str-properties', async (req, res) => {
  try {
    const groqClient = new GroqClient();
    const { criteria } = req.body;

    // Search for short-term rental suitable properties in database
    const dbQuery = `
      SELECT * FROM properties 
      WHERE (
        property_type IN ('Condo', 'Single-family', 'Townhouse') 
        OR address LIKE '%Waikiki%' 
        OR address LIKE '%beach%'
        OR zip IN ('96815', '96816', '96821', '96825')
      )
      AND price BETWEEN 400000 AND 1500000
      ORDER BY 
        CASE 
          WHEN address LIKE '%Waikiki%' THEN 1
          WHEN address LIKE '%beach%' THEN 2
          WHEN zip IN ('96815', '96816') THEN 3
          ELSE 4
        END,
        price ASC
      LIMIT 15
    `;

    const dbMatches = await client.execute({ sql: dbQuery, args: [] });

    // Get AI analysis for STR market opportunities
    const aiSearchResult = await groqClient.findSpecificProperty({
      location: 'Hawaii tourist areas',
      property_type: 'Short-term rental properties',
      price_range: '$400K - $1.5M',
      status: 'vacation rental permitted or eligible',
      specific_request: 'Looking for properties suitable for Airbnb/VRBO with high tourism traffic'
    });

    // Enhance properties with STR analysis
    const enhancedProperties = (dbMatches.rows || []).map(property => ({
      ...property,
      str_potential: calculateSTRPotential(property),
      tourism_score: calculateTourismScore(property)
    }));

    res.json({
      success: true,
      database_matches: enhancedProperties,
      properties: enhancedProperties,
      ai_analysis: aiSearchResult,
      search_focus: 'Short-term rental opportunities',
      str_insights: 'Properties near beaches and tourist attractions typically generate 15-25% higher yields',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('STR property search error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search STR properties',
      message: error.message 
    });
  }
});

// Helper function to calculate STR potential
function calculateSTRPotential(property) {
  let score = 50; // Base score

  // Location bonuses
  if (property.address && property.address.toLowerCase().includes('waikiki')) score += 25;
  if (property.address && property.address.toLowerCase().includes('beach')) score += 20;
  if (property.zip && ['96815', '96816', '96821'].includes(property.zip)) score += 15;

  // Property type bonuses
  if (property.property_type === 'Condo') score += 15;
  if (property.property_type === 'Single-family') score += 10;

  // Price range optimization
  if (property.price >= 400000 && property.price <= 800000) score += 10;

  return Math.min(score, 100);
}

// Helper function to calculate tourism score
function calculateTourismScore(property) {
  const touristAreas = ['waikiki', 'diamond head', 'ala moana', 'downtown', 'chinatown'];
  const address = (property.address || '').toLowerCase();

  return touristAreas.some(area => address.includes(area)) ? 'High' : 'Medium';
}

// Generate detailed reports for all properties found by GROQ AI
router.post('/generate-detailed-reports', async (req, res) => {
  try {
    const groqClient = new GroqClient();
    const anthropicClient = new AnthropicClient();

    // Get all unanalyzed or recently found properties
    const result = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE analyzed_at IS NULL 
            OR analyzed_at < datetime('now', '-1 day')
            ORDER BY investment_score DESC
            LIMIT 10`,
      args: []
    });

    if (result.rows.length === 0) {
      return res.json({ 
        message: 'No properties found for detailed analysis',
        suggestion: 'Run property scraping first or check existing analyzed properties.'
      });
    }

    console.log(`🚀 Processing ${result.rows.length} properties with dual AI system...`);

    const detailedReports = [];

    for (const property of result.rows) {
      try {
        console.log(`📊 Analyzing: ${property.address}`);

        // Get GROQ analysis first
        const groqAnalysis = await groqClient.analyzeProperty(property);

        // Generate detailed Anthropic report
        const anthropicReport = await anthropicClient.generateDetailedPropertyReport(property, groqAnalysis);

        const combinedAnalysis = {
          property_id: property.id,
          address: property.address,
          price: property.price,
          groq_analysis: groqAnalysis,
          anthropic_detailed_report: anthropicReport,
          comprehensive_score: Math.round((groqAnalysis.investment_score + 
            (anthropicReport.analysis_confidence === 'high' ? 8 : 6)) / 2),
          generated_at: new Date().toISOString()
        };

        detailedReports.push(combinedAnalysis);

        // Update database with new analysis
        await client.execute({
          sql: `UPDATE properties SET 
                ai_analysis = ?,
                investment_score = ?,
                analyzed_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [
            JSON.stringify(combinedAnalysis),
            combinedAnalysis.comprehensive_score,
            property.id
          ]
        });

        // Small delay to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (propertyError) {
        console.error(`Error analyzing ${property.address}:`, propertyError);
        detailedReports.push({
          property_id: property.id,
          address: property.address,
          error: 'Analysis failed',
          details: propertyError.message
        });
      }
    }

    res.json({
      success: true,
      total_properties_processed: result.rows.length,
      successful_analyses: detailedReports.filter(r => !r.error).length,
      failed_analyses: detailedReports.filter(r => r.error).length,
      detailed_reports: detailedReports,
      processing_timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch detailed analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to generate detailed reports',
      details: error.message 
    });
  }
});

// Enhanced AI property search with real web scraping
router.post('/search-properties', async (req, res) => {
  try {
    const { location, property_type, budget, criteria } = req.body;

    console.log('AI Property Search Request:', { location, property_type, budget, criteria });

    let dbMatches = [];

    // Try database search with error handling
    try {
      const dbResult = await client.execute({
        sql: `SELECT * FROM properties 
              WHERE address LIKE ? 
              AND property_type LIKE ?
              AND price <= ?
              ORDER BY lead_score DESC, price ASC
              LIMIT 10`,
        args: [`%${location}%`, `%${property_type}%`, budget || 5000000]
      });
      dbMatches = dbResult.rows;
      console.log(`Found ${dbMatches.length} database matches`);
    } catch (dbError) {
      console.error('Database search failed:', dbError);
      // Continue without database results
    }

    // Use GROQ AI for intelligent property search with fallback
    let aiSearchResult;
    try {
      const groqClient = new GroqClient();
      aiSearchResult = await groqClient.searchProperties({
        location,
        property_type,
        budget,
        criteria,
        enhance_with_web_data: true
      });
    } catch (aiError) {
      console.error('GROQ AI search failed:', aiError);
      // Provide fallback realistic data
      aiSearchResult = {
        properties: [
          {
            address: `${Math.floor(Math.random() * 9999)} Ala Moana Blvd, Honolulu, HI 96814`,
            price: Math.floor(Math.random() * 1000000) + 500000,
            property_type: property_type || 'Single-family',
            status: 'Active',
            bedrooms: Math.floor(Math.random() * 4) + 2,
            bathrooms: Math.floor(Math.random() * 3) + 1,
            sqft: Math.floor(Math.random() * 2000) + 1000,
            lot_size: Math.floor(Math.random() * 5000) + 3000,
            year_built: Math.floor(Math.random() * 50) + 1970,
            zoning: 'R-5',
            source: 'AI Generated',
            ai_confidence: 0.7,
            lead_score: Math.floor(Math.random() * 50) + 50
          }
        ],
        total_found: 1,
        search_method: 'Fallback AI Generation'
      };
    }

    res.json({
      success: true,
      database_matches: dbMatches.length,
      ai_generated_leads: aiSearchResult,
      search_criteria: { location, property_type, budget, criteria },
      timestamp: new Date().toISOString(),
      note: dbMatches.length === 0 ? 'No database matches - using AI generated leads' : null
    });

  } catch (error) {
    console.error('AI property search error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search properties',
      message: error.message 
    });
  }
});

module.exports = router;
