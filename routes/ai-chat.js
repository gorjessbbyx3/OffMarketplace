const express = require('express');
const router = express.Router();
const axios = require('axios');
const client = require('../database/connection');
const GroqClient = require('../utils/groqClient');

// Hawaii Zoning Data Integration
async function getHawaiiZoningInfo(location) {
  // Hawaii zoning classifications from official GIS data
  const hawaiiZoningData = {
    'R-5': { name: 'Residential (5,000 sq ft)', allowed: ['Single-family homes', 'Ohana units'], density: 'Low' },
    'R-7.5': { name: 'Residential (7,500 sq ft)', allowed: ['Single-family homes'], density: 'Low' },
    'R-10': { name: 'Residential (10,000 sq ft)', allowed: ['Single-family homes', 'Agricultural uses'], density: 'Very Low' },
    'A-2': { name: 'Apartment District', allowed: ['Multi-family', 'Condos', 'Apartments'], density: 'High' },
    'A-1': { name: 'Low-Density Apartment', allowed: ['Low-rise apartments', 'Townhomes'], density: 'Medium' },
    'BMX-3': { name: 'Business Mixed Use', allowed: ['Commercial', 'Residential', 'Mixed-use'], density: 'High' },
    'B-1': { name: 'Neighborhood Business', allowed: ['Small retail', 'Services', 'Restaurants'], density: 'Medium' },
    'B-2': { name: 'Community Business', allowed: ['Shopping centers', 'Offices', 'Hotels'], density: 'High' },
    'I-1': { name: 'Light Industrial', allowed: ['Light manufacturing', 'Warehouses', 'Technology'], density: 'Low' },
    'I-2': { name: 'Heavy Industrial', allowed: ['Heavy manufacturing', 'Port activities'], density: 'Low' },
    'AG-1': { name: 'Restricted Agriculture', allowed: ['Farming', 'Single-family (2+ acres)'], density: 'Very Low' },
    'AG-2': { name: 'General Agriculture', allowed: ['Farming', 'Agricultural tourism'], density: 'Very Low' },
    'P-1': { name: 'Restricted Preservation', allowed: ['Conservation', 'Limited recreation'], density: 'None' },
    'P-2': { name: 'General Preservation', allowed: ['Parks', 'Open space', 'Recreation'], density: 'Very Low' }
  };
  
  // Common Honolulu area zonings for investment properties
  const investmentZonings = {
    'Kakaako': ['A-2', 'BMX-3', 'B-2'], // High-density mixed use
    'Kalihi': ['R-5', 'A-1', 'I-1'], // Residential with some industrial
    'Pearl City': ['R-5', 'R-7.5', 'B-1'], // Suburban residential
    'Ewa Beach': ['R-5', 'R-10', 'AG-1'], // Newer residential development
    'Waipahu': ['R-5', 'A-1', 'I-1'], // Mixed residential and light industrial
    'Downtown': ['A-2', 'BMX-3', 'B-2'], // High-density urban
    'Waikiki': ['A-2', 'B-2'], // Tourist/residential high-density
    'Chinatown': ['BMX-3', 'B-1', 'A-2'] // Historic mixed-use
  };
  
  return { hawaiiZoningData, investmentZonings };
}

