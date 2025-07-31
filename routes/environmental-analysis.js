
const express = require('express');
const router = express.Router();
const axios = require('axios');
const GroqClient = require('../utils/groqClient');
const { client } = require('../database/connection');

// Hawaii-specific environmental data
const hawaiiEnvironmentalData = {
  flood_zones: {
    'AE': { risk: 'High', description: '1% annual chance flood area', insurance_required: true },
    'VE': { risk: 'Very High', description: 'Coastal high hazard area', insurance_required: true },
    'X': { risk: 'Moderate', description: '0.2% annual chance flood area', insurance_required: false },
    'D': { risk: 'Low', description: 'Areas of undetermined flood hazard', insurance_required: false }
  },
  natural_disasters: {
    tsunami: ['Coastal areas', 'Evacuation zones 1-4'],
    hurricane: ['All islands', 'Season: June-November'],
    earthquake: ['All areas', 'Volcanic activity zones'],
    volcano: ['Big Island primarily', 'Lava zones 1-9'],
    wildfire: ['Leeward slopes', 'Dry grassland areas']
  },
  climate_projections: {
    sea_level_rise: '3.2 feet by 2100',
    temperature_increase: '4-6°F by 2100',
    rainfall_changes: 'Decreased 5-10% in dry areas'
  }
};

// Flood zone analysis and insurance implications
router.post('/flood-zone-analysis', async (req, res) => {
  try {
    const { address, property_id } = req.body;
    
    let property;
    if (property_id) {
      const result = await client.execute({
        sql: 'SELECT * FROM properties WHERE id = ?',
        args: [property_id]
      });
      property = result.rows[0];
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
    }

    const targetAddress = address || property?.address;
    
    // Simulate flood zone lookup (in real implementation, use FEMA API)
    const floodZone = determineFloodZone(targetAddress);
    const zoneData = hawaiiEnvironmentalData.flood_zones[floodZone];
    
    const groqClient = new GroqClient();
    const floodAnalysis = await groqClient.analyzeFloodRisk(targetAddress, floodZone);
    
    res.json({
      success: true,
      address: targetAddress,
      flood_zone: floodZone,
      risk_level: zoneData.risk,
      description: zoneData.description,
      insurance_required: zoneData.insurance_required,
      estimated_annual_premium: calculateFloodInsurance(floodZone, property?.price),
      ai_analysis: floodAnalysis,
      recommendations: generateFloodRecommendations(floodZone, property?.price)
    });

  } catch (error) {
    console.error('Flood zone analysis error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze flood zone risk' 
    });
  }
});

// Natural disaster risk scoring
router.post('/disaster-risk-score', async (req, res) => {
  try {
    const { address, property_id } = req.body;
    
    let property;
    if (property_id) {
      const result = await client.execute({
        sql: 'SELECT * FROM properties WHERE id = ?',
        args: [property_id]
      });
      property = result.rows[0];
    }

    const targetAddress = address || property?.address;
    
    // Calculate composite risk score
    const riskScores = {
      tsunami: calculateTsunamiRisk(targetAddress),
      hurricane: calculateHurricaneRisk(targetAddress),
      earthquake: calculateEarthquakeRisk(targetAddress),
      volcano: calculateVolcanoRisk(targetAddress),
      wildfire: calculateWildfireRisk(targetAddress),
      flood: calculateFloodRisk(targetAddress)
    };
    
    const overallRisk = Object.values(riskScores).reduce((a, b) => a + b, 0) / 6;
    
    const groqClient = new GroqClient();
    const riskAnalysis = await groqClient.analyzeNaturalDisasterRisk(targetAddress, riskScores);
    
    res.json({
      success: true,
      address: targetAddress,
      individual_risks: riskScores,
      overall_risk_score: Math.round(overallRisk),
      risk_category: categorizeRisk(overallRisk),
      ai_analysis: riskAnalysis,
      insurance_implications: generateInsuranceAdvice(riskScores),
      mitigation_strategies: generateMitigationStrategies(riskScores)
    });

  } catch (error) {
    console.error('Disaster risk scoring error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to calculate disaster risk score' 
    });
  }
});

