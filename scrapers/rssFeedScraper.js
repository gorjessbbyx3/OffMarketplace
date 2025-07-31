
const axios = require('axios');
const xml2js = require('xml2js');
const cheerio = require('cheerio');
const GroqClient = require('../utils/groqClient');

class RSSFeedScraper {
  constructor() {
    this.groqClient = new GroqClient();
    this.rssFeeds = [
      {
        name: 'Connect CRE Hawaii',
        url: 'https://www.connectcre.com/feed?story-market=hawaii',
        type: 'commercial_news'
      }
    ];
  }

  async scrapeAllRSSFeeds() {
    console.log('Starting RSS feed scraping for Hawaii real estate...');
    
    const allResults = [];
    
    for (const feed of this.rssFeeds) {
      try {
        console.log(`Scraping RSS feed: ${feed.name}`);
        const feedResults = await this.scrapeFeed(feed);
        allResults.push(...feedResults);
      } catch (error) {
        console.error(`Error scraping ${feed.name}:`, error);
      }
    }

    console.log(`RSS scraping complete: ${allResults.length} items found`);
    return allResults;
  }

  async scrapeFeed(feed) {
    try {
      // Fetch RSS feed
      const response = await axios.get(feed.url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      // Parse XML
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);
      
      const items = result.rss?.channel?.[0]?.item || [];
      const properties = [];

      for (const item of items.slice(0, 20)) { // Limit to 20 most recent items
        try {
          const property = await this.processRSSItem(item, feed);
          if (property) {
            properties.push(property);
          }
        } catch (error) {
          console.error('Error processing RSS item:', error);
        }
      }

      return properties;

    } catch (error) {
      console.error(`Error fetching RSS feed ${feed.name}:`, error);
      return [];
    }
  }

  async processRSSItem(item, feed) {
    try {
      const title = item.title?.[0] || '';
      const description = item.description?.[0] || '';
      const link = item.link?.[0] || '';
      const pubDate = item.pubDate?.[0] || '';
      const content = item['content:encoded']?.[0] || description;

      // Use AI to analyze if this RSS item contains property information
      const aiAnalysis = await this.analyzeRSSItemWithAI(title, description, content, link);

      if (!aiAnalysis.is_property_related) {
        return null;
      }

      // Extract detailed information using AI
      const propertyData = await this.extractPropertyDataWithAI(title, description, content, link);

      return {
        address: propertyData.address || this.extractAddressFromText(title + ' ' + description),
        price: propertyData.price || this.extractPriceFromText(title + ' ' + description),
        property_type: propertyData.property_type || 'Commercial',
        source: feed.name,
        source_url: link,
        title: title,
        description: this.cleanDescription(description),
        content: this.cleanContent(content),
        published_date: pubDate,
        
        // RSS-specific fields
        rss_category: aiAnalysis.category,
        lead_type: aiAnalysis.lead_type,
        opportunity_type: aiAnalysis.opportunity_type,
        urgency_level: aiAnalysis.urgency_level,
        
        // Investment analysis
        investment_potential: propertyData.investment_score || 60,
        ai_insights: aiAnalysis.insights,
        off_market_indicators: aiAnalysis.off_market_signals,
        
        // Standard fields
        distress_status: this.determineDistressStatus(title, description, content),
        scraped_at: new Date().toISOString(),
        data_type: 'rss_feed'
      };

    } catch (error) {
      console.error('Error processing RSS item:', error);
      return null;
    }
  }

  async analyzeRSSItemWithAI(title, description, content, link) {
    try {
      const prompt = `Analyze this RSS feed item from Hawaii real estate news to determine if it contains property investment opportunities:

Title: ${title}
Description: ${description}
Content: ${content.substring(0, 500)}...
Link: ${link}

Determine:
1. Is this property-related? (vs general news)
2. Does it contain specific property opportunities?
3. What type of opportunity is it?
4. Urgency level for investors
5. Off-market potential signals

Provide JSON response:
{
  "is_property_related": boolean,
  "category": "property_listing|market_news|investment_opportunity|development_news|foreclosure|auction|lease|sale",
  "lead_type": "direct_property|market_intelligence|development_opportunity|distressed_asset",
  "opportunity_type": "commercial|residential|land|mixed_use|industrial",
  "urgency_level": "immediate|high|medium|low",
  "off_market_signals": ["list of indicators"],
  "insights": "brief investment insight",
  "contains_specific_properties": boolean
}`;

      const response = await this.groqClient.analyzeWithGroq(prompt);
      
      try {
        return JSON.parse(response);
      } catch (parseError) {
        // Fallback analysis
        return this.performBasicRSSAnalysis(title, description, content);
      }

    } catch (error) {
      console.error('AI RSS analysis error:', error);
      return this.performBasicRSSAnalysis(title, description, content);
    }
  }

  async extractPropertyDataWithAI(title, description, content, link) {
    try {
      const prompt = `Extract specific property data from this Hawaii real estate RSS item:

Title: ${title}
Description: ${description}
Content: ${content.substring(0, 800)}...

Extract and structure this information:
{
  "address": "specific property address if mentioned",
  "price": "dollar amount if mentioned (number only)",
  "property_type": "Commercial|Office|Retail|Industrial|Warehouse|Land|Mixed-Use|Residential",
  "square_footage": "sqft if mentioned",
  "investment_score": 1-100,
  "key_details": ["important property details"],
  "location_indicators": ["neighborhood, district, or area mentions"],
  "financial_details": ["price, rent, cap rate, etc if mentioned"]
}

Focus on extracting actual property data, not general market commentary.`;

      const response = await this.groqClient.analyzeWithGroq(prompt);
      
      try {
        return JSON.parse(response);
      } catch (parseError) {
        return this.performBasicPropertyExtraction(title, description, content);
      }

    } catch (error) {
      console.error('AI property extraction error:', error);
      return this.performBasicPropertyExtraction(title, description, content);
    }
  }

