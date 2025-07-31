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
}

module.exports = AnthropicClient;