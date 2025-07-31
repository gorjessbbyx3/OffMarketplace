const express = require('express');
const router = express.Router();
const { client } = require('../database/connection');

// Find off-market leads with comprehensive analysis
router.post('/find-off-market-leads', async (req, res) => {
  try {
    // Get recent properties from database
    const result = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE created_at > datetime('now', '-30 days') 
            ORDER BY created_at DESC 
            LIMIT 100`
    });

    const properties = result.rows;
    const offMarketLeads = [];

    // Analyze each property for off-market potential
    for (const property of properties) {
      try {
        const analysis = await analyzeOffMarketPotential(property);

        if (analysis.score >= 70) {
          offMarketLeads.push({
            ...property,
            off_market_analysis: analysis
          });
        }
      } catch (error) {
        console.error(`Error analyzing property ${property.id}:`, error);
      }
    }

    // Sort by score (highest first)
    offMarketLeads.sort((a, b) => b.off_market_analysis.score - a.off_market_analysis.score);

    res.json({
      success: true,
      total_analyzed: properties.length,
      leads: offMarketLeads,
      market_summary: `Found ${offMarketLeads.length} high-potential off-market opportunities`
    });

  } catch (error) {
    console.error('Off-market leads error:', error);
    res.status(500).json({ error: 'Failed to analyze off-market leads' });
  }
});

// Analyze off-market potential for a property
async function analyzeOffMarketPotential(property) {
  let score = 40;
  const indicators = [];
  const motivationSignals = [];
  const actionItems = [];

  // High priority distress indicators
  if (property.distress_status === 'Foreclosure') {
    score += 40;
    indicators.push('🚨 ACTIVE FORECLOSURE - Immediate Action Required');
    motivationSignals.push('Court-ordered sale - must sell');
    actionItems.push('Research foreclosure auction date immediately');
    actionItems.push('Contact trustee or foreclosure attorney');
  } else if (property.distress_status === 'Pre-foreclosure') {
    score += 35;
    indicators.push('⚠️ PRE-FORECLOSURE - Time-Sensitive Opportunity');
    motivationSignals.push('Mortgage default - facing foreclosure');
    actionItems.push('Contact owner before auction notice');
  }

  // Tax delinquency indicators
  const details = (property.details || '').toLowerCase();
  const source = (property.source || '').toLowerCase();

  if (details.includes('tax') || source.includes('legal notice')) {
    score += 25;
    indicators.push('💰 POTENTIAL TAX ISSUES');
    motivationSignals.push('Tax payment difficulties');
    actionItems.push('Verify property tax payment status');
    actionItems.push('Check for tax liens at County of Honolulu');
  }

  if (source.includes('county') || source.includes('honolulu')) {
    score += 20;
    indicators.push('🏛️ COUNTY RECORD - Tax Delinquency Potential');
    motivationSignals.push('Government record indicates potential distress');
    actionItems.push('Research county records for full details');
  }

  // Estate/probate situations
  if (details.includes('estate') || details.includes('probate')) {
    score += 30;
    indicators.push('👨‍⚖️ ESTATE/PROBATE SITUATION');
    motivationSignals.push('Heirs likely motivated to sell quickly');
    actionItems.push('Contact probate attorney or estate representative');
  }

  // Property condition indicators
  if (details.includes('fixer') || details.includes('needs work')) {
    score += 15;
    indicators.push('🔨 PROPERTY NEEDS WORK');
    motivationSignals.push('Owner may lack resources for repairs');
    actionItems.push('Estimate repair costs for offer calculation');
  }

  // Price analysis
  if (property.price && property.price < 500000) {
    score += 10;
    indicators.push('💵 BELOW MEDIAN PRICE');
    motivationSignals.push('Potentially underpriced for quick sale');
  }

  // Source reliability bonus
  if (source.includes('legal') || source.includes('court')) {
    score += 15;
    indicators.push('📰 LEGAL NOTICE SOURCE');
    motivationSignals.push('Official legal proceedings - high motivation');
  }

  return {
    score: Math.min(score, 100),
    confidence: score > 80 ? 'High' : score > 60 ? 'Medium' : 'Low',
    indicators,
    motivation_signals: motivationSignals,
    action_items: actionItems,
    investment_recommendation: generateInvestmentRecommendation(score),
    next_steps: generateNextSteps(score, property)
  };
}

// Generate investment recommendation based on score
function generateInvestmentRecommendation(score) {
  if (score >= 85) {
    return 'IMMEDIATE ACTION - Exceptional off-market opportunity';
  } else if (score >= 70) {
    return 'HIGH PRIORITY - Strong off-market potential';
  } else if (score >= 55) {
    return 'MONITOR - Moderate opportunity, watch for developments';
  } else {
    return 'LOW PRIORITY - Limited off-market indicators';
  }
}

// Generate specific next steps
function generateNextSteps(score, property) {
  const steps = [];

  if (score >= 70) {
    steps.push('Research property ownership and contact information');
    steps.push('Verify distress status through public records');
    steps.push('Prepare initial offer strategy');
    steps.push('Contact property owner or representative within 48 hours');
  } else if (score >= 55) {
    steps.push('Monitor for status changes');
    steps.push('Research comparable sales in area');
    steps.push('Add to watch list for future opportunities');
  } else {
    steps.push('Continue monitoring market conditions');
    steps.push('Look for additional distress indicators');
  }

  return steps;
}

// Get detailed analysis for specific property
router.get('/analyze/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;

    const result = await client.execute({
      sql: 'SELECT * FROM properties WHERE id = ?',
      args: [propertyId]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = result.rows[0];
    const analysis = await analyzeOffMarketPotential(property);

    res.json({
      success: true,
      property,
      analysis
    });

  } catch (error) {
    console.error('Property analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze property' });
  }
});

module.exports = router;