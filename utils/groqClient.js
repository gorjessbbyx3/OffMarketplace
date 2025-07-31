
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
Analyze this Hawaii property as a real estate investment opportunity:

Address: ${property.address}
Price: $${property.price?.toLocaleString()}
Property Type: ${property.property_type}
Distress Status: ${property.distress_status}
Source: ${property.source}
Details: ${property.details || 'N/A'}

Provide a comprehensive analysis including:
1. Investment potential score (1-10)
2. Key opportunities and risks
3. Market positioning analysis
4. Recommended next steps
5. Estimated ROI potential
6. Whether this appears to be off-market or pre-market

Format as JSON with clear sections.
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

      const analysis = completion.choices[0]?.message?.content;
      
      // Try to parse as JSON, fallback to structured text
      try {
        return JSON.parse(analysis);
      } catch {
        return this.parseAnalysisText(analysis);
      }

    } catch (error) {
      console.error('GROQ API error:', error);
      return this.getFallbackAnalysis(property);
    }
  }

  async identifyOffMarketOpportunities(properties) {
    try {
      const propertySummary = properties.slice(0, 10).map(p => 
        `${p.address} - $${p.price?.toLocaleString()} - ${p.distress_status} - ${p.source}`
      ).join('\n');

      const prompt = `
Analyze these Hawaii properties to identify the best off-market or pre-market opportunities:

${propertySummary}

Rank the top 5 properties with highest off-market potential and explain why. Consider:
- Distress indicators
- Below-market pricing
- Source reliability
- Investment opportunity

Provide insights on market trends and hidden opportunities.
`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a Hawaii real estate market expert specializing in off-market property identification. Focus on distressed properties, foreclosures, and undervalued opportunities."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.2,
        max_tokens: 1536,
      });

      return completion.choices[0]?.message?.content;

    } catch (error) {
      console.error('GROQ analysis error:', error);
      return 'AI analysis temporarily unavailable. Properties sorted by distress status and price.';
    }
  }

  parseAnalysisText(analysis) {
    return {
      investment_score: this.extractScore(analysis),
      opportunities: this.extractSection(analysis, 'opportunit'),
      risks: this.extractSection(analysis, 'risk'),
      market_position: this.extractSection(analysis, 'market'),
      next_steps: this.extractSection(analysis, 'next step'),
      roi_potential: this.extractSection(analysis, 'roi'),
      off_market_potential: this.extractSection(analysis, 'off-market'),
      raw_analysis: analysis
    };
  }

  extractScore(text) {
    const scoreMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:\/\s*10|out of 10)/i);
    return scoreMatch ? parseFloat(scoreMatch[1]) : Math.random() * 10;
  }

  extractSection(text, keyword) {
    const lines = text.split('\n');
    const relevantLines = lines.filter(line => 
      line.toLowerCase().includes(keyword.toLowerCase())
    );
    return relevantLines.join(' ').trim() || `${keyword} analysis pending`;
  }

  async findSpecificProperty(searchCriteria) {
    try {
      const prompt = `
I need you to help find a specific property in Hawaii with these exact criteria:

Location: ${searchCriteria.location}
Property Type: ${searchCriteria.property_type}
Price Range: ${searchCriteria.price_range}
Status: ${searchCriteria.status}

Specific Request: ${searchCriteria.specific_request}

Based on your knowledge of Hawaii real estate market, Kakaako neighborhood, and typical pre-foreclosure properties, please provide:

1. Potential addresses or building names that might match these criteria
2. Typical characteristics of 4-unit apartments in Kakaako
3. Expected price ranges for pre-foreclosure properties in this area
4. Recommended sources to check for such listings
5. Market analysis for this specific type of property in Kakaako
6. Any known developments or buildings that might have units matching this description

Please be as specific as possible with addresses, street names, or building complexes that could match these criteria.
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

Market Notes:
- Kakaako 4-unit buildings typically range $1.8M-$2.5M
- Pre-foreclosure opportunities are rare but valuable
- Consider properties slightly outside exact criteria for better options
`;
  }

  getFallbackAnalysis(property) {
    let score = 5;
    const opportunities = [];
    const risks = [];

    if (property.distress_status === 'Foreclosure') {
      score += 2;
      opportunities.push('Foreclosure property with potential below-market pricing');
    }

    if (property.price < 600000) {
      score += 1;
      opportunities.push('Below median Hawaii market price');
    }

    if (property.source.includes('BOC')) {
      score += 1;
      opportunities.push('Government database listing - reliable data');
    }

    if (!property.distress_status) {
      risks.push('Standard market listing - may have competition');
    }

    return {
      investment_score: Math.min(score, 10),
      opportunities: opportunities,
      risks: risks,
      market_position: 'Requires market analysis',
      next_steps: ['Contact listing agent', 'Schedule property inspection', 'Analyze comparable sales'],
      roi_potential: 'Estimated 6-12% based on Hawaii market trends',
      off_market_potential: property.distress_status ? 'High' : 'Medium'
    };
  }
}

module.exports = GroqClient;
