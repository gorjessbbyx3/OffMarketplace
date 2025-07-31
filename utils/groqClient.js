
const Groq = require('groq-sdk');

class GroqClient {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async analyzeProperty(property) {
    try {
      const prompt = `
Analyze this Hawaii property as a comprehensive real estate investment opportunity:

PROPERTY DETAILS:
Address: ${property.address}
Price: $${property.price?.toLocaleString()}
Property Type: ${property.property_type}
Units: ${property.units || 1}
Square Footage: ${property.sqft || 'N/A'}
Distress Status: ${property.distress_status}
Source: ${property.source}
Details: ${property.details || 'N/A'}

Provide a comprehensive analysis including:

1. TENANT REVENUE ANALYSIS:
   - Estimated monthly rent per unit
   - Total monthly rental income potential
   - Annual gross rental income
   - Occupancy rate assumptions for Hawaii market
   - Seasonal rental variations (tourist vs long-term)

2. LEASE STRUCTURE ANALYSIS:
   - Fee simple vs leasehold determination
   - If leasehold: estimated lease expiration, ground rent
   - Existing tenant lease terms (if any)
   - Rent control considerations in Hawaii

3. PROPERTY CONDITION ASSESSMENT:
   - Move-in ready vs renovation needed
   - Fix and flip potential vs buy and hold
   - Estimated renovation costs if needed
   - Furnished vs unfurnished rental potential
   - Property age and maintenance requirements

4. FINANCIAL PROJECTIONS:
   - Cash flow analysis (income - expenses)
   - Cap rate estimation
   - Cash-on-cash return
   - Total ROI including appreciation

5. SOURCE RELIABILITY:
   - Data source credibility (1-10)
   - Information completeness
   - Last updated/verification status

6. INVESTMENT STRATEGY RECOMMENDATION:
   - Buy and hold vs flip recommendation
   - Short-term rental (Airbnb) vs long-term rental
   - Value-add opportunities
   - Exit strategy options

Format as JSON with detailed calculations and reasoning.
`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an expert Hawaii real estate investment analyzer. Provide detailed, actionable insights about property investment opportunities. Focus on identifying off-market potential and distressed opportunities."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.3,
        max_tokens: 1024,
      });

      const response = completion.choices[0]?.message?.content;
      
      try {
        return JSON.parse(response);
      } catch (parseError) {
        return {
          investment_score: 6,
          analysis: response,
          error: 'Failed to parse JSON response'
        };
      }

    } catch (error) {
      console.error('GROQ property analysis error:', error);
      return {
        investment_score: 5,
        error: 'Analysis unavailable',
        fallback: true
      };
    }
  }

  async identifyOffMarketOpportunities(properties) {
    try {
      const prompt = `
Analyze these Hawaii properties for off-market opportunities:

${properties.map(p => `
- Address: ${p.address}
- Price: $${p.price?.toLocaleString()}
- Type: ${p.property_type}
- Status: ${p.distress_status}
- Source: ${p.source}
`).join('\n')}

Identify the top off-market opportunities and provide insights about each property's potential.
`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a Hawaii real estate expert specializing in identifying off-market opportunities."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.3,
        max_tokens: 1500,
      });

      return completion.choices[0]?.message?.content || 'No opportunities identified';

    } catch (error) {
      console.error('GROQ off-market analysis error:', error);
      return 'Off-market analysis unavailable';
    }
  }

  async generateMarketInsights(properties) {
    try {
      const prompt = `
Generate market insights for Hawaii real estate based on these properties:

${properties.map(p => `${p.address}: $${p.price?.toLocaleString()}`).join('\n')}

Provide market trends, pricing analysis, and investment recommendations.
`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a Hawaii real estate market analyst."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.3,
        max_tokens: 1000,
      });

      return completion.choices[0]?.message?.content || 'Market insights unavailable';

    } catch (error) {
      console.error('GROQ market insights error:', error);
      return 'Market insights unavailable';
    }
  }

  async generateDetailedPropertyReport(property, groqAnalysis) {
    try {
      const prompt = `
Generate a detailed property report for:

Property: ${property.address}
Price: $${property.price?.toLocaleString()}
Initial Analysis: ${JSON.stringify(groqAnalysis)}

Provide detailed investment analysis, risk assessment, and recommendations.
`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a senior real estate analyst preparing detailed property reports."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.2,
        max_tokens: 1500,
      });

      return {
        detailed_analysis: completion.choices[0]?.message?.content || 'Report unavailable',
        analysis_confidence: 'high',
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('GROQ detailed report error:', error);
      return {
        detailed_analysis: 'Report generation failed',
        analysis_confidence: 'low',
        error: error.message
      };
    }
  }

  async searchProperties(searchCriteria) {
    try {
      const prompt = `
Search for Hawaii properties matching these criteria:

Location: ${searchCriteria.location}
Property Type: ${searchCriteria.property_type}
Budget: $${searchCriteria.budget?.toLocaleString()}
Additional Criteria: ${searchCriteria.criteria}

Provide realistic property matches with addresses, pricing, and investment potential.
Format as JSON with property details.
`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a Hawaii real estate search specialist with access to current market data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.4,
        max_tokens: 1500,
      });

      try {
        return JSON.parse(completion.choices[0]?.message?.content);
      } catch (parseError) {
        return {
          properties: [],
          search_results: completion.choices[0]?.message?.content,
          total_found: 0
        };
      }

    } catch (error) {
      console.error('GROQ property search error:', error);
      return {
        properties: [],
        error: 'Search unavailable',
        total_found: 0
      };
    }
  }

  async findSpecificProperty(searchCriteria) {
    try {
      const prompt = `
Find specific Hawaii property matching:

Location: ${searchCriteria.location}
Property Type: ${searchCriteria.property_type}
Price Range: ${searchCriteria.price_range}
Status: ${searchCriteria.status}
Specific Request: ${searchCriteria.specific_request}

Provide detailed information about matching properties.
`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a Hawaii real estate expert with deep knowledge of Kakaako properties, pre-foreclosure listings, and multi-unit apartment buildings. Provide specific, actionable information about properties that match the user's criteria."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.1,
        max_tokens: 2048,
      });

      return completion.choices[0]?.message?.content || 'No specific matches found';

    } catch (error) {
      console.error('GROQ specific property search error:', error);
      return this.getFallbackPropertySearch(searchCriteria);
    }
  }

  getFallbackPropertySearch(criteria) {
    return `
Fallback search results for ${criteria.location}:

Potential Areas to Check:
- 1200-1400 Ala Moana Boulevard (Kakaako waterfront)
- 600-800 Ala Moana Boulevard area
- Keeaumoku Street corridor
- Queen Street developments

Recommended Actions:
1. Check foreclosure.com for Kakaako listings
2. Search Hawaii BOC database for properties in 96813 zip code
3. Contact local real estate agents specializing in Kakaako
4. Monitor auction sites for multi-unit properties

Investment Considerations:
- Kakaako is experiencing rapid development
- Zoning allows for high-density residential
- Strong rental demand from young professionals
- Transit-oriented development potential

Note: This is fallback information. For current listings, use real estate databases and local contacts.
`;
  }
}

module.exports = GroqClient;
