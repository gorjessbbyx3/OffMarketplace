const Anthropic = require('@anthropic-ai/sdk');

class AnthropicClient {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateDetailedPropertyReport(property, groqAnalysis) {
    try {
      const prompt = `
Create a comprehensive investment property report for this Hawaii real estate opportunity:

PROPERTY DETAILS:
- Address: ${property.address}
- Price: $${property.price?.toLocaleString()}
- Property Type: ${property.property_type}
- Units: ${property.units || 'N/A'}
- Square Footage: ${property.sqft || 'N/A'}
- Distress Status: ${property.distress_status || 'Standard Market'}
- Source: ${property.source}
- Details: ${property.details || 'Limited details available'}

GROQ AI INITIAL ANALYSIS:
${JSON.stringify(groqAnalysis, null, 2)}

Please provide a detailed investment report including:

1. EXECUTIVE SUMMARY (2-3 sentences)

2. INVESTMENT HIGHLIGHTS (Top 3-5 bullet points)

3. TENANT REVENUE ANALYSIS
   - Detailed rental income projections by unit
   - Market rent comparisons for the area
   - Seasonal rental variations (tourist vs local market)
   - Vacancy rate assumptions
   - Annual gross income potential

4. LEASE & TENURE ANALYSIS
   - Fee simple vs leasehold assessment
   - Ground lease details (if applicable)
   - Existing tenant lease terms and expiration dates
   - Rent escalation clauses
   - Hawaii-specific lease considerations

5. PROPERTY CONDITION & INVESTMENT STRATEGY
   - Move-in ready vs renovation requirements
   - Fix and flip vs buy-and-hold recommendation
   - Estimated renovation costs and timeline
   - Furnished vs unfurnished rental strategy
   - Short-term rental (STR) permit potential

6. COMPREHENSIVE FINANCIAL ANALYSIS
   - Monthly cash flow projections
   - Operating expense estimates (taxes, insurance, maintenance)
   - Cap rate and cash-on-cash return calculations
   - Break-even analysis
   - 5-year appreciation projections

7. SOURCE DATA RELIABILITY
   - Information source credibility assessment
   - Data gaps and verification needs
   - Recommended additional research

8. MARKET ANALYSIS
   - Neighborhood overview and trends
   - Comparable sales analysis
   - Tourism impact on rental market

9. RISK ASSESSMENT
   - Primary risks and mitigation strategies
   - Market volatility factors
   - Regulatory risks (STR restrictions, rent control)

10. DUE DILIGENCE CHECKLIST
    - Financial document verification
    - Property inspection priorities
    - Legal and zoning confirmations

11. INVESTMENT RECOMMENDATION
    - Buy/Hold/Pass recommendation with reasoning
    - Optimal purchase price range
    - Recommended financing structure
    - Timeline and next steps

Format the report in clear sections with specific numbers and actionable insights.
`;

      const message = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      return {
        detailed_report: message.content[0].text,
        generated_at: new Date().toISOString(),
        model_used: "claude-3-5-sonnet-20241022",
        analysis_confidence: "high"
      };

    } catch (error) {
      console.error('Anthropic API error:', error);
      return this.getFallbackReport(property, groqAnalysis);
    }
  }

  async generateMarketInsights(properties) {
    try {
      const propertiesSummary = properties.slice(0, 5).map(p => 
        `${p.address} - $${p.price?.toLocaleString()} - ${p.distress_status} - Score: ${p.investment_score}/10`
      ).join('\n');

      const prompt = `
Analyze these Hawaii investment properties and provide strategic market insights:

PROPERTIES:
${propertiesSummary}

Provide a comprehensive market analysis including:

1. MARKET TRENDS ANALYSIS
   - Current Hawaii real estate market conditions
   - Emerging opportunities in distressed properties
   - Price trend predictions

2. INVESTMENT STRATEGY RECOMMENDATIONS
   - Best property types for current market
   - Timing considerations
   - Portfolio diversification advice

3. OFF-MARKET OPPORTUNITY ASSESSMENT
   - Likelihood of finding off-market deals
   - Best sources for distressed properties
   - Negotiation strategies

4. ACTIONABLE NEXT STEPS
   - Immediate actions to take
   - Resources to leverage
   - Timeline recommendations

Keep insights practical and actionable for a Hawaii real estate investor.
`;

      const message = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      return {
        market_insights: message.content[0].text,
        generated_at: new Date().toISOString(),
        properties_analyzed: properties.length
      };

    } catch (error) {
      console.error('Anthropic market analysis error:', error);
      return {
        market_insights: "Anthropic AI analysis temporarily unavailable. Focus on properties with high investment scores and distress indicators.",
        generated_at: new Date().toISOString(),
        properties_analyzed: properties.length
      };
    }
  }

