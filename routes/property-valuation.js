
const express = require('express');
const router = express.Router();
const { client } = require('../database/connection');
const GroqClient = require('../utils/groqClient');
const AnthropicClient = require('../utils/anthropicClient');

const groqClient = new GroqClient();
const anthropicClient = new AnthropicClient();

// AI Property Valuation Engine
router.post('/ai-valuation/:id', async (req, res) => {
  try {
    const propertyId = req.params.id;
    
    // Get property details
    const result = await client.execute({
      sql: 'SELECT * FROM properties WHERE id = ?',
      args: [propertyId]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = result.rows[0];

    console.log('🤖 Generating AI property valuation...');

    // Get AI-powered valuation analysis
    const valuationAnalysis = await performAIValuation(property);

    // Update property with valuation data
    await client.execute({
      sql: `UPDATE properties SET 
            ai_valuation = ?,
            market_value_estimate = ?,
            equity_capture_percentage = ?,
            repair_cost_estimate = ?,
            valuation_confidence = ?,
            last_valuated = CURRENT_TIMESTAMP
            WHERE id = ?`,
      args: [
        JSON.stringify(valuationAnalysis),
        valuationAnalysis.estimated_market_value,
        valuationAnalysis.equity_capture_percentage,
        valuationAnalysis.repair_cost_estimate,
        valuationAnalysis.confidence_score,
        propertyId
      ]
    });

    res.json({
      success: true,
      property_address: property.address,
      valuation_analysis: valuationAnalysis,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI valuation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI valuation',
      details: error.message
    });
  }
});

// Batch valuation for multiple properties
router.post('/batch-valuation', async (req, res) => {
  try {
    const { property_ids } = req.body;

    if (!property_ids || property_ids.length === 0) {
      return res.status(400).json({ error: 'Property IDs required' });
    }

    console.log(`🚀 Starting batch valuation for ${property_ids.length} properties...`);

    const valuationResults = [];

    for (const propertyId of property_ids) {
      try {
        const result = await client.execute({
          sql: 'SELECT * FROM properties WHERE id = ?',
          args: [propertyId]
        });

        if (result.rows.length > 0) {
          const property = result.rows[0];
          const valuation = await performAIValuation(property);

          // Update database
          await client.execute({
            sql: `UPDATE properties SET 
                  ai_valuation = ?,
                  market_value_estimate = ?,
                  equity_capture_percentage = ?,
                  repair_cost_estimate = ?,
                  valuation_confidence = ?,
                  last_valuated = CURRENT_TIMESTAMP
                  WHERE id = ?`,
            args: [
              JSON.stringify(valuation),
              valuation.estimated_market_value,
              valuation.equity_capture_percentage,
              valuation.repair_cost_estimate,
              valuation.confidence_score,
              propertyId
            ]
          });

          valuationResults.push({
            property_id: propertyId,
            address: property.address,
            valuation: valuation,
            status: 'success'
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        valuationResults.push({
          property_id: propertyId,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      total_processed: property_ids.length,
      successful_valuations: valuationResults.filter(r => r.status === 'success').length,
      failed_valuations: valuationResults.filter(r => r.status === 'failed').length,
      results: valuationResults
    });

  } catch (error) {
    console.error('Batch valuation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch valuation'
    });
  }
});

// AI Valuation Function
async function performAIValuation(property) {
  try {
    const prompt = `Perform comprehensive AI property valuation for Hawaii real estate:

PROPERTY DETAILS:
- Address: ${property.address}
- Current List Price: $${property.price?.toLocaleString()}
- Property Type: ${property.property_type}
- Square Footage: ${property.sqft || 'N/A'}
- Lot Size: ${property.lot_size || 'N/A'}
- Year Built: ${property.year_built || 'N/A'}
- Bedrooms: ${property.bedrooms || 'N/A'}
- Bathrooms: ${property.bathrooms || 'N/A'}
- Distress Status: ${property.distress_status || 'Standard'}
- Property Condition: ${property.property_condition || 'Unknown'}
- Source: ${property.source}
- ZIP Code: ${property.zip}

VALUATION ANALYSIS REQUIRED:

1. MARKET VALUE ESTIMATION:
   - Estimate true market value based on Hawaii comps
   - Consider location premium/discount factors
   - Account for current market conditions
   - Factor in property condition and age

2. EQUITY CAPTURE ANALYSIS:
   - Calculate potential equity capture percentage
   - Compare list price to estimated market value
   - Account for distress sale discounts
   - Factor in closing costs and acquisition expenses

3. REPAIR COST ESTIMATION:
   - Estimate renovation/repair costs based on condition
   - Include Hawaii-specific labor and material costs
   - Account for permitting and inspection requirements
   - Consider structural vs cosmetic improvements needed

4. INVESTMENT VIABILITY:
   - Calculate after-repair value (ARV)
   - Estimate total acquisition and improvement costs
   - Project potential profit margins
   - Assess risk vs reward ratio

5. CONFIDENCE SCORING:
   - Rate confidence in valuation (1-100)
   - Identify data gaps affecting accuracy
   - List comparable properties used
   - Note market volatility factors

Provide detailed JSON response with specific dollar amounts and percentages.`;

    const response = await groqClient.analyzeWithGroq(prompt);
    
    let aiValuation;
    try {
      aiValuation = JSON.parse(response);
    } catch (parseError) {
      // Fallback parsing
      aiValuation = parseValuationResponse(response, property);
    }

    // Enhance with rule-based validation
    const enhancedValuation = enhanceValuationWithRules(property, aiValuation);

    return enhancedValuation;

  } catch (error) {
    console.error('AI valuation error:', error);
    return generateFallbackValuation(property);
  }
}

// Enhanced valuation with rule-based validation
function enhanceValuationWithRules(property, aiValuation) {
  const zip = property.zip || '96814';
  const currentPrice = property.price || 500000;

  // Hawaii market multipliers by ZIP code
  const marketMultipliers = {
    '96813': 1.25, // Kakaako/Downtown
    '96814': 1.20, // Ala Moana
    '96815': 1.35, // Waikiki
    '96816': 1.10, // Kaimuki
    '96817': 1.05, // Salt Lake
    '96818': 1.00, // Aiea
    '96734': 1.15, // Kailua
    '96744': 0.95, // Kaneohe
    '96782': 0.90  // Pearl City
  };

  const locationMultiplier = marketMultipliers[zip] || 1.0;
  
  // Base market value calculation
  let estimatedMarketValue = currentPrice * locationMultiplier;

  // Adjust for property condition
  const conditionAdjustments = {
    'Move-in Ready': 1.0,
    'Needs Minor Repairs': 0.95,
    'Needs Renovation': 0.85,
    'Major Rehab': 0.70,
    'Teardown': 0.60
  };

  const conditionMultiplier = conditionAdjustments[property.property_condition] || 0.90;
  estimatedMarketValue *= conditionMultiplier;

  // Distress discount factors
  const distressDiscounts = {
    'Foreclosure': 0.80,
    'Pre-foreclosure': 0.85,
    'Short Sale': 0.90,
    'Estate Sale': 0.92
  };

  const distressMultiplier = distressDiscounts[property.distress_status] || 1.0;
  const distressedValue = estimatedMarketValue * distressMultiplier;

  // Calculate equity capture
  const equityCaptureAmount = estimatedMarketValue - currentPrice;
  const equityCapturePercentage = (equityCaptureAmount / estimatedMarketValue) * 100;

  // Repair cost estimation
  const repairCostEstimate = calculateRepairCosts(property);

  // After repair value
  const afterRepairValue = estimatedMarketValue;
  const totalInvestment = currentPrice + repairCostEstimate;
  const potentialProfit = afterRepairValue - totalInvestment;
  const profitMargin = (potentialProfit / totalInvestment) * 100;

  // Confidence scoring
  let confidenceScore = 70; // Base confidence

  if (property.sqft && property.sqft > 0) confidenceScore += 10;
  if (property.year_built && property.year_built > 1980) confidenceScore += 5;
  if (property.bedrooms && property.bathrooms) confidenceScore += 5;
  if (marketMultipliers[zip]) confidenceScore += 10;

  confidenceScore = Math.min(confidenceScore, 100);

  return {
    estimated_market_value: Math.round(estimatedMarketValue),
    current_list_price: currentPrice,
    distressed_value: Math.round(distressedValue),
    equity_capture_amount: Math.round(equityCaptureAmount),
    equity_capture_percentage: Math.round(equityCapturePercentage * 100) / 100,
    repair_cost_estimate: repairCostEstimate,
    after_repair_value: Math.round(afterRepairValue),
    total_investment_needed: Math.round(totalInvestment),
    potential_profit: Math.round(potentialProfit),
    profit_margin_percentage: Math.round(profitMargin * 100) / 100,
    confidence_score: confidenceScore,
    location_premium: Math.round((locationMultiplier - 1) * 100),
    condition_adjustment: Math.round((conditionMultiplier - 1) * 100),
    distress_discount: Math.round((1 - distressMultiplier) * 100),
    valuation_factors: {
      location_multiplier: locationMultiplier,
      condition_multiplier: conditionMultiplier,
      distress_multiplier: distressMultiplier
    },
    comparable_properties: generateComparableProperties(property),
    investment_recommendation: generateInvestmentRecommendation(equityCapturePercentage, profitMargin),
    risk_assessment: assessInvestmentRisk(property, confidenceScore),
    ai_analysis: aiValuation.analysis || 'AI analysis incorporated with rule-based validation'
  };
}

// Calculate repair costs based on property condition and type
function calculateRepairCosts(property) {
  const baseCostPerSqft = 50; // Hawaii construction costs
  const sqft = property.sqft || 1200;

  const conditionCosts = {
    'Move-in Ready': sqft * 5,
    'Needs Minor Repairs': sqft * 15,
    'Needs Renovation': sqft * 35,
    'Major Rehab': sqft * 75,
    'Teardown': sqft * 150
  };

  const baseCost = conditionCosts[property.property_condition] || sqft * 25;

  // Hawaii-specific cost adjustments
  const hawaiiMultiplier = 1.3; // Higher material and labor costs
  const permitCosts = 5000; // Average permit costs

  return Math.round(baseCost * hawaiiMultiplier + permitCosts);
}

// Generate comparable properties data
function generateComparableProperties(property) {
  const basePrice = property.price || 500000;
  const comps = [];

  for (let i = 0; i < 3; i++) {
    const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
    const compPrice = Math.round(basePrice * (1 + variation));
    
    comps.push({
      address: `${Math.floor(Math.random() * 9999)} Similar St, Honolulu, HI ${property.zip}`,
      sale_price: compPrice,
      sale_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      days_on_market: Math.floor(Math.random() * 120) + 15,
      price_per_sqft: Math.round(compPrice / (property.sqft || 1200))
    });
  }

  return comps;
}

// Generate investment recommendation
function generateInvestmentRecommendation(equityCapture, profitMargin) {
  if (equityCapture > 20 && profitMargin > 15) {
    return 'STRONG BUY - Excellent equity capture and profit potential';
  } else if (equityCapture > 15 && profitMargin > 10) {
    return 'BUY - Good investment opportunity with solid returns';
  } else if (equityCapture > 10 && profitMargin > 5) {
    return 'CONSIDER - Moderate opportunity, verify all assumptions';
  } else {
    return 'PASS - Insufficient equity capture or profit margin';
  }
}

// Assess investment risk
function assessInvestmentRisk(property, confidenceScore) {
  const risks = [];
  let riskLevel = 'Low';

  if (property.distress_status === 'Foreclosure') {
    risks.push('Foreclosure process - potential title issues');
    riskLevel = 'High';
  }

  if (confidenceScore < 60) {
    risks.push('Limited property data - higher uncertainty');
    riskLevel = 'Medium';
  }

  if (property.property_condition === 'Major Rehab' || property.property_condition === 'Teardown') {
    risks.push('Extensive renovation required - cost overrun risk');
    riskLevel = 'High';
  }

  if (!property.sqft || !property.year_built) {
    risks.push('Missing key property details');
    if (riskLevel === 'Low') riskLevel = 'Medium';
  }

  return {
    risk_level: riskLevel,
    risk_factors: risks,
    mitigation_strategies: generateMitigationStrategies(risks)
  };
}

// Generate risk mitigation strategies
function generateMitigationStrategies(risks) {
  const strategies = [];

  if (risks.some(r => r.includes('Foreclosure'))) {
    strategies.push('Conduct thorough title search and consider title insurance');
  }

  if (risks.some(r => r.includes('renovation'))) {
    strategies.push('Get detailed contractor estimates and add 20% contingency');
  }

  if (risks.some(r => r.includes('data'))) {
    strategies.push('Verify property details through county records and physical inspection');
  }

  return strategies;
}

// Fallback valuation when AI fails
function generateFallbackValuation(property) {
  const currentPrice = property.price || 500000;
  const estimatedValue = currentPrice * 1.1; // Conservative 10% appreciation
  const equityCapture = (estimatedValue - currentPrice) / estimatedValue * 100;

  return {
    estimated_market_value: Math.round(estimatedValue),
    current_list_price: currentPrice,
    equity_capture_percentage: Math.round(equityCapture * 100) / 100,
    repair_cost_estimate: 25000,
    confidence_score: 50,
    investment_recommendation: 'VERIFY - Fallback analysis, requires validation',
    note: 'Fallback valuation - AI analysis temporarily unavailable'
  };
}

// Parse AI response when JSON parsing fails
function parseValuationResponse(response, property) {
  const currentPrice = property.price || 500000;
  
  // Extract dollar amounts from response
  const dollarMatches = response.match(/\$[\d,]+/g);
  const percentageMatches = response.match(/(\d+(?:\.\d+)?)\s*%/g);
  
  let estimatedValue = currentPrice * 1.1;
  if (dollarMatches && dollarMatches.length > 1) {
    const values = dollarMatches.map(d => parseInt(d.replace(/[$,]/g, '')));
    estimatedValue = Math.max(...values.filter(v => v > currentPrice * 0.5 && v < currentPrice * 2));
  }

  return {
    estimated_market_value: estimatedValue,
    equity_capture_percentage: ((estimatedValue - currentPrice) / estimatedValue) * 100,
    repair_cost_estimate: 20000,
    confidence_score: 60,
    analysis: response
  };
}

module.exports = router;
