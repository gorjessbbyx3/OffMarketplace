
const express = require('express');
const router = express.Router();
const { client } = require('../database/connection');
const GroqClient = require('../utils/groqClient');
const AnthropicClient = require('../utils/anthropicClient');

const groqClient = new GroqClient();
const anthropicClient = new AnthropicClient();

// Find off-market leads using AI analysis
router.post('/find-off-market-leads', async (req, res) => {
  try {
    console.log('Starting off-market leads analysis...');

    // Get all properties from database
    const result = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE created_at >= datetime('now', '-30 days')
            ORDER BY price ASC, created_at DESC 
            LIMIT 100`,
      args: []
    });

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'No recent properties found. Try scraping properties first.',
        leads: []
      });
    }

    const offMarketLeads = [];
    const analysisPromises = result.rows.map(async (property) => {
      try {
        const analysis = await analyzeOffMarketPotential(property);
        
        if (analysis.off_market_score >= 70) {
          return {
            id: property.id,
            address: property.address,
            price: property.price,
            property_type: property.property_type,
            distress_status: property.distress_status,
            source: property.source,
            off_market_score: analysis.off_market_score,
            off_market_indicators: analysis.indicators,
            motivation_signals: analysis.motivation_signals,
            ai_reasoning: analysis.reasoning,
            action_plan: analysis.action_items,
            urgency_level: analysis.urgency,
            estimated_discount: analysis.estimated_discount,
            contact_strategy: analysis.contact_strategy,
            lead_quality: analysis.lead_quality,
            created_at: property.created_at
          };
        }
      } catch (error) {
        console.error(`Error analyzing property ${property.id}:`, error);
        return null;
      }
    });

    const analysisResults = await Promise.all(analysisPromises);
    const validLeads = analysisResults.filter(lead => lead !== null);

    // Sort by off-market score and urgency
    validLeads.sort((a, b) => {
      if (a.urgency_level !== b.urgency_level) {
        const urgencyOrder = { 'critical': 3, 'high': 2, 'medium': 1, 'low': 0 };
        return urgencyOrder[b.urgency_level] - urgencyOrder[a.urgency_level];
      }
      return b.off_market_score - a.off_market_score;
    });

    // Generate market summary using AI
    const marketSummary = validLeads.length > 0 ? 
      await generateOffMarketSummary(validLeads) : 
      'No high-potential off-market opportunities found in current data.';

    res.json({
      success: true,
      total_analyzed: result.rows.length,
      off_market_leads_found: validLeads.length,
      leads: validLeads,
      market_summary: marketSummary,
      search_criteria: {
        min_score: 70,
        analysis_period: '30 days',
        sources_analyzed: [...new Set(result.rows.map(p => p.source))]
      }
    });

  } catch (error) {
    console.error('Off-market leads analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze off-market opportunities',
      leads: []
    });
  }
});

// Analyze individual property for off-market potential
async function analyzeOffMarketPotential(property) {
  try {
    const prompt = `Analyze this Hawaii property for off-market potential and motivated seller indicators:

Property Details:
- Address: ${property.address}
- Price: $${property.price?.toLocaleString() || 'N/A'}
- Type: ${property.property_type}
- Status: ${property.distress_status}
- Source: ${property.source}
- Listed Date: ${property.created_at}

Analyze for OFF-MARKET POTENTIAL based on:

1. DISTRESS INDICATORS:
   - Foreclosure status, liens, legal notices
   - Estate sales, divorce proceedings
   - Tax delinquency, code violations

2. PRICING SIGNALS:
   - Below market value indicators
   - Rapid price reductions
   - Unusual pricing patterns

3. PROPERTY CONDITIONS:
   - Deferred maintenance signals
   - Vacancy indicators
   - Property age and condition

4. SELLER MOTIVATION:
   - Time on market patterns
   - Multiple listing attempts
   - Source reliability (foreclosure.com, legal notices)

5. MARKET TIMING:
   - Seasonal factors
   - Economic pressures
   - Local market conditions

Provide JSON response:
{
  "off_market_score": 0-100,
  "reasoning": "detailed analysis",
  "indicators": ["specific signals found"],
  "motivation_signals": ["seller motivation factors"],
  "urgency": "critical|high|medium|low",
  "estimated_discount": "percentage below market",
  "contact_strategy": "recommended approach",
  "action_items": ["specific next steps"],
  "lead_quality": "A|B|C|D"
}`;

    const response = await groqClient.analyzeWithGroq(prompt);
    
    // Parse AI response
    let analysis;
    try {
      analysis = JSON.parse(response);
    } catch (parseError) {
      // Fallback to basic analysis
      analysis = generateFallbackAnalysis(property);
    }

    // Enhance with rule-based scoring
    analysis = enhanceWithRuleBasedScoring(property, analysis);

    return analysis;

  } catch (error) {
    console.error('AI analysis error:', error);
    return generateFallbackAnalysis(property);
  }
}

// Rule-based scoring enhancement
function enhanceWithRuleBasedScoring(property, analysis) {
  let bonusScore = 0;
  const additionalIndicators = [];

  // Distress status bonus
  if (property.distress_status === 'Foreclosure') {
    bonusScore += 25;
    additionalIndicators.push('Active foreclosure proceedings');
  } else if (property.distress_status === 'Pre-foreclosure') {
    bonusScore += 20;
    additionalIndicators.push('Pre-foreclosure status');
  }

  // Source reliability bonus
  if (property.source?.includes('Legal Notices')) {
    bonusScore += 15;
    additionalIndicators.push('Official legal notice publication');
  }

  // Price analysis
  if (property.price < 400000) {
    bonusScore += 10;
    additionalIndicators.push('Below median Hawaii price point');
  }

  // Recent listing bonus
  const daysOld = (new Date() - new Date(property.created_at)) / (1000 * 60 * 60 * 24);
  if (daysOld < 7) {
    bonusScore += 5;
    additionalIndicators.push('Recently discovered opportunity');
  }

  // Update analysis
  analysis.off_market_score = Math.min(100, analysis.off_market_score + bonusScore);
  analysis.indicators = [...(analysis.indicators || []), ...additionalIndicators];

  return analysis;
}

// Fallback analysis when AI is unavailable
function generateFallbackAnalysis(property) {
  let score = 50;
  const indicators = [];
  const motivationSignals = [];

  if (property.distress_status === 'Foreclosure') {
    score += 30;
    indicators.push('Foreclosure status');
    motivationSignals.push('Forced sale situation');
  }

  if (property.price < 500000) {
    score += 15;
    indicators.push('Below median market price');
  }

  if (property.source?.includes('Legal')) {
    score += 20;
    indicators.push('Legal notice source');
    motivationSignals.push('Court-ordered sale');
  }

  return {
    off_market_score: score,
    reasoning: 'Basic analysis - AI unavailable',
    indicators: indicators,
    motivation_signals: motivationSignals,
    urgency: score > 80 ? 'high' : score > 60 ? 'medium' : 'low',
    estimated_discount: score > 70 ? '15-25%' : '5-15%',
    contact_strategy: 'Direct owner contact recommended',
    action_items: ['Research property history', 'Contact owner/agent', 'Verify distress status'],
    lead_quality: score > 80 ? 'A' : score > 65 ? 'B' : 'C'
  };
}

// Generate market summary using AI
async function generateOffMarketSummary(leads) {
  try {
    const prompt = `Analyze these off-market Hawaii property leads and provide strategic insights:

Total Leads: ${leads.length}
Average Score: ${(leads.reduce((sum, l) => sum + l.off_market_score, 0) / leads.length).toFixed(1)}

Top Opportunities:
${leads.slice(0, 5).map(l => `
- ${l.address}: $${l.price?.toLocaleString()} (Score: ${l.off_market_score})
  Status: ${l.distress_status}
  Indicators: ${l.off_market_indicators?.join(', ')}
`).join('')}

Provide a strategic summary covering:
1. Market opportunity assessment
2. Best lead categories to prioritize
3. Timing recommendations
4. Contact strategy insights
5. Risk factors to consider

Keep it concise and actionable for investors.`;

    return await groqClient.analyzeWithGroq(prompt);

  } catch (error) {
    return `Found ${leads.length} off-market opportunities with average score of ${(leads.reduce((sum, l) => sum + l.off_market_score, 0) / leads.length).toFixed(1)}. Focus on foreclosure and distressed properties for best results.`;
  }
}

module.exports = router;