  getFallbackReport(property, groqAnalysis) {
    return {
      detailed_report: `
DETAILED PROPERTY REPORT - ${property.address}

EXECUTIVE SUMMARY:
This ${property.property_type} property at $${property.price?.toLocaleString()} presents ${groqAnalysis.investment_score >= 7 ? 'strong' : 'moderate'} investment potential based on initial analysis.

INVESTMENT HIGHLIGHTS:
• ${property.distress_status ? 'Distressed property opportunity' : 'Standard market listing'}
• Price point: $${property.price?.toLocaleString()}
• Source reliability: ${property.source}

FINANCIAL ANALYSIS:
• Estimated ROI: ${groqAnalysis.roi_potential || '6-12% annually'}
• Investment Score: ${groqAnalysis.investment_score}/10

RECOMMENDATION:
${groqAnalysis.investment_score >= 7 ? 'STRONG BUY' : groqAnalysis.investment_score >= 5 ? 'CONSIDER' : 'PASS'} - Proceed with due diligence.

Note: Detailed analysis temporarily unavailable. Contact support if API issues persist.
`,
      generated_at: new Date().toISOString(),
      model_used: "fallback-analysis",
      analysis_confidence: "moderate"
    };
  }

  // Timing Analysis Methods
  async analyzeOptimalTiming(property) {
    try {
      const prompt = `
Analyze optimal acquisition timing for this Hawaii property:

Property: ${property.address}
Price: $${property.price?.toLocaleString()}
Type: ${property.property_type}
Status: ${property.distress_status || 'Standard'}

Provide comprehensive timing analysis:

1. CURRENT MARKET CONDITIONS
   - Where we are in the market cycle
   - Seasonal factors affecting pricing
   - Local market dynamics

2. PROPERTY-SPECIFIC TIMING FACTORS
   - Seller motivation indicators
   - Competition level assessment
   - Urgency factors (foreclosure timeline, etc.)

3. OPTIMAL ACQUISITION WINDOW
   - Best time to make an offer
   - Price negotiation timing
   - Closing timeline recommendations

4. RISK FACTORS
   - Waiting risks vs. acting now
   - Market timing risks
   - Competition risks

5. ACTION PLAN
   - Immediate steps to take
   - Timeline for decision making
   - Backup strategies

Format as detailed analysis with specific recommendations.
`;

      const message = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      return {
        timing_analysis: message.content[0].text,
        generated_at: new Date().toISOString(),
        confidence_level: "high"
      };

    } catch (error) {
      console.error('Optimal timing analysis error:', error);
      return {
        timing_analysis: "Market timing analysis suggests acting on strong opportunities quickly in Hawaii's competitive market.",
        generated_at: new Date().toISOString(),
        confidence_level: "low"
      };
    }
  }

