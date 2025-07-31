
const axios = require('axios');
const xml2js = require('xml2js');
const GroqClient = require('../utils/groqClient');

class RSSScraper {
  constructor() {
    this.groqClient = new GroqClient();
    this.feeds = {
      'distressed-assets': 'https://www.connectcre.com/feed?property-sector=distressed-assets',
      'apartments': 'https://www.connectcre.com/feed?property-sector=apartments',
      'hospitality': 'https://www.connectcre.com/feed?property-sector=hospitality',
      'opportunity-zones': 'https://www.connectcre.com/feed?property-sector=opportunity-zones',
      'office': 'https://www.connectcre.com/feed?property-sector=office',
      'retail': 'https://www.connectcre.com/feed?property-sector=retail',
      'industrial': 'https://www.connectcre.com/feed?property-sector=industrial'
    };
  }

  async scrapeRSSFeed(feedUrl, sector) {
    try {
      console.log(`Scraping RSS feed: ${sector}`);
      
      const response = await axios.get(feedUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);
      
      const items = result.rss?.channel?.[0]?.item || [];
      const properties = [];

      for (const item of items.slice(0, 20)) { // Limit to 20 items per feed
        try {
          const title = item.title?.[0] || '';
          const description = item.description?.[0] || '';
          const link = item.link?.[0] || '';
          const pubDate = item.pubDate?.[0] || '';

          // Filter for Hawaii-related content
          const content = `${title} ${description}`.toLowerCase();
          if (!this.isHawaiiRelated(content)) {
            continue;
          }

          // Use AI to extract property information
          const propertyData = await this.extractPropertyInfo(title, description, link, sector);
          
          if (propertyData && propertyData.address) {
            properties.push({
              ...propertyData,
              source: `ConnectCRE-${sector}`,
              rss_link: link,
              published_date: pubDate,
              scraped_at: new Date().toISOString()
            });
          }

        } catch (itemError) {
          console.error('Error processing RSS item:', itemError);
        }
      }

      console.log(`Found ${properties.length} Hawaii properties in ${sector} feed`);
      return properties;

    } catch (error) {
      console.error(`Error scraping RSS feed ${sector}:`, error);
      return [];
    }
  }

  isHawaiiRelated(content) {
    const hawaiiKeywords = [
      'hawaii', 'honolulu', 'oahu', 'maui', 'kauai', 'big island',
      'waikiki', 'pearl harbor', 'kakaako', 'ala moana', 'kailua',
      'kaneohe', 'waipahu', 'mililani', 'aiea', 'keeaumoku'
    ];
    
    return hawaiiKeywords.some(keyword => content.includes(keyword));
  }

  async extractPropertyInfo(title, description, link, sector) {
    try {
      const prompt = `Extract Hawaii property information from this ConnectCRE listing:

Title: ${title}
Description: ${description}
Sector: ${sector}
Link: ${link}

Extract and return JSON with:
{
  "address": "specific address if mentioned",
  "price": number or null,
  "property_type": "type based on sector",
  "distress_status": "distressed status if mentioned",
  "sqft": number or null,
  "investment_opportunity": "key opportunity described",
  "location_details": "specific Hawaii location mentioned"
}

Only return valid JSON. If no Hawaii address is found, return null.`;

      const completion = await this.groqClient.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a Hawaii real estate data extraction expert. Extract only Hawaii properties and return valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.1,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) return null;

      try {
        const propertyData = JSON.parse(response);
        
        // Validate that we have Hawaii-specific data
        if (!propertyData.address && !propertyData.location_details) {
          return null;
        }

        return {
          address: propertyData.address || `Hawaii ${sector} Property`,
          price: propertyData.price,
          property_type: propertyData.property_type || this.sectorToPropertyType(sector),
          distress_status: propertyData.distress_status || (sector === 'distressed-assets' ? 'Distressed' : 'Market Rate'),
          sqft: propertyData.sqft,
          investment_opportunity: propertyData.investment_opportunity || title,
          location_details: propertyData.location_details,
          rss_title: title,
          rss_description: description
        };

      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        return null;
      }

    } catch (aiError) {
      console.error('AI extraction error:', aiError);
      return null;
    }
  }

  sectorToPropertyType(sector) {
    const mapping = {
      'distressed-assets': 'Distressed Property',
      'apartments': 'Multi-family',
      'hospitality': 'Hotel/Resort',
      'opportunity-zones': 'Opportunity Zone',
      'office': 'Commercial Office',
      'retail': 'Retail',
      'industrial': 'Industrial'
    };
    return mapping[sector] || 'Commercial';
  }

  async scrapeAllFeeds() {
    console.log('Starting RSS feed scraping for all property sectors...');
    
    const allProperties = [];
    
    for (const [sector, feedUrl] of Object.entries(this.feeds)) {
      try {
        const properties = await this.scrapeRSSFeed(feedUrl, sector);
        allProperties.push(...properties);
        
        // Add delay between feeds to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Error scraping ${sector} feed:`, error);
      }
    }

    console.log(`RSS scraping complete: ${allProperties.length} total properties found`);
    return allProperties;
  }

  async scrapeDistressedAssetsOnly() {
    console.log('Scraping distressed assets feed for off-market opportunities...');
    
    const distressedProperties = await this.scrapeRSSFeed(
      this.feeds['distressed-assets'], 
      'distressed-assets'
    );

    // Enhanced analysis for distressed properties
    const enhancedProperties = await Promise.all(
      distressedProperties.map(async (property) => {
        const aiAnalysis = await this.analyzeDistressedProperty(property);
        return {
          ...property,
          off_market_score: aiAnalysis.off_market_score || 75,
          urgency_level: aiAnalysis.urgency_level || 'high',
          investment_strategy: aiAnalysis.investment_strategy,
          risk_factors: aiAnalysis.risk_factors || [],
          opportunity_indicators: aiAnalysis.opportunity_indicators || []
        };
      })
    );

    return enhancedProperties;
  }

  async analyzeDistressedProperty(property) {
    try {
      const prompt = `Analyze this Hawaii distressed property for off-market potential:

Property: ${property.address}
Price: ${property.price ? '$' + property.price.toLocaleString() : 'TBD'}
Type: ${property.property_type}
Opportunity: ${property.investment_opportunity}
Description: ${property.rss_description}

Provide JSON analysis:
{
  "off_market_score": 0-100,
  "urgency_level": "critical/high/medium/low",
  "investment_strategy": "recommended approach",
  "risk_factors": ["risk1", "risk2"],
  "opportunity_indicators": ["indicator1", "indicator2"]
}`;

      const completion = await this.groqClient.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a Hawaii distressed real estate investment expert. Provide actionable analysis."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.2,
        max_tokens: 400,
      });

      const response = completion.choices[0]?.message?.content;
      return JSON.parse(response);

    } catch (error) {
      console.error('Distressed property analysis error:', error);
      return {
        off_market_score: 70,
        urgency_level: 'high',
        investment_strategy: 'Investigate distressed opportunity',
        risk_factors: ['Market analysis needed'],
        opportunity_indicators: ['Listed as distressed asset']
      };
    }
  }
}

module.exports = RSSScraper;
