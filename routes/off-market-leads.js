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

// Analyze individual property for off-market potential with focus on tax delinquency and pre-foreclosure
async function analyzeOffMarketPotential(property) {
  try {
    // Enhanced analysis specifically targeting tax delinquency and pre-foreclosure indicators
    const prompt = `PRIORITY ANALYSIS: Hawaii Property Tax Delinquency & Pre-Foreclosure Assessment

Property Details:
- Address: ${property.address}
- Price: $${property.price?.toLocaleString() || 'N/A'}
- Type: ${property.property_type}
- Units: ${property.units || 1}
- Square Footage: ${property.sqft || 'N/A'}
- Status: ${property.distress_status}
- Source: ${property.source}
- Listed Date: ${property.created_at}
- Owner: ${property.owner_name || 'Unknown'}

FOCUS ANALYSIS - HIGH PRIORITY DISTRESS INDICATORS:

1. TAX DELINQUENCY ANALYSIS:
   - Property tax payment history patterns
   - Outstanding tax liens or arrearages
   - Multiple years of unpaid taxes
   - Tax certificate sale eligibility
   - Assessment vs payment discrepancies
   - Recent tax assessment increases
   - Owner's financial inability to pay taxes

2. PRE-FORECLOSURE INDICATORS:
   - Notice of Default (NOD) filings
   - Lis Pendens court filings
   - Trustee sale notifications
   - Power of sale proceedings
   - Mortgage payment delinquency signals
   - Lender acceleration notices
   - Foreclosure timeline positioning

3. FINANCIAL DISTRESS SIGNALS:
   - Multiple liens (tax, mechanics, judgment)
   - Bankruptcy filings by owner
   - Divorce proceedings affecting property
   - Estate/probate situations
   - Code violation fines unpaid
   - Utility shutoff notices
   - Insurance policy lapses

4. HAWAII-SPECIFIC DISTRESS FACTORS:
   - Leasehold ground rent delinquency
   - AOAO (condo association) fees unpaid
   - State/County citation violations
   - TMK (Tax Map Key) issues
   - Zoning violation penalties
   - Building permit violations

5. OWNER MOTIVATION ASSESSMENT:
   - Absentee ownership patterns
   - Out-of-state ownership complications
   - Elderly owner estate planning needs
   - Corporate ownership financial stress
   - Multiple property ownership strain

6. ACQUISITION OPPORTUNITY SCORING:
   - Days until foreclosure auction
   - Total debt vs property value
   - Minimum bid requirements
   - Redemption period implications
   - Competition level assessment
   - Clear title potential

Provide detailed JSON response focusing on distressed acquisition opportunities:
{
  "off_market_score": 0-100,
  "tax_delinquency_analysis": {
    "delinquency_probability": "high|medium|low",
    "estimated_back_taxes": "dollar amount or range",
    "tax_sale_eligible": "yes|no|pending",
    "delinquency_indicators": ["specific tax issues found"]
  },
  "pre_foreclosure_analysis": {
    "foreclosure_stage": "pre_nod|nod_filed|auction_scheduled|redemption_period",
    "estimated_days_to_auction": "number or N/A",
    "total_debt_estimate": "dollar amount",
    "minimum_bid_estimate": "dollar amount",
    "foreclosure_indicators": ["specific pre-foreclosure signals"]
  },
  "financial_distress_score": 0-100,
  "distress_indicators": ["specific distress signals found"],
  "owner_motivation_factors": ["compelling reasons to sell"],
  "acquisition_strategy": {
    "approach_method": "pre_foreclosure_contact|tax_sale|auction_bid|direct_offer",
    "timing_urgency": "immediate|30_days|60_days|monitor",
    "estimated_acquisition_cost": "total investment needed",
    "potential_equity_capture": "percentage below market value"
  },
  "due_diligence_priorities": ["critical items to verify immediately"],
  "contact_timeline": "call_today|this_week|this_month",
  "lead_quality": "A+|A|B|C|D",
  "expected_discount": "percentage range",
  "risk_factors": ["potential deal complications"],
  "action_items": ["immediate next steps prioritized"]
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

// Enhanced rule-based scoring focused on tax delinquency and pre-foreclosure
function enhanceWithRuleBasedScoring(property, analysis) {
  let bonusScore = 0;
  const additionalIndicators = [];
  const taxDelinquencySignals = [];
  const preForeclosureSignals = [];

  // HIGH PRIORITY: Court foreclosure and tax delinquency
  if (property.distress_status === 'Court Foreclosure') {
    bonusScore += 45;
    preForeclosureSignals.push('Court foreclosure case - legal proceeding active');
    additionalIndicators.push('🏛️ COURT FORECLOSURE - Highest Priority Legal Case');
  } else if (property.distress_status === 'Tax Delinquent') {
    bonusScore += 40;
    taxDelinquencySignals.push('Tax delinquent - potential tax sale opportunity');
    additionalIndicators.push('💰 TAX DELINQUENT - Tax Sale Opportunity');
  } else if (property.distress_status === 'Foreclosure') {
    bonusScore += 35;
    preForeclosureSignals.push('Active foreclosure - immediate opportunity');
    additionalIndicators.push('🚨 FORECLOSURE ACTIVE - High Priority Lead');
  } else if (property.distress_status === 'Pre-foreclosure') {
    bonusScore += 30;
    preForeclosureSignals.push('Pre-foreclosure status - early intervention opportunity');
    additionalIndicators.push('⚠️ PRE-FORECLOSURE - Time-Sensitive Lead');
  }

  // TAX DELINQUENCY INDICATORS
  const propertyDetails = (property.details || '').toLowerCase();
  const propertySource = (property.source || '').toLowerCase();

  // Check for tax-related keywords in details
  if (propertyDetails.includes('tax') && (propertyDetails.includes('delinquent') || propertyDetails.includes('lien'))) {
    bonusScore += 25;
    taxDelinquencySignals.push('Tax delinquency mentioned in property details');
    additionalIndicators.push('💰 TAX DELINQUENCY DETECTED');
  }

  // Check for legal notice sources (high indicator of tax issues)
  if (propertySource.includes('legal notice') || propertySource.includes('star advertiser')) {
    bonusScore += 20;
    taxDelinquencySignals.push('Legal notice publication - often tax sale related');
    additionalIndicators.push('📰 LEGAL NOTICE SOURCE - Tax Sale Potential');
    preForeclosureSignals.push('High distress potential');
  }

  // Government sources are highest priority for tax and foreclosure data
  if (propertySource.includes('ecourt') || propertySource.includes('court')) {
    bonusScore += 30;
    preForeclosureSignals.push('Court system record - active legal proceedings');
    additionalIndicators.push('⚖️ COURT RECORD - Active Legal Case');
  } else if (propertySource.includes('mfdr') || propertySource.includes('tax notice')) {
    bonusScore += 35;
    taxDelinquencySignals.push('Official tax notice - confirmed delinquency');
    additionalIndicators.push('🏛️ OFFICIAL TAX NOTICE - Confirmed Delinquent');
  } else if (propertySource.includes('county') || propertySource.includes('honolulu')) {
    bonusScore += 15;
    taxDelinquencySignals.push('County record source - tax payment history available');
    additionalIndicators.push('🏛️ COUNTY RECORD - Verify Tax Status');
  }

  // Check for estate/probate situations (often lead to tax issues)
  if (propertyDetails.includes('estate') || propertyDetails.includes('probate') || propertyDetails.includes('deceased')) {
    bonusScore += 20;
    taxDelinquencySignals.push('Estate/probate situation - potential tax complications');
    additionalIndicators.push('👨‍⚖️ ESTATE/PROBATE - Tax Issues Likely');
  }

  // Absentee ownership indicators (often leads to tax delinquency)
  if (property.owner_name && property.owner_name.includes('LLC') || property.owner_name.includes('Trust')) {
    bonusScore += 10;
    taxDelinquencySignals.push('Corporate/trust ownership - potential management issues');
    additionalIndicators.push('🏢 CORPORATE OWNERSHIP - Verify Tax Payments');
  }

  // Age of listing (older listings may indicate distress)
  const daysOld = (new Date() - new Date(property.created_at)) / (1000 * 60 * 60 * 24);
  if (daysOld > 90) {
    bonusScore += 15;
    additionalIndicators.push('📅 STALE LISTING - Motivated Seller Likely');
  } else if (daysOld < 7) {
    bonusScore += 10;
    additionalIndicators.push('🆕 FRESH OPPORTUNITY - Act Quickly');
  }

  // Price analysis for distressed pricing
  if (property.price < 300000) {
    bonusScore += 20;
    additionalIndicators.push('💸 BELOW MARKET PRICE - Distress Sale Indicator');
  } else if (property.price < 500000) {
    bonusScore += 15;
    additionalIndicators.push('💵 COMPETITIVE PRICING - Good Value Opportunity');
  }

  // Multiple distress factors compound the opportunity
  const distressFactorCount = preForeclosureSignals.length + taxDelinquencySignals.length;
  if (distressFactorCount >= 2) {
    bonusScore += 15;
    additionalIndicators.push('🎯 MULTIPLE DISTRESS FACTORS - Prime Opportunity');
  }

  // Update analysis with enhanced scoring
  analysis.off_market_score = Math.min(100, analysis.off_market_score + bonusScore);
  analysis.indicators = [...(analysis.indicators || []), ...additionalIndicators];
  analysis.tax_delinquency_signals = taxDelinquencySignals;
  analysis.pre_foreclosure_signals = preForeclosureSignals;

  // Set urgency based on foreclosure status
  if (property.distress_status === 'Foreclosure') {
    analysis.urgency = 'critical';
  } else if (property.distress_status === 'Pre-foreclosure' || taxDelinquencySignals.length > 0) {
    analysis.urgency = 'high';
  } else if (analysis.off_market_score > 70) {
    analysis.urgency = 'medium';
  }

  return analysis;
}

// Enhanced fallback analysis focused on tax delinquency and pre-foreclosure indicators
function generateFallbackAnalysis(property) {
  let score = 40;
  const indicators = [];
  const motivationSignals = [];
  const actionItems = [];

  // High priority distress indicators
  if (property.distress_status === 'Foreclosure') {
    score += 40;
    indicators.push('🚨 ACTIVE FORECLOSURE - Immediate Action Required');
    motivationSignals.push('Court-ordered sale - must sell');
    actionItems.push('Research foreclosure auction date immediately');
    actionItems.push('Contact trustee or foreclosure attorney');
  } else if (property.distress_status === 'Pre-foreclosure') {
    score += 35;
    indicators.push('⚠️ PRE-FORECLOSURE - Time-Sensitive Opportunity');
    motivationSignals.push('Mortgage default - facing foreclosure');
    actionItems.push('Contact owner before auction notice');
  }

  // Tax delinquency indicators
  const details = (property.details || '').toLowerCase();
  const source = (property.source || '').toLowerCase();

  if (details.includes('tax') || source.includes('legal notice')) {
    score += 25;
    indicators.push('💰 POTENTIAL TAX ISSUES');
    motivationSignals.push('Tax payment difficulties');
    actionItems.push('Verify property tax payment status');
    actionItems.push('Check for tax liens at County of Honolulu');
  }

  if (source.includes('county') || source.includes('honolulu')) {
    score += 20;
    indicators.push('🏛️ COUNTY RECORD - Tax Data Available');
    actionItems.push('Pull complete tax payment history');
  }

  // Estate/probate situations (high tax delinquency correlation)
  if (details.includes('estate') || details.includes('probate')) {
    score += 25;
    indicators.push('👨‍⚖️ ESTATE/PROBATE - Tax Complications Likely');
    motivationSignals.push('Estate settlement pressure');
    actionItems.push('Contact probate attorney or executor');
    actionItems.push('Verify estate tax obligations');
  }

  // Price indicators
  if (property.price < 400000) {
    score += 20;
    indicators.push('💸 BELOW MARKET PRICING - Distress Sale');
    motivationSignals.push('Financial pressure for quick sale');
  }

  // Determine contact strategy based on distress level
  let contactStrategy = 'Research property background first';
  if (property.distress_status === 'Foreclosure') {
    contactStrategy = 'URGENT: Contact within 24-48 hours';
  } else if (score > 70) {
    contactStrategy = 'Priority contact within 1 week';
  }

  // Enhanced action items for tax-focused analysis
  actionItems.push('Search Hawaii Bureau of Conveyances for liens');
  actionItems.push('Check TMK tax records at honolulu.gov');
  actionItems.push('Verify ownership through county assessor');

  return {
    off_market_score: Math.min(score, 100),
    reasoning: 'Tax delinquency & pre-foreclosure focused analysis',
    indicators: indicators,
    motivation_signals: motivationSignals,
    tax_delinquency_analysis: {
      delinquency_probability: score > 70 ? 'high' : score > 50 ? 'medium' : 'low',
      estimated_back_taxes: 'Requires county lookup',
      tax_sale_eligible: 'Verify with county',
      delinquency_indicators: indicators.filter(i => i.includes('TAX') || i.includes('COUNTY'))
    },
    pre_foreclosure_analysis: {
      foreclosure_stage: property.distress_status === 'Foreclosure' ? 'auction_scheduled' : 
                         property.distress_status === 'Pre-foreclosure' ? 'nod_filed' : 'unknown',
      estimated_days_to_auction: property.distress_status === 'Foreclosure' ? '30-90 days' : 'N/A',
      foreclosure_indicators: indicators.filter(i => i.includes('FORECLOSURE'))
    },
    urgency: score > 85 ? 'critical' : score > 70 ? 'high' : score > 55 ? 'medium' : 'low',
    estimated_discount: score > 80 ? '20-40%' : score > 65 ? '15-25%' : '5-15%',
    contact_strategy: contactStrategy,
    action_items: actionItems,
    lead_quality: score > 85 ? 'A+' : score > 75 ? 'A' : score > 60 ? 'B' : 'C'
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