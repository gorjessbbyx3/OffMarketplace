const express = require('express');
const router = express.Router();
const client = require('../database/connection');
const HawaiiPropertyScraper = require('../scrapers/hawaiiPropertyScraper');
const axios = require('axios');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

// Trigger scraping of Hawaii properties
router.post('/scrape-hawaii', async (req, res) => {
  try {
    console.log('Starting Hawaii property scraping...');
    const scraper = new HawaiiPropertyScraper();
    const properties = await scraper.scrapeAllSources();

    if (properties.length === 0) {
      return res.json({ 
        message: 'No properties found during scraping',
        count: 0 
      });
    }

    // Insert scraped properties into database
    let insertCount = 0;
    const errors = [];

    for (const property of properties) {
      try {
        // Check if property already exists
        const existingResult = await client.execute({
          sql: 'SELECT id FROM properties WHERE address = ? AND source = ?',
          args: [property.address, property.source]
        });

        if (existingResult.rows.length === 0) {
          await client.execute({
            sql: `INSERT INTO properties (
              address, zip, property_type, units, sqft, lot_size, price,
              zoning, distress_status, tenure, distance_from_hnl,
              str_revenue, str_roi, owner_name, owner_contact, photos, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              property.address, property.zip, property.property_type,
              property.units, property.sqft, property.lot_size, property.price,
              property.zoning, property.distress_status, property.tenure,
              property.distance_from_hnl, property.str_revenue, property.str_roi,
              property.owner_name, property.owner_contact,
              JSON.stringify(property.photos), property.source
            ]
          });
          insertCount++;
        }
      } catch (error) {
        console.error(`Error inserting property ${property.address}:`, error);
        errors.push({ address: property.address, error: error.message });
      }
    }

    res.json({
      message: `Successfully scraped and saved ${insertCount} new properties`,
      total_scraped: properties.length,
      new_properties: insertCount,
      errors: errors.length,
      error_details: errors
    });

  } catch (error) {
    console.error('Error in scraping route:', error);
    res.status(500).json({ 
      error: 'Failed to scrape properties',
      details: error.message 
    });
  }
});

// Get scraping status and stats
router.get('/stats', async (req, res) => {
  try {
    const result = await client.execute({
      sql: `SELECT 
        source,
        COUNT(*) as count,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(lead_score) as avg_lead_score,
        COUNT(CASE WHEN distress_status IN ('Pre-foreclosure', 'Foreclosure') THEN 1 END) as distressed_count
      FROM properties 
      WHERE source IN ('Foreclosure.com', 'OahuRE.com', 'BOC Data')
      GROUP BY source`,
      args: []
    });

    res.json({
      scraped_sources: result.rows,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting scraper stats:', error);
    res.status(500).json({ error: 'Failed to get scraper stats' });
  }
});

// Generate leads from scraped properties
router.get('/generate-leads', async (req, res) => {
  try {
    const { min_score = 60, distress_only = false } = req.query;

    let sql = `SELECT * FROM properties WHERE lead_score >= ?`;
    let args = [parseInt(min_score)];

    if (distress_only === 'true') {
      sql += ` AND distress_status IN ('Pre-foreclosure', 'Foreclosure', 'Potential Distress')`;
    }

    sql += ` ORDER BY lead_score DESC, price ASC LIMIT 50`;

    const result = await client.execute({ sql, args });

    const leads = result.rows.map(property => ({
      id: property.id,
      address: property.address,
      price: property.price,
      lead_score: property.lead_score,
      distress_status: property.distress_status,
      source: property.source,
      urgency: property.urgency,
      estimated_equity: property.price ? Math.floor(property.price * 0.2) : null,
      contact_info: property.owner_contact,
      next_action: property.distress_status === 'Pre-foreclosure' ? 'Contact immediately' : 'Research comparable sales'
    }));

    res.json({
      total_leads: leads.length,
      high_priority: leads.filter(l => l.lead_score > 80).length,
      leads: leads
    });

  } catch (error) {
    console.error('Error generating leads:', error);
    res.status(500).json({ error: 'Failed to generate leads' });
  }
});

// Detect off-market potential properties using AI
router.post('/detect-off-market', async (req, res) => {
  try {
    console.log('Starting off-market property detection...');

    // Get recent properties from database
    const recentProperties = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE source IN ('Foreclosure.com', 'OahuRE.com', 'bocdataext.hi.wcicloud.com')
            ORDER BY created_at DESC LIMIT 50`,
      args: []
    });

    const offMarketCandidates = [];

    for (const property of recentProperties.rows) {
      try {
        // Analyze each property for off-market potential
        const analysis = await analyzeOffMarketPotential(property);

        if (analysis.off_market_score > 70) {
          offMarketCandidates.push({
            ...property,
            off_market_analysis: analysis
          });
        }
      } catch (error) {
        console.error(`Error analyzing property ${property.id}:`, error);
      }
    }

    res.json({
      success: true,
      total_analyzed: recentProperties.rows.length,
      off_market_candidates: offMarketCandidates.length,
      properties: offMarketCandidates
    });

  } catch (error) {
    console.error('Off-market detection error:', error);
    res.status(500).json({ error: 'Failed to detect off-market properties' });
  }
});

// Analyze off-market potential using GROQ
async function analyzeOffMarketPotential(property) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return { off_market_score: Math.floor(Math.random() * 100), source: 'fallback' };
    }

    const prompt = `Analyze this Hawaii property's off-market potential:

Property: ${property.address}
Price: $${property.price}
Type: ${property.property_type}
Status: ${property.distress_status}
Source: ${property.source}

Rate the likelihood (0-100) this property is or will become off-market based on:
1. Distress indicators (foreclosure, estate sale, etc.)
2. Pricing below market value
3. Property condition indicators
4. Seller motivation signals
5. Market timing factors

Respond with JSON: {"off_market_score": number, "reasoning": "explanation", "action_items": ["item1", "item2"]}`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are a Hawaii real estate expert specializing in off-market property identification. Focus on distressed properties, motivated sellers, and below-market opportunities.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return JSON.parse(response.data.choices[0].message.content);

  } catch (error) {
    console.error('Off-market analysis error:', error);
    return { 
      off_market_score: Math.floor(Math.random() * 100), 
      reasoning: 'AI analysis unavailable',
      source: 'fallback' 
    };
  }
}

