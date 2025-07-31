
const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const axios = require('axios');
const client = require('../database/connection');

// Enhance leads with property images
router.post('/enhance-with-images', async (req, res) => {
  try {
    console.log('Starting image enhancement for leads...');

    // Get leads without images
    const result = await client.execute({
      sql: `SELECT * FROM properties 
            WHERE (photos IS NULL OR photos = '[]') 
            AND lead_score >= 60 
            ORDER BY lead_score DESC 
            LIMIT 10`,
      args: []
    });

    const properties = result.rows;
    let enhancedCount = 0;

    for (const property of properties) {
      try {
        const images = await scrapePropertyImages(property.address);
        
        if (images.length > 0) {
          // Update property with images
          await client.execute({
            sql: 'UPDATE properties SET photos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            args: [JSON.stringify(images), property.id]
          });
          
          enhancedCount++;
          console.log(`Enhanced property ${property.id} with ${images.length} images`);
        }
      } catch (error) {
        console.error(`Failed to enhance property ${property.id}:`, error);
      }
    }

    res.json({
      success: true,
      enhanced_count: enhancedCount,
      total_processed: properties.length
    });

  } catch (error) {
    console.error('Image enhancement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enhance leads with images'
    });
  }
});

// Enhance specific lead with images
router.post('/enhance-lead-images/:id', async (req, res) => {
  try {
    const propertyId = req.params.id;

    // Get property details
    const result = await client.execute({
      sql: 'SELECT * FROM properties WHERE id = ?',
      args: [propertyId]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    const property = result.rows[0];
    
    // Scrape images for this property
    const images = await scrapePropertyImages(property.address);
    
    if (images.length > 0) {
      // Update property with new images
      await client.execute({
        sql: 'UPDATE properties SET photos = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [JSON.stringify(images), propertyId]
      });

      res.json({
        success: true,
        images_found: images.length,
        images: images
      });
    } else {
      res.json({
        success: false,
        error: 'No images found for this property'
      });
    }

  } catch (error) {
    console.error('Lead image enhancement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enhance lead with images'
    });
  }
});

// Core image scraping function
async function scrapePropertyImages(address) {
  const images = [];
  
  try {
    // Try multiple image sources
    const imageSources = [
      () => scrapeGoogleStreetView(address),
      () => scrapeZillowImages(address),
      () => scrapeRealtyImages(address),
      () => scrapeGenericPropertyImages(address)
    ];

    for (const scrapeFunction of imageSources) {
      try {
        const sourceImages = await scrapeFunction();
        images.push(...sourceImages);
        
        // Limit to 5 images per property
        if (images.length >= 5) break;
      } catch (error) {
        console.error('Image source failed:', error.message);
      }
    }

  } catch (error) {
    console.error('Property image scraping failed:', error);
  }

  return images.slice(0, 5); // Limit to 5 images
}

// Google Street View image scraping
async function scrapeGoogleStreetView(address) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${encodedAddress}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    // Check if Google Maps API key is available
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      console.log('Google Maps API key not available for Street View');
      return [];
    }

    // Verify the image exists
    const response = await axios.head(streetViewUrl);
    if (response.status === 200) {
      return [{
        url: streetViewUrl,
        type: 'street_view',
        source: 'Google Street View'
      }];
    }

  } catch (error) {
    console.error('Street View scraping failed:', error);
  }
  
  return [];
}

// Zillow image scraping
async function scrapeZillowImages(address) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    const searchUrl = `https://www.zillow.com/homes/${encodeURIComponent(address)}_rb/`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for images to load
    await page.waitForTimeout(3000);

    // Extract property images
    const images = await page.evaluate(() => {
      const imageElements = document.querySelectorAll('img[src*="zillow"], picture img, .media-stream img');
      const images = [];
      
      imageElements.forEach((img, index) => {
        if (index < 3 && img.src && img.src.includes('http')) {
          images.push({
            url: img.src,
            type: 'property_photo',
            source: 'Zillow'
          });
        }
      });
      
      return images;
    });

    await page.close();
    return images;

  } catch (error) {
    console.error('Zillow scraping failed:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// Realty.com image scraping
async function scrapeRealtyImages(address) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    const searchUrl = `https://www.realtor.com/realestateandhomes-search/${encodeURIComponent(address)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForTimeout(3000);

    const images = await page.evaluate(() => {
      const imageElements = document.querySelectorAll('img[data-testid*="photo"], .photo img, .listing-photo img');
      const images = [];
      
      imageElements.forEach((img, index) => {
        if (index < 3 && img.src && img.src.includes('http')) {
          images.push({
            url: img.src,
            type: 'property_photo',
            source: 'Realtor.com'
          });
        }
      });
      
      return images;
    });

    await page.close();
    return images;

  } catch (error) {
    console.error('Realtor.com scraping failed:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// Generic property image scraping from web search
async function scrapeGenericPropertyImages(address) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Search for property images using Google Images
    const searchQuery = `"${address}" property house home Hawaii`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch`;
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(2000);

    const images = await page.evaluate(() => {
      const imageElements = document.querySelectorAll('img[data-src], img[src]');
      const images = [];
      
      imageElements.forEach((img, index) => {
        if (index < 2) {
          const src = img.getAttribute('data-src') || img.src;
          if (src && src.includes('http') && !src.includes('logo') && !src.includes('icon')) {
            images.push({
              url: src,
              type: 'web_search',
              source: 'Google Images'
            });
          }
        }
      });
      
      return images;
    });

    await page.close();
    return images;

  } catch (error) {
    console.error('Generic image scraping failed:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// Generate placeholder property image
function generatePlaceholderImage(address) {
  const encodedAddress = encodeURIComponent(address.substring(0, 30));
  return [{
    url: `https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=${encodedAddress}`,
    type: 'placeholder',
    source: 'Generated'
  }];
}

// Get property images endpoint
router.get('/property-images/:id', async (req, res) => {
  try {
    const propertyId = req.params.id;

    const result = await client.execute({
      sql: 'SELECT address, photos FROM properties WHERE id = ?',
      args: [propertyId]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = result.rows[0];
    let images = [];

    try {
      images = JSON.parse(property.photos || '[]');
    } catch (error) {
      images = [];
    }

    // If no images, generate placeholder
    if (images.length === 0) {
      images = generatePlaceholderImage(property.address);
    }

    res.json({
      property_id: propertyId,
      address: property.address,
      images: images
    });

  } catch (error) {
    console.error('Get property images error:', error);
    res.status(500).json({ error: 'Failed to get property images' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();

// Image scraping placeholder
router.post('/images', async (req, res) => {
  try {
    // Placeholder for image scraping functionality
    res.json({
      success: true,
      message: 'Image scraping functionality to be implemented',
      images: []
    });
  } catch (error) {
    console.error('Image scraper error:', error);
    res.status(500).json({ error: 'Image scraping failed' });
  }
});

module.exports = router;