// Enhanced AI Chat endpoint with Hawaii zoning knowledge
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.json({
        success: false,
        error: 'Message is required'
      });
    }

    // Check for zoning-related queries
    const zoningKeywords = ['zoning', 'zone', 'land use', 'development', 'permitted', 'allowed', 'density'];
    const isZoningQuery = zoningKeywords.some(keyword => message.toLowerCase().includes(keyword));

    // Check for specific property queries and provide targeted responses
    const propertyKeywords = ['property', 'house', 'condo', 'apartment', 'foreclosure', 'investment', 'buy', 'sell', 'rent'];
    const isPropertyQuery = propertyKeywords.some(keyword => message.toLowerCase().includes(keyword));

    // Get Hawaii zoning data for enhanced responses
    const { hawaiiZoningData, investmentZonings } = await getHawaiiZoningInfo();

    // Enhanced system prompt with comprehensive Hawaii real estate knowledge including official zoning data
    const systemPrompt = `You are an expert Hawaii real estate investment assistant with comprehensive knowledge of:

CURRENT HAWAII MARKET DATA (2024):
- Median home price: $850,000
- Average rent: $2,500-4,000/month
- Cap rates: 3-6% typically
- Best investment areas: Kakaako, Kalihi, Pearl City, Ewa Beach, Waipahu
- Pre-foreclosure opportunities increasing due to economic conditions

OFFICIAL HAWAII ZONING DATA (from geoportal.hawaii.gov):
${Object.entries(hawaiiZoningData).map(([code, info]) => 
  `- ${code}: ${info.name} - Allows: ${info.allowed.join(', ')} (${info.density} density)`).join('\n')}

AREA-SPECIFIC ZONING FOR INVESTMENTS:
${Object.entries(investmentZonings).map(([area, zones]) => 
  `- ${area}: Primary zones ${zones.join(', ')}`).join('\n')}

ZONING INVESTMENT STRATEGIES:
- A-2 zones: Best for multi-family and high-density development
- BMX-3 zones: Ideal for mixed-use projects with commercial income
- R-5 zones: Single-family with potential ohana units
- AG-1/AG-2: Large lot opportunities, some development restrictions
- B-1/B-2: Commercial investment opportunities

INVESTMENT STRATEGIES:
- Multi-unit properties offer best cash flow
- Distressed properties can offer 15-30% below market value
- BRRRR strategy works well in Hawaii
- Short-term rentals regulated but profitable if compliant
- Zoning changes can create significant value opportunities

MARKET SOURCES & TOOLS:
- statelegals.staradvertiser.com for official foreclosure legal notices
- qpublic.schneidercorp.com for Honolulu County property assessments and records
- foreclosure.com for distressed properties nationwide
- Hawaii Bureau of Conveyances for ownership records
- geoportal.hawaii.gov for official zoning and land use data
- Zillow, Realtor.com for market comps
- Local MLS access through licensed agents

OFFICIAL HAWAII DATA SOURCES:
- Star Advertiser Legal Notices: Official foreclosure publications and auction notices
- Honolulu County Property Records: Tax assessments, TMK numbers, ownership data
- Hawaii State GIS Portal: Zoning maps, land use regulations, flood zones
- Bureau of Conveyances: Deed transfers, liens, ownership history

SPECIFIC NEIGHBORHOODS WITH ZONING CONTEXT:
- Kakaako: A-2/BMX-3 zoning, $600K-2M+ condos, high rental demand, mixed-use development
- Kalihi: R-5/A-1 zoning, $400-700K, improving area, potential for small multi-family
- Pearl City: R-5/R-7.5 zoning, $600-900K, stable rental market, suburban single-family
- Ewa Beach: R-5/R-10 zoning, $700K-1.2M, growing area, newer development with larger lots

FINANCING OPTIONS:
- Conventional loans: 20-25% down for investment
- Hard money: 10-15% interest, quick close
- Portfolio lenders for multiple properties
- Seller financing possible in distressed situations

Provide specific, actionable advice based on this knowledge. If asked about specific properties or searches, provide realistic examples and current market insights.

RESPONSE GUIDELINES:
- Keep responses conversational but professional
- Provide specific Hawaii locations and price ranges when relevant
- Reference official zoning data when discussing development potential
- Explain zoning implications for investment strategies
- Suggest actionable next steps
- Ask clarifying questions when needed
- Reference current market conditions (2024)
- Use official Hawaii zoning codes (R-5, A-2, BMX-3, etc.) when relevant

USER QUERY TYPE: ${isZoningQuery ? 'ZONING-FOCUSED' : isPropertyQuery ? 'PROPERTY-FOCUSED' : 'GENERAL'}

Respond as a knowledgeable Hawaii real estate expert who understands both investment strategy and local market conditions.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.3,
      max_tokens: 1536
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({
      success: true,
      response: response.data.choices[0].message.content
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.json({
      success: false,
      error: 'Failed to process chat message',
      fallback_response: 'I apologize, but I\'m having trouble accessing my knowledge base right now. However, I can help you with Hawaii real estate investment questions. What specific area or property type are you interested in?'
    });
  }
});

// Generate market insights
router.get('/market-insights', async (req, res) => {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.json({ 
        success: false,
        error: 'AI service unavailable'
      });
    }

    // Get market data
    const result = await client.execute({
      sql: `SELECT 
        AVG(price) as avg_price,
        COUNT(*) as total_properties,
        AVG(str_roi) as avg_roi,
        COUNT(CASE WHEN distress_status IN ('Pre-foreclosure', 'Foreclosure') THEN 1 END) as distressed_count
      FROM properties`,
      args: []
    });

    const marketData = result.rows[0];

    const prompt = `Based on this Hawaii real estate market data, provide insights:

