
const express = require('express');
const router = express.Router();
const GroqClient = require('../utils/groqClient');
const client = require('../database/connection');

// Get AI market insights for all properties
router.post('/market-analysis', async (req, res) => {
  try {
    const groqClient = new GroqClient();
    
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

    // Get AI insights on off-market opportunities
    const insights = await groqClient.identifyOffMarketOpportunities(result.rows);

    res.json({
      success: true,
      properties_analyzed: result.rows.length,
      market_insights: insights,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to generate market analysis',
      details: error.message 
    });
  }
});

// Enhanced property analysis for specific property
router.post('/analyze-property/:id', async (req, res) => {
  try {
    const groqClient = new GroqClient();
    
    const result = await client.execute({
      sql: 'SELECT * FROM properties WHERE id = ?',
      args: [req.params.id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = result.rows[0];
    const analysis = await groqClient.analyzeProperty(property);

    // Update property with new analysis
    await client.execute({
      sql: `UPDATE properties SET 
            ai_analysis = ?,
            investment_score = ?,
            analyzed_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        JSON.stringify(analysis),
        analysis.investment_score || 5,
        req.params.id
      ]
    });

    res.json({
      success: true,
      property: property,
      analysis: analysis
    });

  } catch (error) {
    console.error('Property analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze property',
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

module.exports = router;
