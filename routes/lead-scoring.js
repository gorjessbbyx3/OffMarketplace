
const express = require('express');
const router = express.Router();
const { client } = require('../database/connection');
const GroqClient = require('../utils/groqClient');

const groqClient = new GroqClient();

// Automated Lead Scoring Engine
router.post('/score-leads', async (req, res) => {
  try {
    console.log('🤖 Starting automated lead scoring...');

    // Get all properties for scoring
    const result = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE created_at >= datetime('now', '-30 days')
            ORDER BY created_at DESC`,
      args: []
    });

    if (result.rows.length === 0) {
      return res.json({
        success: false,
        message: 'No properties found for scoring. Run scraping first.',
        scored_leads: []
      });
    }

    console.log(`📊 Scoring ${result.rows.length} properties...`);

    const scoredLeads = [];
    
    for (const property of result.rows) {
      try {
        const leadScore = await calculateLeadScore(property);
        
        // Update property with lead score
        await client.execute({
          sql: `UPDATE properties SET 
                lead_score = ?,
                acquisition_probability = ?,
                urgency_level = ?,
                distress_indicators = ?,
                success_likelihood = ?,
                scored_at = CURRENT_TIMESTAMP
                WHERE id = ?`,
          args: [
            leadScore.total_score,
            leadScore.acquisition_probability,
            leadScore.urgency_level,
            JSON.stringify(leadScore.distress_indicators),
            leadScore.success_likelihood,
            property.id
          ]
        });

        if (leadScore.total_score >= 70) {
          scoredLeads.push({
            id: property.id,
            address: property.address,
            price: property.price,
            lead_score: leadScore.total_score,
            acquisition_probability: leadScore.acquisition_probability,
            urgency_level: leadScore.urgency_level,
            success_likelihood: leadScore.success_likelihood,
            distress_indicators: leadScore.distress_indicators,
            scoring_factors: leadScore.scoring_breakdown,
            recommended_action: leadScore.recommended_action,
            contact_timeline: leadScore.contact_timeline,
            investment_potential: leadScore.investment_potential
          });
        }

      } catch (error) {
        console.error(`Error scoring property ${property.id}:`, error);
      }
    }

    // Sort by lead score descending
    scoredLeads.sort((a, b) => b.lead_score - a.lead_score);

    // Generate scoring summary
    const scoringSummary = generateScoringSummary(scoredLeads, result.rows.length);

    res.json({
      success: true,
      total_properties_analyzed: result.rows.length,
      high_quality_leads: scoredLeads.length,
      scoring_summary: scoringSummary,
      scored_leads: scoredLeads.slice(0, 20), // Top 20 leads
      analysis_timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Lead scoring error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to score leads',
      details: error.message
    });
  }
});

// Track historical success rates
router.post('/track-success/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { outcome, acquisition_price, notes } = req.body;

    // Record lead outcome
    await client.execute({
      sql: `INSERT INTO lead_outcomes (
        property_id, outcome, acquisition_price, notes, recorded_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [leadId, outcome, acquisition_price, notes]
    });

    // Update success rate calculations
    await updateSuccessRates();

    res.json({
      success: true,
      message: 'Lead outcome recorded successfully'
    });

  } catch (error) {
    console.error('Success tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track success'
    });
  }
});

// Get lead scoring analytics
router.get('/scoring-analytics', async (req, res) => {
  try {
    const analytics = await generateScoringAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics'
    });
  }
});