// Climate change impact projections
router.post('/climate-projections', async (req, res) => {
  try {
    const { address, property_id, projection_years = 30 } = req.body;
    
    let property;
    if (property_id) {
      const result = await client.execute({
        sql: 'SELECT * FROM properties WHERE id = ?',
        args: [property_id]
      });
      property = result.rows[0];
    }

    const targetAddress = address || property?.address;
    
    const groqClient = new GroqClient();
    const climateProjections = await groqClient.analyzeClimateImpact(
      targetAddress, 
      projection_years,
      hawaiiEnvironmentalData.climate_projections
    );
    
    res.json({
      success: true,
      address: targetAddress,
      projection_timeline: `${projection_years} years`,
      climate_impacts: {
        sea_level_rise: hawaiiEnvironmentalData.climate_projections.sea_level_rise,
        temperature_increase: hawaiiEnvironmentalData.climate_projections.temperature_increase,
        rainfall_changes: hawaiiEnvironmentalData.climate_projections.rainfall_changes
      },
      property_specific_impacts: climateProjections.property_impacts,
      investment_implications: climateProjections.investment_analysis,
      adaptation_strategies: climateProjections.adaptation_recommendations,
      long_term_viability: climateProjections.viability_assessment
    });

  } catch (error) {
    console.error('Climate projections error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate climate projections' 
    });
  }
});

// Helper functions
function determineFloodZone(address) {
  // Simplified flood zone determination
  if (address.toLowerCase().includes('beach') || address.toLowerCase().includes('shore')) {
    return 'AE';
  } else if (address.toLowerCase().includes('waikiki') || address.toLowerCase().includes('downtown')) {
    return 'X';
  }
  return 'D';
}

function calculateFloodInsurance(floodZone, propertyValue) {
  const basePremiums = { 'AE': 2000, 'VE': 3500, 'X': 800, 'D': 400 };
  return basePremiums[floodZone] || 600;
}

function calculateTsunamiRisk(address) {
  return address.toLowerCase().includes('beach') ? 85 : 25;
}

function calculateHurricaneRisk(address) {
  return 65; // All of Hawaii has hurricane risk
}

function calculateEarthquakeRisk(address) {
  return address.toLowerCase().includes('big island') ? 70 : 45;
}

function calculateVolcanoRisk(address) {
  return address.toLowerCase().includes('big island') ? 80 : 10;
}

function calculateWildfireRisk(address) {
  return address.toLowerCase().includes('leeward') ? 60 : 30;
}

function calculateFloodRisk(address) {
  const floodZone = determineFloodZone(address);
  const riskMap = { 'AE': 80, 'VE': 95, 'X': 40, 'D': 20 };
  return riskMap[floodZone] || 30;
}

function categorizeRisk(score) {
  if (score >= 70) return 'High Risk';
  if (score >= 50) return 'Moderate Risk';
  if (score >= 30) return 'Low-Moderate Risk';
  return 'Low Risk';
}

function generateInsuranceAdvice(riskScores) {
  const advice = [];
  if (riskScores.flood > 60) advice.push('Flood insurance strongly recommended');
  if (riskScores.hurricane > 70) advice.push('Hurricane coverage essential');
  if (riskScores.earthquake > 60) advice.push('Earthquake insurance recommended');
  return advice;
}

function generateMitigationStrategies(riskScores) {
  const strategies = [];
  if (riskScores.flood > 60) strategies.push('Elevate utilities above base flood elevation');
  if (riskScores.hurricane > 70) strategies.push('Install hurricane shutters and reinforced roofing');
  if (riskScores.wildfire > 50) strategies.push('Create defensible space around property');
  return strategies;
}

function generateFloodRecommendations(floodZone, propertyValue) {
  const recommendations = [];
  if (floodZone === 'AE' || floodZone === 'VE') {
    recommendations.push('Obtain flood insurance before closing');
    recommendations.push('Consider flood mitigation improvements');
  }
  if (propertyValue > 500000) {
    recommendations.push('Consider excess flood coverage');
  }
  return recommendations;
}

module.exports = router;
