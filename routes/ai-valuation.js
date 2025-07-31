
const express = require('express');
const router = express.Router();
const { GroqClient } = require('../utils/groqClient');
const { AnthropicClient } = require('../utils/anthropicClient');
const { client } = require('../database/connection');

// AI Property Valuation Engine
router.post('/property-valuation/:id', async (req, res) => {
  try {
    const groqClient = new GroqClient();
    const anthropicClient = new AnthropicClient();

    // Get property details
    const result = await client.execute({
      sql: 'SELECT * FROM properties WHERE id = ?',
      args: [req.params.id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = result.rows[0];

    // Get comparable sales data
    const comparableResult = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE property_type = ? 
            AND price > 0 
            AND ABS(price - ?) / ? < 0.3
            ORDER BY ABS(price - ?) ASC
            LIMIT 5`,
      args: [property.property_type, property.price, property.price, property.price]
    });

    const comparables = comparableResult.rows;

    // AI-powered valuation analysis
    const valuationPrompt = `
Analyze this Hawaii property for accurate valuation:

PROPERTY: ${property.address}
LISTED PRICE: $${property.price?.toLocaleString()}
TYPE: ${property.property_type}
SQFT: ${property.sqft || 'Unknown'}
DETAILS: ${property.details}

COMPARABLE SALES:
${comparables.map(comp => `- ${comp.address}: $${comp.price?.toLocaleString()} (${comp.property_type})`).join('\n')}

Provide:
1. Estimated Market Value Range
2. Price per Square Foot Analysis
3. Equity Capture Percentage
4. Repair Cost Estimates
5. Investment Recommendation
`;

    const groqValuation = await groqClient.analyzeProperty(property, valuationPrompt);
    const anthropicValuation = await anthropicClient.generateDetailedPropertyReport(property, groqValuation);

    // Calculate valuation metrics
    const avgComparablePrice = comparables.length > 0 
      ? comparables.reduce((sum, comp) => sum + (comp.price || 0), 0) / comparables.length
      : property.price;

    const equityCapture = property.price < avgComparablePrice 
      ? ((avgComparablePrice - property.price) / avgComparablePrice * 100).toFixed(1)
      : 0;

    const valuationData = {
      property_id: property.id,
      address: property.address,
      listed_price: property.price,
      estimated_market_value: avgComparablePrice,
      equity_capture_percentage: parseFloat(equityCapture),
      comparable_properties: comparables.length,
      groq_analysis: groqValuation,
      anthropic_analysis: anthropicValuation,
      repair_estimate: estimateRepairCosts(property),
      valuation_confidence: calculateValuationConfidence(comparables.length, property),
      generated_at: new Date().toISOString()
    };

    // Store valuation in database
    await client.execute({
      sql: `INSERT OR REPLACE INTO property_valuations 
            (property_id, estimated_value, equity_capture, repair_estimate, confidence_score, analysis_data, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        property.id,
        avgComparablePrice,
        equityCapture,
        valuationData.repair_estimate,
        valuationData.valuation_confidence,
        JSON.stringify(valuationData),
        new Date().toISOString()
      ]
    });

    res.json({
      success: true,
      valuation: valuationData
    });

  } catch (error) {
    console.error('Property valuation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate property valuation',
      details: error.message 
    });
  }
});

// Estimate repair costs based on property details
function estimateRepairCosts(property) {
  const details = (property.details || '').toLowerCase();
  let baseRepairCost = 15000; // Base renovation cost

  // Condition indicators
  if (details.includes('fixer') || details.includes('needs work')) baseRepairCost += 25000;
  if (details.includes('new roof')) baseRepairCost += 15000;
  if (details.includes('kitchen')) baseRepairCost += 20000;
  if (details.includes('bathroom')) baseRepairCost += 12000;
  if (details.includes('flooring')) baseRepairCost += 8000;

  // Property type multiplier
  if (property.property_type === 'Single Family') baseRepairCost *= 1.2;
  if (property.property_type === 'Condo') baseRepairCost *= 0.8;

  return Math.round(baseRepairCost);
}

// Calculate valuation confidence based on data quality
function calculateValuationConfidence(comparableCount, property) {
  let confidence = 50;
  
  confidence += comparableCount * 10; // More comparables = higher confidence
  if (property.sqft && property.sqft > 0) confidence += 15;
  if (property.details && property.details.length > 50) confidence += 10;
  if (property.price && property.price > 0) confidence += 15;

  return Math.min(confidence, 95);
}

// Batch valuation for multiple properties
router.post('/batch-valuation', async (req, res) => {
  try {
    const { property_ids } = req.body;

    if (!property_ids || property_ids.length === 0) {
      return res.status(400).json({ error: 'No property IDs provided' });
    }

    const valuations = [];

    for (const propertyId of property_ids) {
      try {
        const valuationResponse = await fetch(`/api/ai-valuation/property-valuation/${propertyId}`, {
          method: 'POST'
        });
        const valuationData = await valuationResponse.json();
        
        if (valuationData.success) {
          valuations.push(valuationData.valuation);
        }
      } catch (error) {
        console.error(`Valuation failed for property ${propertyId}:`, error);
      }
    }

    res.json({
      success: true,
      total_properties: property_ids.length,
      successful_valuations: valuations.length,
      valuations: valuations
    });

  } catch (error) {
    console.error('Batch valuation error:', error);
    res.status(500).json({ 
      error: 'Failed to perform batch valuation',
      details: error.message 
    });
  }
});

module.exports = router;