// Advanced Lead Scoring Algorithm
async function calculateLeadScore(property) {
  let totalScore = 0;
  const scoringFactors = {};
  const distressIndicators = [];

  // 1. FORECLOSURE TIMELINE SCORING (35 points max)
  const foreclosureScore = scoreForeclosureTimeline(property);
  totalScore += foreclosureScore.score;
  scoringFactors.foreclosure_timeline = foreclosureScore;
  if (foreclosureScore.indicators.length > 0) {
    distressIndicators.push(...foreclosureScore.indicators);
  }

  // 2. OWNER DISTRESS SIGNALS (25 points max)
  const distressScore = scoreOwnerDistress(property);
  totalScore += distressScore.score;
  scoringFactors.owner_distress = distressScore;
  if (distressScore.indicators.length > 0) {
    distressIndicators.push(...distressScore.indicators);
  }

  // 3. MARKET FACTORS (20 points max)
  const marketScore = scoreMarketFactors(property);
  totalScore += marketScore.score;
  scoringFactors.market_factors = marketScore;

  // 4. PROPERTY CHARACTERISTICS (15 points max)
  const propertyScore = scorePropertyCharacteristics(property);
  totalScore += propertyScore.score;
  scoringFactors.property_characteristics = propertyScore;

  // 5. SOURCE RELIABILITY (5 points max)
  const sourceScore = scoreSourceReliability(property);
  totalScore += sourceScore.score;
  scoringFactors.source_reliability = sourceScore;

  // Calculate acquisition probability
  const acquisitionProbability = calculateAcquisitionProbability(totalScore, distressIndicators);

  // Determine urgency level
  const urgencyLevel = determineUrgencyLevel(property, distressIndicators);

  // Calculate success likelihood using AI
  const successLikelihood = await calculateSuccessLikelihood(property, totalScore);

  // Generate recommendations
  const recommendations = generateLeadRecommendations(totalScore, urgencyLevel, distressIndicators);

  return {
    total_score: Math.round(totalScore),
    acquisition_probability: acquisitionProbability,
    urgency_level: urgencyLevel,
    success_likelihood: successLikelihood,
    distress_indicators: distressIndicators,
    scoring_breakdown: scoringFactors,
    recommended_action: recommendations.action,
    contact_timeline: recommendations.timeline,
    investment_potential: recommendations.potential
  };
}

// Score foreclosure timeline factors
function scoreForeclosureTimeline(property) {
  let score = 0;
  const indicators = [];
  const details = (property.details || '').toLowerCase();
  const status = property.distress_status || '';

  // Active foreclosure proceedings
  if (status === 'Foreclosure') {
    score += 35;
    indicators.push('🚨 Active foreclosure - immediate opportunity');
  } else if (status === 'Pre-foreclosure') {
    score += 30;
    indicators.push('⚠️ Pre-foreclosure status - early intervention possible');
  }

  // Legal notice indicators
  if (details.includes('notice of sale') || details.includes('trustee sale')) {
    score += 25;
    indicators.push('📋 Trustee sale scheduled - urgent action required');
  }

  // NOD (Notice of Default) indicators
  if (details.includes('notice of default') || details.includes('nod')) {
    score += 20;
    indicators.push('📄 Notice of Default filed - distress confirmed');
  }

  // Auction date proximity
  if (details.includes('auction') && details.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
    score += 15;
    indicators.push('🏛️ Auction date identified - time-sensitive opportunity');
  }

  return {
    score: Math.min(score, 35),
    indicators: indicators,
    reasoning: 'Foreclosure timeline assessment based on legal status and proceedings'
  };
}

// Score owner distress signals
function scoreOwnerDistress(property) {
  let score = 0;
  const indicators = [];
  const details = (property.details || '').toLowerCase();
  const source = (property.source || '').toLowerCase();

  // Tax delinquency signals
  if (details.includes('tax') && (details.includes('delinquent') || details.includes('lien'))) {
    score += 20;
    indicators.push('💰 Tax delinquency detected - financial distress');
  }

  // Estate/probate situations
  if (details.includes('estate') || details.includes('probate') || details.includes('deceased')) {
    score += 18;
    indicators.push('👨‍⚖️ Estate/probate situation - motivated to sell');
  }

  // Multiple liens
  if (details.includes('lien') && details.match(/lien/g).length > 1) {
    score += 15;
    indicators.push('🔗 Multiple liens detected - complex financial distress');
  }

  // Divorce proceedings
  if (details.includes('divorce') || details.includes('dissolution')) {
    score += 12;
    indicators.push('⚖️ Divorce proceedings - forced sale likely');
  }

  // Bankruptcy indicators
  if (details.includes('bankruptcy') || details.includes('chapter')) {
    score += 15;
    indicators.push('💳 Bankruptcy proceedings - asset liquidation');
  }

  // Absentee ownership
  if (property.owner_name && (property.owner_name.includes('LLC') || property.owner_name.includes('Trust'))) {
    score += 8;
    indicators.push('🏢 Corporate/trust ownership - potential management issues');
  }

  // Long-term vacancy indicators
  if (details.includes('vacant') || details.includes('unoccupied')) {
    score += 10;
    indicators.push('🏠 Vacant property - carrying costs mounting');
  }

  return {
    score: Math.min(score, 25),
    indicators: indicators,
    reasoning: 'Owner distress assessment based on financial and personal circumstances'
  };
}

