
const express = require('express');
const router = express.Router();
const axios = require('axios');
const client = require('../database/connection');

// AI Chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, context, chat_history } = req.body;
    
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.json({ 
        response: 'AI chat is currently unavailable. Please check the API configuration.' 
      });
    }

    // Get recent properties for context
    const propertiesResult = await client.execute({
      sql: 'SELECT * FROM properties ORDER BY created_at DESC LIMIT 10',
      args: []
    });

    const recentProperties = propertiesResult.rows;
    
    // Build context for AI
    const systemPrompt = `You are an expert Hawaii real estate investment advisor and property finder assistant. You help users analyze properties, find investment opportunities, and provide market insights.

Current market context:
- Total properties in database: ${recentProperties.length}
- Recent properties include locations like: ${recentProperties.slice(0, 3).map(p => p.address).join(', ')}
- Average property price: $${Math.round(recentProperties.reduce((sum, p) => sum + (p.price || 0), 0) / recentProperties.length).toLocaleString()}

You should:
1. Provide specific, actionable real estate advice
2. Reference actual property data when relevant
3. Suggest investment strategies for Hawaii market
4. Help identify off-market opportunities
5. Explain market trends and ROI calculations
6. Be conversational but professional

Keep responses concise but informative (2-3 paragraphs max).`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama3-8b-8192',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...(chat_history || []).slice(-4), // Include recent chat history
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.choices[0].message.content;

    res.json({
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.json({ 
      response: 'I apologize, but I encountered an issue processing your request. Please try again or rephrase your question.' 
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

module.exports = router;