  performBasicRSSAnalysis(title, description, content) {
    const text = (title + ' ' + description + ' ' + content).toLowerCase();
    
    const propertyKeywords = ['property', 'building', 'real estate', 'lease', 'sale', 'sold', 'listed', 'development'];
    const isPropertyRelated = propertyKeywords.some(keyword => text.includes(keyword));
    
    const urgencyKeywords = ['auction', 'foreclosure', 'deadline', 'closing', 'immediate'];
    const urgencyLevel = urgencyKeywords.some(keyword => text.includes(keyword)) ? 'high' : 'medium';
    
    const offMarketSignals = [];
    if (text.includes('off market') || text.includes('exclusive')) offMarketSignals.push('Exclusive listing mention');
    if (text.includes('owner') && text.includes('direct')) offMarketSignals.push('Direct owner contact');
    if (text.includes('pocket listing')) offMarketSignals.push('Pocket listing reference');

    return {
      is_property_related: isPropertyRelated,
      category: isPropertyRelated ? 'property_listing' : 'market_news',
      lead_type: isPropertyRelated ? 'direct_property' : 'market_intelligence',
      opportunity_type: text.includes('commercial') ? 'commercial' : 'mixed_use',
      urgency_level: urgencyLevel,
      off_market_signals: offMarketSignals,
      insights: 'RSS feed property opportunity identified',
      contains_specific_properties: isPropertyRelated
    };
  }

  performBasicPropertyExtraction(title, description, content) {
    const text = title + ' ' + description + ' ' + content;
    
    return {
      address: this.extractAddressFromText(text),
      price: this.extractPriceFromText(text),
      property_type: this.inferPropertyType(text),
      investment_score: 65,
      key_details: [],
      location_indicators: this.extractLocationIndicators(text),
      financial_details: []
    };
  }

  extractAddressFromText(text) {
    // Hawaii-specific address patterns
    const addressPatterns = [
      /\d+[^,\n]*(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Way|Place|Pl|Circle|Cir|Court|Ct)[^,\n]*(?:,\s*(?:Honolulu|Hawaii|HI))?/gi,
      /[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Way|Place|Pl|Circle|Cir|Court|Ct)[^,\n]*(?:Honolulu|Kailua|Kaneohe|Pearl City|Aiea|Kapolei)/gi
    ];
    
    for (const pattern of addressPatterns) {
      const match = text.match(pattern);
      if (match && match[0].length > 10) {
        return match[0].trim();
      }
    }
    
    return null;
  }

  extractPriceFromText(text) {
    const pricePatterns = [
      /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|M))?/gi,
      /[\d,]+\s*(?:million|M)\s*dollars?/gi
    ];
    
    for (const pattern of pricePatterns) {
      const matches = text.match(pattern);
      if (matches) {
        const prices = matches.map(price => {
          let num = price.replace(/[$,]/g, '').replace(/million|M/i, '');
          if (price.toLowerCase().includes('million') || price.toLowerCase().includes('m')) {
            num = parseFloat(num) * 1000000;
          }
          return parseInt(num);
        });
        return Math.max(...prices.filter(p => p > 50000));
      }
    }
    
    return null;
  }

  inferPropertyType(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('office')) return 'Office';
    if (lowerText.includes('retail')) return 'Retail';
    if (lowerText.includes('warehouse') || lowerText.includes('industrial')) return 'Industrial';
    if (lowerText.includes('land') || lowerText.includes('lot')) return 'Land';
    if (lowerText.includes('mixed use')) return 'Mixed-Use';
    if (lowerText.includes('residential') || lowerText.includes('apartment')) return 'Residential';
    
    return 'Commercial';
  }

  extractLocationIndicators(text) {
    const hawaiiAreas = [
      'Honolulu', 'Waikiki', 'Kakaako', 'Ala Moana', 'Downtown', 'Chinatown',
      'Kailua', 'Kaneohe', 'Pearl City', 'Aiea', 'Kapolei', 'Ewa Beach',
      'Kalihi', 'Moiliili', 'Manoa', 'Diamond Head', 'Kahala'
    ];
    
    const indicators = [];
    const lowerText = text.toLowerCase();
    
    hawaiiAreas.forEach(area => {
      if (lowerText.includes(area.toLowerCase())) {
        indicators.push(area);
      }
    });
    
    return indicators;
  }

  determineDistressStatus(title, description, content) {
    const text = (title + ' ' + description + ' ' + content).toLowerCase();
    
    if (text.includes('foreclosure') || text.includes('auction')) return 'Foreclosure';
    if (text.includes('distressed') || text.includes('motivated seller')) return 'Distressed';
    if (text.includes('quick sale') || text.includes('urgent')) return 'Motivated Sale';
    
    return 'Market Rate';
  }

  cleanDescription(description) {
    if (!description) return '';
    
    // Remove HTML tags
    const $ = cheerio.load(description);
    let cleaned = $.text();
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Limit length
    return cleaned.substring(0, 300);
  }

  cleanContent(content) {
    if (!content) return '';
    
    // Remove HTML tags
    const $ = cheerio.load(content);
    let cleaned = $.text();
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Limit length
    return cleaned.substring(0, 500);
  }
}

module.exports = RSSFeedScraper;