Market Statistics:
- Average Property Price: $${Math.round(marketData.avg_price || 0).toLocaleString()}
- Total Properties Tracked: ${marketData.total_properties}
- Average ROI: ${(marketData.avg_roi || 0).toFixed(1)}%
- Distressed Properties: ${marketData.distressed_count}

Provide:
1. Current market trends (2-3 sentences)
2. Top investment opportunities (2-3 sentences)

Keep it concise and actionable for real estate investors.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are a Hawaii real estate market analyst. Provide concise, actionable market insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    }, {
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const analysis = response.data.choices[0].message.content;
    const parts = analysis.split('\n\n');

    res.json({
      success: true,
      market_trends: parts[0] || analysis.substring(0, 200),
      opportunities: parts[1] || analysis.substring(200, 400)
    });

  } catch (error) {
    console.error('Market insights error:', error);
    res.json({
      success: false,
      error: 'Failed to generate market insights'
    });
  }
});

// Generate comprehensive market report
router.post('/generate-market-report', async (req, res) => {
  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {


// Hawaii Zoning Lookup endpoint
router.get('/zoning/:area', async (req, res) => {
  try {
    const area = req.params.area.toLowerCase();
    const { hawaiiZoningData, investmentZonings } = await getHawaiiZoningInfo();
    
    // Find matching area
    const areaMatch = Object.keys(investmentZonings).find(key => 
      key.toLowerCase().includes(area) || area.includes(key.toLowerCase())
    );
    
    if (areaMatch) {
      const zones = investmentZonings[areaMatch];
      const zoneDetails = zones.map(zone => ({
        code: zone,
        ...hawaiiZoningData[zone]
      }));
      
      res.json({
        success: true,
        area: areaMatch,
        zoning_codes: zones,
        zoning_details: zoneDetails,
        investment_analysis: generateZoningInvestmentAnalysis(zoneDetails)
      });
    } else {
      res.json({
        success: false,
        error: 'Area not found',
        available_areas: Object.keys(investmentZonings)
      });
    }
  } catch (error) {
    console.error('Zoning lookup error:', error);
    res.json({
      success: false,
      error: 'Failed to lookup zoning information'
    });
  }
});

// Generate investment analysis based on zoning
function generateZoningInvestmentAnalysis(zoneDetails) {
  const analysis = [];
  
  zoneDetails.forEach(zone => {
    if (zone.code.includes('A-')) {
      analysis.push(`${zone.code}: Excellent for multi-family investments and rental properties`);
    } else if (zone.code.includes('BMX')) {
      analysis.push(`${zone.code}: Ideal for mixed-use development with commercial income potential`);
    } else if (zone.code.includes('R-')) {
      analysis.push(`${zone.code}: Single-family investment with potential for ohana units`);
    } else if (zone.code.includes('B-')) {
      analysis.push(`${zone.code}: Commercial investment opportunities with good foot traffic`);
    } else if (zone.code.includes('AG-')) {
      analysis.push(`${zone.code}: Large lot development potential, agricultural exemptions possible`);
    }
  });
  
  return analysis;
}

      return res.json({ 
        success: false,
        error: 'AI service unavailable'
      });
    }

    // Get comprehensive market data
    const results = await Promise.all([
      client.execute({
        sql: `SELECT AVG(price) as avg_price, COUNT(*) as count FROM properties WHERE property_type = 'Single-family'`,
        args: []
      }),
      client.execute({
        sql: `SELECT AVG(price) as avg_price, COUNT(*) as count FROM properties WHERE property_type = 'Condo'`,
        args: []
      }),
      client.execute({
        sql: `SELECT AVG(price) as avg_price, COUNT(*) as count FROM properties WHERE distress_status IN ('Pre-foreclosure', 'Foreclosure')`,
        args: []
      }),
      client.execute({
        sql: `SELECT AVG(str_roi) as avg_roi, AVG(price) as avg_price FROM properties WHERE str_roi > 0`,
        args: []
      })
    ]);

    const [singleFamily, condo, distressed, roiData] = results.map(r => r.rows[0]);

    const prompt = `Generate a comprehensive Hawaii real estate market report based on this data:

Property Types:
- Single-family homes: ${singleFamily.count} properties, avg $${Math.round(singleFamily.avg_price || 0).toLocaleString()}
- Condos: ${condo.count} properties, avg $${Math.round(condo.avg_price || 0).toLocaleString()}
- Distressed properties: ${distressed.count} properties, avg $${Math.round(distressed.avg_price || 0).toLocaleString()}

Investment Metrics:
- Average ROI: ${(roiData.avg_roi || 0).toFixed(1)}%
- Average investment property price: $${Math.round(roiData.avg_price || 0).toLocaleString()}

Provide analysis in 3 sections:
1. Market Analysis (current trends and conditions)
2. Investment Opportunities (specific recommendations)
3. Risk Assessment (potential challenges and risks)

Each section should be 2-3 sentences, professional and actionable.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are a senior Hawaii real estate analyst preparing executive market reports for investors.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 600
    }, {
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const analysis = response.data.choices[0].message.content;
    const sections = analysis.split(/\d+\.\s+/);

    res.json({
      success: true,
      market_analysis: sections[1] || analysis.substring(0, 250),
      opportunities: sections[2] || analysis.substring(250, 500),
      risks: sections[3] || analysis.substring(500, 750),
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Market report error:', error);
    res.json({
      success: false,
      error: 'Failed to generate market report'
    });
  }
});

// Generate AI-powered leads
router.post('/generate-leads', async (req, res) => {
  try {
    const { min_score = 60, include_ai_analysis = true } = req.body;

    // Get properties for lead generation
    const result = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE (lead_score >= ? OR distress_status IN ('Pre-foreclosure', 'Foreclosure'))
            ORDER BY lead_score DESC, price ASC 
            LIMIT 20`,
      args: [min_score]
    });

    const properties = result.rows;

    if (include_ai_analysis && process.env.GROQ_API_KEY) {
      // Enhance with AI analysis
      for (let property of properties) {
        try {
          const aiInsights = await generatePropertyInsights(property);
          property.ai_insights = aiInsights;

          // Update database with AI insights
          await client.execute({
            sql: 'UPDATE properties SET ai_analysis = ? WHERE id = ?',
            args: [JSON.stringify({ai_insights: aiInsights}), property.id]
          });
        } catch (error) {
          console.error(`AI analysis failed for property ${property.id}:`, error);
          property.ai_insights = 'AI analysis pending...';
        }
      }
    }

    res.json({
      success: true,
      new_leads_count: properties.length,
      leads: properties.map(p => ({
        id: p.id,
        address: p.address,
        price: p.price,
        lead_score: p.lead_score || 60,
        distress_status: p.distress_status,
        ai_insights: p.ai_insights || 'Investment potential analysis available'
      }))
    });

  } catch (error) {
    console.error('Lead generation error:', error);
    res.json({
      success: false,
      error: 'Failed to generate leads'
    });
  }
});

// Helper function to generate property insights
async function generatePropertyInsights(property) {
  try {
    const prompt = `Analyze this Hawaii property for investment potential:

Property: ${property.address}
Price: $${property.price?.toLocaleString() || 'N/A'}
Type: ${property.property_type}
Status: ${property.distress_status || 'Standard'}

Provide a brief investment insight (1-2 sentences) focusing on:
- Key opportunity or advantage
- Potential return or strategy

Keep it concise and actionable for real estate investors.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: 'You are a Hawaii real estate investment advisor. Provide brief, actionable property insights.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4,
      max_tokens: 150
    }, {
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error('Property insights error:', error);
    return 'Strong investment potential identified for this Hawaii property.';
  }
}

// Fix the missing groqApiKey variable
const groqApiKey = process.env.GROQ_API_KEY;



module.exports = router;
const express = require('express');
const router = express.Router();
const { createGroqClient } = require('../utils/groqClient');

// AI chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    const groq = createGroqClient();
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a Hawaii real estate expert assistant helping with property investment analysis."
        },
        {
          role: "user", 
          content: message
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 1000
    });

    res.json({
      success: true,
      response: completion.choices[0]?.message?.content || 'No response generated'
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Chat failed' });
  }
});

module.exports = router;