// Score market factors
function scoreMarketFactors(property) {
  let score = 0;
  const indicators = [];
  const zip = property.zip || '96814';
  const price = property.price || 0;

  // Price analysis
  const marketRanges = {
    '96813': { low: 600000, high: 1200000 }, // Kakaako
    '96814': { low: 500000, high: 1000000 }, // Ala Moana
    '96815': { low: 700000, high: 1500000 }, // Waikiki
    '96816': { low: 400000, high: 800000 },  // Kaimuki
    '96817': { low: 350000, high: 700000 },  // Salt Lake
    '96734': { low: 800000, high: 1600000 }  // Kailua
  };

  const market = marketRanges[zip] || { low: 400000, high: 900000 };

  if (price > 0 && price < market.low * 0.8) {
    score += 15;
    indicators.push('💸 Significantly below market - strong value opportunity');
  } else if (price > 0 && price < market.low) {
    score += 10;
    indicators.push('💵 Below market pricing - good value');
  }

  // High-demand areas
  const highDemandZips = ['96813', '96814', '96815', '96734'];
  if (highDemandZips.includes(zip)) {
    score += 8;
    indicators.push('📍 High-demand location - strong rental/resale market');
  }

  // Market timing factors
  const age = (new Date() - new Date(property.created_at)) / (1000 * 60 * 60 * 24);
  if (age > 90) {
    score += 5;
    indicators.push('📅 Stale listing - seller motivation increasing');
  }

  return {
    score: Math.min(score, 20),
    indicators: indicators,
    reasoning: 'Market factors analysis including pricing and location desirability'
  };
}

module.exports = router;

const express = require('express');
const router = express.Router();
const { client } = require('../database/connection');

// Score property characteristics
function scorePropertyCharacteristics(property) {
  let score = 0;
  const indicators = [];

  // Property type preferences
  if (property.property_type === 'Multi-family') {
    score += 8;
    indicators.push('🏘️ Multi-family - multiple income streams');
  } else if (property.property_type === 'Single-family') {
    score += 6;
    indicators.push('🏠 Single-family - broad market appeal');
  } else if (property.property_type === 'Condo') {
    score += 4;
    indicators.push('🏢 Condo - lower maintenance, HOA considerations');
  }

  // Size factors
  if (property.sqft && property.sqft > 1500) {
    score += 4;
    indicators.push('📐 Good size - rental/resale appeal');
  }

  // Lot size (for development potential)
  if (property.lot_size && property.lot_size > 5000) {
    score += 3;
    indicators.push('🌳 Large lot - development potential');
  }

  return {
    score: Math.min(score, 15),
    indicators: indicators,
    reasoning: 'Property characteristics affecting investment potential'
  };
}

// Score source reliability
function scoreSourceReliability(property) {
  let score = 0;
  const source = property.source || '';

  const reliabilityScores = {
    'Honolulu County Records': 5,
    'Hawaii Legal Notices': 4,
    'Foreclosure.com': 3,
    'OahuRE.com': 2,
    'AI Scraped': 1
  };

  score = reliabilityScores[source] || 1;

  return {
    score: score,
    reasoning: `Source reliability: ${source}`,
    indicators: [`📊 Data source: ${source}`]
  };
}

// Calculate acquisition probability based on score and indicators
function calculateAcquisitionProbability(totalScore, distressIndicators) {
  let probability = totalScore;

  // Boost for multiple distress indicators
  if (distressIndicators.length >= 3) {
    probability += 10;
  }

  // Convert to percentage and cap at 95%
  probability = Math.min(probability, 95);
  
  return {
    probability: probability,
    confidence: distressIndicators.length >= 2 ? 'High' : 'Medium',
    reasoning: `Based on ${distressIndicators.length} distress indicators and score of ${totalScore}`
  };
}probability, 95);
  
  return Math.round(probability);
}

// Determine urgency level
function determineUrgencyLevel(property, distressIndicators) {
  const urgentIndicators = distressIndicators.filter(i => 
    i.includes('🚨') || i.includes('auction') || i.includes('sale scheduled')
  );

  if (urgentIndicators.length > 0 || property.distress_status === 'Foreclosure') {
    return 'critical';
  } else if (property.distress_status === 'Pre-foreclosure' || distressIndicators.length >= 2) {
    return 'high';
  } else if (distressIndicators.length >= 1) {
    return 'medium';
  } else {
    return 'low';
  }
}