  // Document Analysis Methods
  async parseNOD(nodDocument) {
    try {
      const prompt = `
Parse this Notice of Default (NOD) document and extract key information:

Document: ${nodDocument}

Extract and analyze:

1. FINANCIAL DETAILS
   - Total debt amount
   - Monthly payment amount
   - Amount in arrears
   - Late fees and penalties
   - Legal costs

2. KEY DATES
   - Date of default
   - Cure period deadline
   - Estimated sale date
   - Notice recording date

3. PROPERTY INFORMATION
   - Property address
   - Legal description
   - Assessor's parcel number
   - Current owner information

4. LEGAL DETAILS
   - Trustee information
   - Beneficiary/lender details
   - Deed of trust recording info
   - Legal requirements for cure

5. INVESTMENT OPPORTUNITY ASSESSMENT
   - Opportunity score (1-10)
   - Timeline urgency
   - Potential acquisition strategies
   - Risk factors
   - Recommended actions

Provide structured analysis with specific actionable insights.
`;

      const message = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const analysis = message.content[0].text;

      return {
        parsed_nod: analysis,
        default_date: this.extractDate(analysis, 'default'),
        cure_deadline: this.extractDate(analysis, 'cure'),
        estimated_sale_date: this.extractDate(analysis, 'sale'),
        total_debt: this.extractAmount(analysis, 'debt'),
        monthly_payment: this.extractAmount(analysis, 'payment'),
        arrears_amount: this.extractAmount(analysis, 'arrears'),
        opportunity_score: this.extractScore(analysis),
        recommended_actions: this.extractActions(analysis),
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('NOD parsing error:', error);
      return {
        parsed_nod: "NOD parsing failed",
        opportunity_score: 5,
        recommended_actions: ["Manual review required"],
        error: error.message
      };
    }
  }

  async analyzeContract(contractText, contractType) {
    try {
      const prompt = `
Analyze this ${contractType} contract for a Hawaii real estate transaction:

Contract Text: ${contractText}

Provide comprehensive contract analysis:

1. FAVORABLE TERMS
   - Terms that benefit the buyer/investor
   - Competitive advantages
   - Cost savings opportunities

2. UNFAVORABLE TERMS
   - Terms that disadvantage the buyer
   - Potential cost increases
   - Risk factors

3. RISK ASSESSMENT
   - Overall risk level (Low/Medium/High)
   - Specific risks identified
   - Financial exposure
   - Legal risks
   - Performance risks

4. RISK MITIGATION STRATEGIES
   - Specific actions to reduce risks
   - Contract amendments to request
   - Due diligence steps required

5. NEGOTIATION RECOMMENDATIONS
   - Terms to renegotiate
   - Contingencies to add/modify
   - Timeline adjustments needed

6. HAWAII-SPECIFIC CONSIDERATIONS
   - Local law implications
   - Hawaii real estate customs
   - Regulatory compliance issues

Provide actionable recommendations for contract optimization.
`;

      const message = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      const analysis = message.content[0].text;

      return {
        contract_analysis: analysis,
        risk_level: this.extractRiskLevel(analysis),
        identified_risks: this.extractRisks(analysis),
        favorable_terms: this.extractFavorableTerms(analysis),
        unfavorable_terms: this.extractUnfavorableTerms(analysis),
        recommendations: this.extractRecommendations(analysis),
        risk_mitigation: this.extractMitigation(analysis),
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('Contract analysis error:', error);
      return {
        contract_analysis: "Contract analysis failed",
        risk_level: "Medium",
        identified_risks: ["Manual review required"],
        recommendations: ["Seek legal counsel"],
        error: error.message
      };
    }
  }

  // Helper methods for data extraction
  extractDate(text, type) {
    // Simple regex patterns for date extraction
    const patterns = {
      default: /default.*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
      cure: /cure.*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
      sale: /sale.*?(\d{1,2}\/\d{1,2}\/\d{4})/i
    };
    
    const match = text.match(patterns[type]);
    return match ? match[1] : null;
  }

  extractAmount(text, type) {
    const patterns = {
      debt: /total debt.*?\$?([\d,]+)/i,
      payment: /monthly payment.*?\$?([\d,]+)/i,
      arrears: /arrears.*?\$?([\d,]+)/i
    };
    
    const match = text.match(patterns[type]);
    return match ? match[1] : null;
  }

  extractScore(text) {
    const match = text.match(/score.*?(\d+)/i);
    return match ? parseInt(match[1]) : 5;
  }

  extractActions(text) {
    const actionMatch = text.match(/recommended actions?:?\s*(.*?)(?:\n\n|\n[A-Z]|$)/is);
    if (actionMatch) {
      return actionMatch[1].split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•]\s*/, ''));
    }
    return ["Review document manually"];
  }

  extractRiskLevel(text) {
    if (text.toLowerCase().includes('high risk')) return 'High';
    if (text.toLowerCase().includes('low risk')) return 'Low';
    return 'Medium';
  }

  extractRisks(text) {
    const riskMatch = text.match(/risks?.*?:(.*?)(?:\n\n|\n[A-Z]|$)/is);
    if (riskMatch) {
      return riskMatch[1].split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•]\s*/, ''));
    }
    return ["Manual risk assessment needed"];
  }

  extractFavorableTerms(text) {
    const match = text.match(/favorable.*?:(.*?)(?:\n\n|\n[A-Z]|$)/is);
    if (match) {
      return match[1].split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•]\s*/, ''));
    }
    return ["Manual review of favorable terms needed"];
  }

  extractUnfavorableTerms(text) {
    const match = text.match(/unfavorable.*?:(.*?)(?:\n\n|\n[A-Z]|$)/is);
    if (match) {
      return match[1].split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•]\s*/, ''));
    }
    return ["Manual review of unfavorable terms needed"];
  }

  extractRecommendations(text) {
    const match = text.match(/recommendation.*?:(.*?)(?:\n\n|\n[A-Z]|$)/is);
    if (match) {
      return match[1].split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•]\s*/, ''));
    }
    return ["Seek professional advice"];
  }

  extractMitigation(text) {
    const match = text.match(/mitigation.*?:(.*?)(?:\n\n|\n[A-Z]|$)/is);
    if (match) {
      return match[1].split('\n').filter(line => line.trim()).map(line => line.replace(/^[-•]\s*/, ''));
    }
    return ["Standard risk mitigation practices"];
  }
}

module.exports = AnthropicClient;