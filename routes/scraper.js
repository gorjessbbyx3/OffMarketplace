
const express = require('express');
const router = express.Router();
const client = require('../database/connection');
const HawaiiPropertyScraper = require('../scrapers/hawaiiPropertyScraper');

// Trigger scraping of Hawaii properties
router.post('/scrape-hawaii', async (req, res) => {
  try {
    console.log('Starting Hawaii property scraping...');
    const scraper = new HawaiiPropertyScraper();
    const properties = await scraper.scrapeAllSources();

    if (properties.length === 0) {
      return res.json({ 
        message: 'No properties found during scraping',
        count: 0 
      });
    }

    // Insert scraped properties into database
    let insertCount = 0;
    const errors = [];

    for (const property of properties) {
      try {
        // Check if property already exists
        const existingResult = await client.execute({
          sql: 'SELECT id FROM properties WHERE address = ? AND source = ?',
          args: [property.address, property.source]
        });

        if (existingResult.rows.length === 0) {
          await client.execute({
            sql: `INSERT INTO properties (
              address, zip, property_type, units, sqft, lot_size, price,
              zoning, distress_status, tenure, distance_from_hnl,
              str_revenue, str_roi, owner_name, owner_contact, photos, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              property.address, property.zip, property.property_type,
              property.units, property.sqft, property.lot_size, property.price,
              property.zoning, property.distress_status, property.tenure,
              property.distance_from_hnl, property.str_revenue, property.str_roi,
              property.owner_name, property.owner_contact,
              JSON.stringify(property.photos), property.source
            ]
          });
          insertCount++;
        }
      } catch (error) {
        console.error(`Error inserting property ${property.address}:`, error);
        errors.push({ address: property.address, error: error.message });
      }
    }

    res.json({
      message: `Successfully scraped and saved ${insertCount} new properties`,
      total_scraped: properties.length,
      new_properties: insertCount,
      errors: errors.length,
      error_details: errors
    });

  } catch (error) {
    console.error('Error in scraping route:', error);
    res.status(500).json({ 
      error: 'Failed to scrape properties',
      details: error.message 
    });
  }
});

// Get scraping status and stats
router.get('/stats', async (req, res) => {
  try {
    const result = await client.execute({
      sql: `SELECT 
        source,
        COUNT(*) as count,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM properties 
      WHERE source IN ('Foreclosure.com', 'OahuRE.com')
      GROUP BY source`,
      args: []
    });

    res.json({
      scraped_sources: result.rows,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting scraper stats:', error);
    res.status(500).json({ error: 'Failed to get scraper stats' });
  }
});

module.exports = router;
