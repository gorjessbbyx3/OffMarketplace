
const express = require('express');
const router = express.Router();
const { GroqClient } = require('../utils/groqClient');
const { client } = require('../database/connection');

// Predictive Market Analytics Engine
router.post('/market-forecast/:neighborhood', async (req, res) => {
  try {
    const neighborhood = req.params.neighborhood;
    const { timeframe = '12', analysis_type = 'appreciation' } = req.body;

    // Get historical property data for the neighborhood
    const historicalData = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE address LIKE ? 
            ORDER BY created_at DESC 
            LIMIT 50`,
      args: [`%${neighborhood}%`]
    });

    const properties = historicalData.rows;

    if (properties.length === 0) {
      return res.status(404).json({ 
        error: 'No historical data found for this neighborhood',
        suggestion: 'Try a broader search or different neighborhood name'
      });
    }

    // Generate market predictions
    const marketForecast = await generateMarketForecast(neighborhood, properties, timeframe);
    const appreciationForecast = await forecastAppreciation(properties, timeframe);
    const optimalTiming = await calculateOptimalTiming(properties);
    const marketCycle = await analyzeMarketCycle(properties);

    const analyticsData = {
      neighborhood: neighborhood,
      forecast_timeframe: `${timeframe} months`,
      total_properties_analyzed: properties.length,
      market_forecast: marketForecast,
      appreciation_forecast: appreciationForecast,
      optimal_timing: optimalTiming,
      market_cycle_analysis: marketCycle,
      confidence_metrics: calculateConfidenceMetrics(properties),
      generated_at: new Date().toISOString()
    };

    // Store analytics in database
    await client.execute({
      sql: `INSERT OR REPLACE INTO market_analytics 
            (neighborhood, forecast_data, confidence_score, created_at)
            VALUES (?, ?, ?, ?)`,
      args: [
        neighborhood,
        JSON.stringify(analyticsData),
        analyticsData.confidence_metrics.overall_confidence,
        new Date().toISOString()
      ]
    });

    res.json({
      success: true,
      analytics: analyticsData
    });

  } catch (error) {
    console.error('Predictive analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to generate market forecast',
      details: error.message 
    });
  }
});

// Property Type Market Analysis
router.post('/property-type-analysis/:type', async (req, res) => {
  try {
    const propertyType = req.params.type;

    const typeData = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE property_type = ? 
            ORDER BY price ASC`,
      args: [propertyType]
    });

    const properties = typeData.rows;

    if (properties.length === 0) {
      return res.status(404).json({ 
        error: `No data found for property type: ${propertyType}`
      });
    }

    const analysis = {
      property_type: propertyType,
      total_properties: properties.length,
      price_analysis: {
        min_price: Math.min(...properties.map(p => p.price || 0)),
        max_price: Math.max(...properties.map(p => p.price || 0)),
        avg_price: properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length,
        median_price: calculateMedian(properties.map(p => p.price || 0))
      },
      market_trends: await analyzePropertyTypeTrends(properties),
      investment_potential: await assessInvestmentPotential(properties),
      risk_factors: identifyRiskFactors(properties),
      recommendations: generateRecommendations(properties),
      generated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      analysis: analysis
    });

  } catch (error) {
    console.error('Property type analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze property type',
      details: error.message 
    });
  }
});

// Market Cycle Analysis
router.get('/market-cycle', async (req, res) => {
  try {
    // Get all recent properties for market analysis
    const allProperties = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE created_at >= datetime('now', '-6 months')
            ORDER BY created_at DESC`,
      args: []
    });

    const properties = allProperties.rows;

    const cycleAnalysis = {
      current_phase: determineMarketPhase(properties),
      cycle_indicators: analyzeCycleIndicators(properties),
      phase_duration: estimatePhaseDuration(properties),
      next_phase_prediction: predictNextPhase(properties),
      investment_strategy: recommendStrategy(properties),
      economic_factors: analyzeEconomicFactors(),
      generated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      cycle_analysis: cycleAnalysis
    });

  } catch (error) {
    console.error('Market cycle analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze market cycle',
      details: error.message 
    });
  }
});

// Helper functions for market analysis
async function generateMarketForecast(neighborhood, properties, timeframe) {
  const groqClient = new GroqClient();
  
  const prompt = `
Analyze Hawaii real estate market data for ${neighborhood}:

PROPERTIES ANALYZED: ${properties.length}
AVERAGE PRICE: $${(properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length).toLocaleString()}
TIMEFRAME: ${timeframe} months

SAMPLE PROPERTIES:
${properties.slice(0, 5).map(p => `- ${p.address}: $${p.price?.toLocaleString()} (${p.property_type})`).join('\n')}

Provide market forecast including:
1. Price appreciation prediction
2. Market demand trends
3. Supply constraints
4. Economic factors impact
5. Risk assessment
`;

  try {
    const forecast = await groqClient.analyzeMarket(properties, prompt);
    return forecast;
  } catch (error) {
    return generateFallbackForecast(neighborhood, properties, timeframe);
  }
}

async function forecastAppreciation(properties, timeframe) {
  const avgPrice = properties.reduce((sum, p) => sum + (p.price || 0), 0) / properties.length;
  const priceVariance = calculatePriceVariance(properties);
  
  // Hawaii-specific appreciation factors
  const baseTourismFactor = 1.03; // 3% annual tourism impact
  const supplyConstraintFactor = 1.05; // 5% due to limited land
  const economicFactor = 0.98; // Slight economic headwinds
  
  const annualAppreciation = baseTourismFactor * supplyConstraintFactor * economicFactor;
  const forecastAppreciation = Math.pow(annualAppreciation, timeframe / 12);
  
  return {
    current_avg_price: Math.round(avgPrice),
    forecast_avg_price: Math.round(avgPrice * forecastAppreciation),
    appreciation_percentage: ((forecastAppreciation - 1) * 100).toFixed(1),
    annual_appreciation_rate: ((annualAppreciation - 1) * 100).toFixed(1),
    factors: {
      tourism_impact: 'Positive',
      supply_constraints: 'High',
      economic_conditions: 'Neutral',
      interest_rates: 'Headwind'
    }
  };
}

async function calculateOptimalTiming(properties) {
  const seasonalTrends = analyzeSeasonalTrends(properties);
  const marketConditions = assessCurrentConditions(properties);
  
  return {
    best_buying_months: ['September', 'October', 'November'],
    best_selling_months: ['March', 'April', 'May'],
    current_market_condition: marketConditions.condition,
    timing_recommendation: marketConditions.recommendation,
    confidence_level: marketConditions.confidence
  };
}

function calculateConfidenceMetrics(properties) {
  let confidence = 50;
  
  // More data = higher confidence
  if (properties.length >= 30) confidence += 20;
  else if (properties.length >= 15) confidence += 10;
  
  // Price consistency increases confidence
  const priceVariance = calculatePriceVariance(properties);
  if (priceVariance < 0.3) confidence += 15;
  
  // Recent data increases confidence
  const recentData = properties.filter(p => 
    new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  if (recentData.length > properties.length * 0.5) confidence += 10;
  
  return {
    overall_confidence: Math.min(confidence, 90),
    data_quality: properties.length >= 20 ? 'High' : 'Moderate',
    sample_size: properties.length,
    recency_score: (recentData.length / properties.length * 100).toFixed(0)
  };
}

function calculatePriceVariance(properties) {
  const prices = properties.map(p => p.price || 0).filter(p => p > 0);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - avg, 2), 0) / prices.length;
  return Math.sqrt(variance) / avg;
}

function calculateMedian(numbers) {
  const sorted = numbers.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

module.exports = router;
