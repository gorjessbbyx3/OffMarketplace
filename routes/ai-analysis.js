
const express = require('express');
const router = express.Router();
const GroqClient = require('../utils/groqClient');
const AnthropicClient = require('../utils/anthropicClient');
const client = require('../database/connection');

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

// Specialized search for Kakaako apartments in pre-foreclosure
router.post('/find-kakaako-apartment', async (req, res) => {
  try {
    const groqClient = new GroqClient();
    
    // First check database for existing matches
    const dbResult = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE (address LIKE '%Kakaako%' OR address LIKE '%Kaka%ako%' OR zip = '96813')
            AND units >= 4 
            AND price BETWEEN 1500000 AND 2500000
            AND (distress_status LIKE '%foreclosure%' OR distress_status LIKE '%Foreclosure%')
            ORDER BY price ASC`,
      args: []
    });

    // Use GROQ AI to search for specific Kakaako 4-unit apartment in pre-foreclosure
    const aiSearchResult = await groqClient.findSpecificProperty({
      location: 'Kakaako, Honolulu, Hawaii',
      property_type: '4-unit apartment',
      price_range: '$1.8M - $2.2M',
      status: 'pre-foreclosure',
      specific_request: 'Find the exact address of a 4-unit apartment building in Kakaako that is in pre-foreclosure status for approximately $2 million'
    });

    res.json({
      success: true,
      database_matches: dbResult.rows,
      ai_search_result: aiSearchResult,
      search_criteria: {
        location: 'Kakaako',
        units: 4,
        price_target: '$2,000,000',
        status: 'pre-foreclosure'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Kakaako search error:', error);
    res.status(500).json({ 
      error: 'Failed to search for Kakaako apartment',
      details: error.message 
    });
  }
});

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

module.exports = router;