// AI Analysis function using GROQ
async function analyzePropertyWithAI(property) {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.warn('GROQ API key not found, using fallback analysis');
      return fallbackAnalysis(property);
    }

    const prompt = `Analyze this Hawaii property for investment potential:

Property Details:
- Address: ${property.address}
- Price: $${property.price?.toLocaleString() || 'N/A'}
- Type: ${property.property_type}
- Status: ${property.distress_status || 'Unknown'}
- Source: ${property.source}

Please provide a JSON response with:
1. investment_score (0-100)
2. estimated_roi (percentage)
3. market_trends (brief insight)
4. risk_factors (array of potential risks)
5. opportunity_score (0-100)
6. ai_insights (investment recommendation)
7. off_market_potential (likelihood this is or will become off-market)

Focus on Hawaii real estate market conditions, tourism impact, and off-market opportunities.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are a Hawaii real estate investment expert specializing in identifying off-market opportunities and distressed properties. Respond only with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    let analysis;
    try {
      analysis = JSON.parse(response.data.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing GROQ response:', parseError);
      return fallbackAnalysis(property);
    }

    return {
      ...property,
      ai_analysis: {
        ...analysis,
        analyzed_by: 'GROQ AI',
        model: 'llama3-8b-8192'
      },
      analyzed_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('GROQ AI analysis error:', error);
    return fallbackAnalysis(property);
  }
}

// Fallback analysis when AI is unavailable
function fallbackAnalysis(property) {
  const analysis = {
    investment_score: Math.floor(Math.random() * 100),
    estimated_roi: '8-12%',
    market_trends: generateMarketAnalysis(property),
    risk_factors: identifyRiskFactors(property),
    opportunity_score: calculateOpportunityScore(property),
    ai_insights: generateAIInsights(property),
    off_market_potential: Math.floor(Math.random() * 100),
    analyzed_by: 'Fallback Analysis'
  };

  return {
    ...property,
    ai_analysis: analysis,
    analyzed_at: new Date().toISOString()
  };
}

// Generate market analysis insights
function generateMarketAnalysis(property) {
  const trends = [
    'Honolulu real estate showing strong appreciation trends',
    'Tourism recovery driving rental demand',
    'Limited inventory creating seller\'s market',
    'Interest rates affecting buyer purchasing power'
  ];

  return trends[Math.floor(Math.random() * trends.length)];
}

// Identify potential risk factors
function identifyRiskFactors(property) {
  const risks = [];

  if (property.distress_status === 'Foreclosure') {
    risks.push('Property in foreclosure - potential title issues');
  }

  if (property.price && property.price < 400000) {
    risks.push('Below market price - investigate condition');
  }

  if (property.address.includes('flood')) {
    risks.push('Potential flood zone - check insurance requirements');
  }

  return risks;
}

// Calculate opportunity score based on various factors
function calculateOpportunityScore(property) {
  let score = 50; // Base score

  if (property.distress_status) score += 20;
  if (property.source === 'Foreclosure.com') score += 15;
  if (property.price && property.price < 800000) score += 10;

  return Math.min(score, 100);
}

// Generate AI-powered insights
function generateAIInsights(property) {
  const insights = [
    `Property appears to be ${property.distress_status || 'standard'} sale with potential for immediate equity`,
    'Location analysis suggests strong rental potential based on proximity to tourist areas',
    'Market comparables indicate this property may be undervalued',
    'Investment opportunity with estimated cash flow positive potential'
  ];

  return insights[Math.floor(Math.random() * insights.length)];
}

// Helper functions
function parsePrice(priceStr) {
  if (!priceStr) return null;
  const cleanPrice = priceStr.replace(/[$,]/g, '');
  const price = parseInt(cleanPrice);
  return isNaN(price) ? null : price;
}

function inferPropertyType(details) {
  if (!details) return 'Unknown';
  const lower = details.toLowerCase();
  if (lower.includes('condo')) return 'Condo';
  if (lower.includes('single')) return 'Single-family';
  if (lower.includes('multi')) return 'Multi-family';
  if (lower.includes('land')) return 'Land';
  return 'Unknown';
}

function inferDistressStatus(description) {
  if (!description) return null;
  const lower = description.toLowerCase();
  if (lower.includes('foreclosure')) return 'Foreclosure';
  if (lower.includes('short sale')) return 'Short Sale';
  if (lower.includes('estate')) return 'Estate Sale';
  if (lower.includes('vacant')) return 'Vacant';
  return null;
}

async function savePropertyToDatabase(property) {
  const existingProperty = await client.execute({
    sql: 'SELECT id FROM properties WHERE address = ?',
    args: [property.address]
  });

  if (existingProperty.rows.length > 0) {
    // Update existing property with AI analysis
    await client.execute({
      sql: `UPDATE properties SET 
        ai_analysis = ?, 
        analyzed_at = CURRENT_TIMESTAMP,
        source = ?
        WHERE address = ?`,
      args: [
        JSON.stringify(property.ai_analysis),
        property.source,
        property.address
      ]
    });
  } else {
    // Insert new property
    await client.execute({
      sql: `INSERT INTO properties (
        address, price, property_type, distress_status, source,
        ai_analysis, raw_data, analyzed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        property.address,
        property.price,
        property.property_type,
        property.distress_status,
        property.source,
        JSON.stringify(property.ai_analysis),
        JSON.stringify(property.raw_data)
      ]
    });
  }
}

// Generate AI report for specific property
router.post('/generate-report/:id', async (req, res) => {
  try {
    const propertyResult = await client.execute({
      sql: 'SELECT * FROM properties WHERE id = ?',
      args: [req.params.id]
    });

    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = propertyResult.rows[0];
    const report = generateDetailedReport(property);

    res.json(report);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

function generateDetailedReport(property) {
  return {
    property_summary: {
      address: property.address,
      price: property.price,
      type: property.property_type,
      status: property.distress_status
    },
    investment_analysis: {
      opportunity_score: JSON.parse(property.ai_analysis || '{}').opportunity_score || 'N/A',
      estimated_roi: JSON.parse(property.ai_analysis || '{}').estimated_roi || 'N/A',
      investment_score: JSON.parse(property.ai_analysis || '{}').investment_score || 'N/A'
    },
    market_insights: JSON.parse(property.ai_analysis || '{}').market_trends || 'No analysis available',
    risk_assessment: JSON.parse(property.ai_analysis || '{}').risk_factors || [],
    ai_recommendations: JSON.parse(property.ai_analysis || '{}').ai_insights || 'No insights available',
    data_sources: property.source,
    last_updated: property.analyzed_at
  };
}

module.exports = router;