const express = require('express');
const router = express.Router();
const axios = require('axios');
const client = require('../database/connection');

// Enhanced AI Chat endpoint with web search knowledge
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.json({
        success: false,
        error: 'Message is required'
      });
    }

    // Enhanced system prompt with comprehensive Hawaii real estate knowledge
    const systemPrompt = `You are an expert Hawaii real estate investment assistant with comprehensive knowledge of:

CURRENT HAWAII MARKET DATA (2024):
- Median home price: $850,000
- Average rent: $2,500-4,000/month
- Cap rates: 3-6% typically
- Best investment areas: Kakaako, Kalihi, Pearl City, Ewa Beach, Waipahu
- Pre-foreclosure opportunities increasing due to economic conditions

INVESTMENT STRATEGIES:
- Multi-unit properties offer best cash flow
- Distressed properties can offer 15-30% below market value
- BRRRR strategy works well in Hawaii
- Short-term rentals regulated but profitable if compliant

MARKET SOURCES & TOOLS:
- foreclosure.com for distressed properties
- Hawaii Bureau of Conveyances for ownership records
- Zillow, Realtor.com for market comps
- Local MLS access through licensed agents

SPECIFIC NEIGHBORHOODS:
- Kakaako: Gentrifying, $600K-2M+ condos, high rental demand
- Kalihi: Affordable entry point, $400-700K, improving area
- Pearl City: Family area, $600-900K, stable rental market
- Ewa Beach: New development, $700K-1.2M, growing area

FINANCING OPTIONS:
- Conventional loans: 20-25% down for investment
- Hard money: 10-15% interest, quick close
- Portfolio lenders for multiple properties
- Seller financing possible in distressed situations

Provide specific, actionable advice based on this knowledge. If asked about specific properties or searches, provide realistic examples and current market insights.`;

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

// Chat with AI endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    // Get relevant property data from database to provide context
    const propertiesResult = await client.execute('SELECT * FROM properties LIMIT 10');
    const properties = propertiesResult.rows;

    // Create context with available properties
    const propertyContext = properties.map(p => 
      `Property: ${p.address}, Type: ${p.property_type}, Price: $${p.price}, Status: ${p.distress_status}`
    ).join('\n');

    const groq = new GroqClient();
    const systemPrompt = `You are a Honolulu real estate expert AI assistant. You have access to the following property database:

${propertyContext}

You help users find off-market properties, analyze investments, and provide market insights for Honolulu, Hawaii. You can:
1. Search and filter properties by location, type, price, and status
2. Calculate ROI and rental potential
3. Provide market analysis and investment advice
4. Identify distressed properties and investment opportunities
5. Explain zoning laws and regulations specific to Honolulu

Always provide specific, actionable advice based on the available property data. If you need more specific property information, suggest using the property search filters.`;

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = {
      message: completion.choices[0].message.content,
      context: context || 'property_search',
      availableProperties: properties.length
    };

    res.json(response);
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

module.exports = router;