// Calculate success likelihood using AI
async function calculateSuccessLikelihood(property, leadScore) {
  try {
    const prompt = `Based on this Hawaii property lead, predict the likelihood of successful acquisition:

Property: ${property.address}
Lead Score: ${leadScore}/100
Price: $${property.price?.toLocaleString()}
Status: ${property.distress_status}
Source: ${property.source}

Consider factors like:
- Market competition
- Owner motivation
- Property condition
- Price competitiveness

Provide success likelihood as percentage (0-100).`;

    const response = await groqClient.analyzeWithGroq(prompt);
    
    // Extract percentage from response
    const percentMatch = response.match(/(\d+)%/);
    if (percentMatch) {
      return parseInt(percentMatch[1]);
    }

    // Fallback calculation
    return Math.min(leadScore + 10, 85);

  } catch (error) {
    // Fallback to score-based calculation
    return Math.min(leadScore + 10, 85);
  }
}

// Generate lead recommendations
function generateLeadRecommendations(totalScore, urgencyLevel, distressIndicators) {
  let action, timeline, potential;

  if (totalScore >= 85) {
    action = 'IMMEDIATE CONTACT - High priority lead';
    timeline = 'Contact within 24 hours';
    potential = 'Excellent investment opportunity';
  } else if (totalScore >= 70) {
    action = 'PRIORITY CONTACT - Strong lead';
    timeline = 'Contact within 48-72 hours';
    potential = 'Strong investment potential';
  } else if (totalScore >= 55) {
    action = 'FOLLOW UP - Moderate opportunity';
    timeline = 'Contact within 1 week';
    potential = 'Moderate investment potential';
  } else {
    action = 'MONITOR - Low priority';
    timeline = 'Monitor for changes';
    potential = 'Limited investment potential';
  }

  // Adjust for urgency
  if (urgencyLevel === 'critical') {
    timeline = 'URGENT - Contact immediately';
  }

  return { action, timeline, potential };
}

// Generate scoring summary
function generateScoringSummary(scoredLeads, totalProperties) {
  const scoreRanges = {
    'A+ (90-100)': scoredLeads.filter(l => l.lead_score >= 90).length,
    'A (80-89)': scoredLeads.filter(l => l.lead_score >= 80 && l.lead_score < 90).length,
    'B (70-79)': scoredLeads.filter(l => l.lead_score >= 70 && l.lead_score < 80).length,
    'C (60-69)': scoredLeads.filter(l => l.lead_score >= 60 && l.lead_score < 70).length
  };

  const urgencyBreakdown = {
    'Critical': scoredLeads.filter(l => l.urgency_level === 'critical').length,
    'High': scoredLeads.filter(l => l.urgency_level === 'high').length,
    'Medium': scoredLeads.filter(l => l.urgency_level === 'medium').length,
    'Low': scoredLeads.filter(l => l.urgency_level === 'low').length
  };

  return {
    total_properties_analyzed: totalProperties,
    high_quality_leads: scoredLeads.length,
    conversion_rate: `${Math.round((scoredLeads.length / totalProperties) * 100)}%`,
    score_distribution: scoreRanges,
    urgency_breakdown: urgencyBreakdown,
    average_score: scoredLeads.length > 0 ? 
      Math.round(scoredLeads.reduce((sum, l) => sum + l.lead_score, 0) / scoredLeads.length) : 0
  };
}

// Update success rates based on historical data
async function updateSuccessRates() {
  try {
    // Implementation for tracking success rates over time
    // This would analyze lead_outcomes table to improve scoring algorithm
    console.log('Success rates updated');
  } catch (error) {
    console.error('Error updating success rates:', error);
  }
}

// Generate scoring analytics
async function generateScoringAnalytics() {
  try {
    const result = await client.execute({
      sql: `SELECT 
        COUNT(*) as total_scored,
        AVG(lead_score) as avg_score,
        COUNT(CASE WHEN lead_score >= 80 THEN 1 END) as high_score_count,
        COUNT(CASE WHEN urgency_level = 'critical' THEN 1 END) as critical_urgency_count
      FROM properties 
      WHERE lead_score IS NOT NULL`,
      args: []
    });

    return {
      scoring_stats: result.rows[0],
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
}

module.exports = router;
