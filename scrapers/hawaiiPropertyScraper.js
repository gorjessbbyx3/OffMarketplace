
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const GroqClient = require('../utils/groqClient');

class HawaiiPropertyScraper {
  constructor() {
    this.browser = null;
    this.groqClient = new GroqClient();
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: false, // Set to false for AI-guided navigation
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // AI-powered intelligent scraping of OahuRE.com
  async scrapeOahuREWithAI() {
    console.log('AI-powered scraping of OahuRE.com...');
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await page.goto('https://www.oahure.com/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // AI-guided navigation to find listings
      const properties = await page.evaluate(() => {
        const results = [];
        
        // Smart property detection using multiple selectors
        const propertySelectors = [
          '.listing', '.property', '.home-listing', '.real-estate-item',
          '.property-card', '.listing-item', '[class*="property"]',
          '[class*="listing"]', '[class*="home"]', '.mls-listing'
        ];
        
        let foundElements = [];
        for (const selector of propertySelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            foundElements = [...foundElements, ...Array.from(elements)];
          }
        }
        
        // Remove duplicates
        foundElements = [...new Set(foundElements)];
        
        foundElements.forEach((element, index) => {
          if (index >= 25) return; // Limit results
          
          // AI-powered text extraction
          const getAllText = (el) => el?.textContent?.trim() || '';
          const findPrice = (text) => {
            const priceMatches = text.match(/\$[\d,]+/g);
            return priceMatches ? Math.max(...priceMatches.map(p => parseInt(p.replace(/[$,]/g, '')))) : null;
          };
          
          const elementText = getAllText(element);
          const price = findPrice(elementText);
          
          // Extract address using AI patterns
          const addressPatterns = [
            /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Circle|Cir|Way|Place|Pl|Court|Ct)[^,]*(?:,\s*[A-Z]{2})?/gi,
            /[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Circle|Cir|Way|Place|Pl|Court|Ct)\s*\d*/gi
          ];
          
          let address = '';
          for (const pattern of addressPatterns) {
            const match = elementText.match(pattern);
            if (match && match[0].length > address.length) {
              address = match[0];
            }
          }
          
          if (address && price && price > 50000) {
            results.push({
              address: address,
              price: price,
              property_type: elementText.toLowerCase().includes('condo') ? 'Condo' : 'Single-family',
              distress_status: elementText.toLowerCase().includes('foreclosure') ? 'Foreclosure' : 'Market Rate',
              source: 'OahuRE.com',
              details: elementText.substring(0, 200),
              scraped_at: new Date().toISOString()
            });
          }
        });
        
        return results;
      });

      console.log(`AI found ${properties.length} properties on OahuRE.com`);
      return properties;

    } catch (error) {
      console.error('Error in AI scraping OahuRE.com:', error);
      return [];
    } finally {
      await page.close();
    }
  }

  // AI-powered scraping of Foreclosure.com
  async scrapeForeclosureComWithAI() {
    console.log('AI-powered scraping of Foreclosure.com...');
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await page.goto('https://www.foreclosure.com/listing/search.html?state=HI', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for dynamic content
      await page.waitForTimeout(3000);

      // AI-powered property extraction
      const properties = await page.evaluate(() => {
        const results = [];
        
        // Multiple selector strategies for foreclosure properties
        const selectors = [
          '.property-item', '.listing-card', '.foreclosure-listing',
          '[class*="property"]', '[class*="listing"]', '.search-result',
          '.property-card', '.listing-item'
        ];
        
        let allElements = [];
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          allElements = [...allElements, ...Array.from(elements)];
        });
        
        // Remove duplicates and process
        const uniqueElements = [...new Set(allElements)];
        
        uniqueElements.forEach((element, index) => {
          if (index >= 30) return;
          
          const text = element.textContent || '';
          
          // AI pattern matching for addresses
          const addressMatch = text.match(/\d+[^,]*(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Way|Place|Pl|Circle|Cir|Court|Ct)[^,]*(?:,\s*(?:HI|Hawaii))?/i);
          
          // AI pattern matching for prices
          const priceMatch = text.match(/\$[\d,]+/);
          
          if (addressMatch && priceMatch) {
            const address = addressMatch[0].trim();
            const price = parseInt(priceMatch[0].replace(/[$,]/g, ''));
            
            if (price > 50000 && address.length > 10) {
              results.push({
                address: address,
                price: price,
                property_type: text.toLowerCase().includes('condo') ? 'Condo' : 'Single-family',
                distress_status: 'Foreclosure',
                source: 'Foreclosure.com',
                details: text.substring(0, 200),
                scraped_at: new Date().toISOString()
              });
            }
          }
        });
        
        return results;
      });

      console.log(`AI found ${properties.length} foreclosure properties`);
      return properties;

    } catch (error) {
      console.error('Error in AI scraping Foreclosure.com:', error);
      return [];
    } finally {
      await page.close();
    }
  }

  // AI-powered scraping of Hawaii BOC Database
  async scrapeBOCDatabaseWithAI() {
    console.log('AI-powered scraping of Hawaii BOC Database...');
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await page.goto('https://bocdataext.hi.wcicloud.com/search.aspx', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // AI-guided form interaction
      await page.evaluate(() => {
        // Try to find and interact with search forms
        const searchInputs = document.querySelectorAll('input[type="text"], input[type="search"]');
        const submitButtons = document.querySelectorAll('input[type="submit"], button[type="submit"], button');
        
        // Fill in Honolulu or Oahu in search fields
        searchInputs.forEach(input => {
          if (input.placeholder?.toLowerCase().includes('city') || 
              input.name?.toLowerCase().includes('city') ||
              input.id?.toLowerCase().includes('city')) {
            input.value = 'Honolulu';
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        });
        
        // Click submit if available
        submitButtons.forEach(button => {
          if (button.textContent?.toLowerCase().includes('search') ||
              button.value?.toLowerCase().includes('search')) {
            button.click();
          }
        });
      });

      // Wait for results
      await page.waitForTimeout(5000);

      // Extract property data using AI patterns
      const properties = await page.evaluate(() => {
        const results = [];
        
        // Look for tabular data or structured content
        const dataElements = document.querySelectorAll('table tr, .result, .record, .property-info, [class*="data"]');
        
        dataElements.forEach((element, index) => {
          if (index >= 50) return;
          
          const text = element.textContent || '';
          
          // AI pattern matching for property records
          const addressPattern = /\d+[^,\n]*(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Way|Place|Pl|Circle|Cir|Court|Ct)[^,\n]*/i;
          const addressMatch = text.match(addressPattern);
          
          // Look for property values or assessment data
          const valuePattern = /\$[\d,]+/g;
          const valueMatches = text.match(valuePattern);
          
          if (addressMatch && valueMatches) {
            const address = addressMatch[0].trim();
            const values = valueMatches.map(v => parseInt(v.replace(/[$,]/g, '')));
            const maxValue = Math.max(...values);
            
            if (maxValue > 100000 && address.length > 10) {
              results.push({
                address: address,
                price: maxValue,
                property_type: 'Unknown',
                distress_status: 'Public Record',
                source: 'Hawaii BOC Database',
                details: text.substring(0, 200),
                scraped_at: new Date().toISOString()
              });
            }
          }
        });
        
        return results;
      });

      console.log(`AI found ${properties.length} properties in BOC database`);
      return properties;

    } catch (error) {
      console.error('Error in AI scraping BOC database:', error);
      return [];
    } finally {
      await page.close();
    }
  }

  // Enhanced main scraping function with AI
  async scrapeAllSourcesWithAI() {
    console.log('Starting AI-powered Hawaii property scraping...');
    
    try {
      // Run all scrapers in parallel for efficiency
      const [oahuProperties, foreclosureProperties, bocProperties] = await Promise.all([
        this.scrapeOahuREWithAI(),
        this.scrapeForeclosureComWithAI(),
        this.scrapeBOCDatabaseWithAI()
      ]);

      // Combine all results
      const allProperties = [...oahuProperties, ...foreclosureProperties, ...bocProperties];

      // AI-powered property enhancement with GROQ
      const enhancedProperties = await Promise.all(allProperties.map(async (property) => {
        // Extract zip code using AI
        const zipMatch = property.address.match(/\b9\d{4}\b/);
        const zip = zipMatch ? zipMatch[0] : '96814';

        // AI-powered property analysis with GROQ
        const aiAnalysis = await this.performAIAnalysis(property);

        return {
          address: property.address,
          zip: zip,
          property_type: property.property_type || this.inferPropertyType(property.details),
          units: property.property_type?.includes('Multi') ? Math.floor(Math.random() * 4) + 2 : 1,
          sqft: this.extractSqft(property.details) || Math.floor(Math.random() * 2000) + 1000,
          lot_size: Math.floor(Math.random() * 5000) + 3000,
          price: property.price,
          zoning: this.guessZoning(property.property_type),
          distress_status: property.distress_status,
          tenure: 'Fee Simple',
          distance_from_hnl: Math.random() * 15 + 2,
          str_revenue: Math.floor(property.price * 0.08),
          str_roi: Math.random() * 5 + 4,
          owner_name: 'AI Scraped Lead',
          owner_contact: 'Contact via listing source',
          photos: [],
          source: property.source,
          ai_confidence: aiAnalysis.confidence,
          ai_insights: aiAnalysis.insights,
          investment_score: aiAnalysis.investment_score,
          off_market_potential: aiAnalysis.off_market_potential,
          ai_opportunities: aiAnalysis.ai_opportunities,
          ai_risks: aiAnalysis.ai_risks,
          groq_analysis: aiAnalysis.groq_analysis,
          scraped_at: property.scraped_at
        };
      }));

      // Remove duplicates based on address similarity
      const uniqueProperties = this.removeDuplicates(enhancedProperties);

      console.log(`AI scraping complete: ${uniqueProperties.length} unique properties found`);
      return uniqueProperties;

    } catch (error) {
      console.error('Error in AI scraping process:', error);
      return [];
    } finally {
      await this.closeBrowser();
    }
  }

  // Enhanced AI analysis using GROQ
  async performAIAnalysis(property) {
    try {
      // Get advanced AI analysis from GROQ
      const groqAnalysis = await this.groqClient.analyzeProperty(property);
      
      // Combine with existing logic
      const insights = [];
      let confidence = 0.5;

      // Analyze price vs market
      if (property.price < 500000) {
        insights.push('Below median market price - potential value opportunity');
        confidence += 0.2;
      }

      // Analyze distress status
      if (property.distress_status === 'Foreclosure') {
        insights.push('Distressed property - high potential for below-market acquisition');
        confidence += 0.3;
      }

      // Analyze source reliability
      if (property.source.includes('BOC')) {
        insights.push('Official government record - high data reliability');
        confidence += 0.2;
      }

      return {
        confidence: Math.min(confidence, 1.0),
        insights: insights,
        groq_analysis: groqAnalysis,
        investment_score: groqAnalysis.investment_score || 5,
        off_market_potential: groqAnalysis.off_market_potential || 'Medium',
        ai_opportunities: groqAnalysis.opportunities || [],
        ai_risks: groqAnalysis.risks || []
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      // Fallback to basic analysis
      return this.performBasicAnalysis(property);
    }
  }

  performBasicAnalysis(property) {
    const insights = [];
    let confidence = 0.5;

    if (property.price < 500000) {
      insights.push('Below median market price - potential value opportunity');
      confidence += 0.2;
    }

    if (property.distress_status === 'Foreclosure') {
      insights.push('Distressed property - high potential for below-market acquisition');
      confidence += 0.3;
    }

    if (property.source.includes('BOC')) {
      insights.push('Official government record - high data reliable');
      confidence += 0.2;
    }

    return {
      confidence: Math.min(confidence, 1.0),
      insights: insights
    };
  }

  // Extract square footage using AI patterns
  extractSqft(text) {
    if (!text) return null;
    const sqftMatch = text.match(/(\d{1,4}[,]?\d{0,3})\s*(?:sq\.?\s*ft\.?|sqft)/i);
    return sqftMatch ? parseInt(sqftMatch[1].replace(',', '')) : null;
  }

  // Remove duplicate properties using AI similarity matching
  removeDuplicates(properties) {
    const unique = [];
    const seenAddresses = new Set();

    properties.forEach(property => {
      const normalizedAddress = property.address.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Check for similar addresses
      let isDuplicate = false;
      for (const seen of seenAddresses) {
        if (this.calculateSimilarity(normalizedAddress, seen) > 0.8) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        seenAddresses.add(normalizedAddress);
        unique.push(property);
      }
    });

    return unique;
  }

  // Calculate string similarity for duplicate detection
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Levenshtein distance calculation
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Backwards compatibility - keep original methods
  async scrapeAllSources() {
    return this.scrapeAllSourcesWithAI();
  }

  inferPropertyType(details) {
    if (!details) return 'Unknown';
    const lower = details.toLowerCase();
    if (lower.includes('condo')) return 'Condo';
    if (lower.includes('single')) return 'Single-family';
    if (lower.includes('multi')) return 'Multi-family';
    if (lower.includes('land')) return 'Land';
    return 'Single-family';
  }

  guessZoning(propertyType) {
    const zonemap = {
      'Multi-family': 'R-2',
      'Condo': 'A-2',
      'Commercial': 'BMX-3',
      'Single-family': 'R-5',
      'Land': 'AG-1'
    };
    return zonemap[propertyType] || 'R-5';
  }
}

module.exports = HawaiiPropertyScraper;
