
const express = require('express');
const router = express.Router();
const { client } = require('../database/connection');

// Get all properties with filters
router.get('/', async (req, res) => {
  try {
    const { zip, property_type, min_price, max_price, zoning, distress_status, source } = req.query;
    
    let query = 'SELECT * FROM properties WHERE 1=1';
    const params = [];
    
    if (zip) {
      query += ' AND zip = ?';
      params.push(zip);
    }
    
    if (property_type) {
      query += ' AND property_type = ?';
      params.push(property_type);
    }
    
    if (min_price) {
      query += ' AND price >= ?';
      params.push(parseInt(min_price));
    }
    
    if (max_price) {
      query += ' AND price <= ?';
      params.push(parseInt(max_price));
    }
    
    if (zoning) {
      query += ' AND zoning = ?';
      params.push(zoning);
    }
    
    if (distress_status) {
      query += ' AND distress_status = ?';
      params.push(distress_status);
    }
    
    if (source) {
      query += ' AND source = ?';
      params.push(source);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await client.execute({ sql: query, args: params });
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get single property
router.get('/:id', async (req, res) => {
  try {
    const result = await client.execute({
      sql: 'SELECT * FROM properties WHERE id = ?',
      args: [req.params.id]
    });
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Add new property
router.post('/', async (req, res) => {
  try {
    const {
      address, zip, property_type, units, sqft, lot_size, price,
      zoning, distress_status, tenure, distance_from_hnl,
      str_revenue, str_roi, owner_name, owner_contact, photos, source
    } = req.body;
    
    const result = await client.execute({
      sql: `INSERT INTO properties (
        address, zip, property_type, units, sqft, lot_size, price,
        zoning, distress_status, tenure, distance_from_hnl,
        str_revenue, str_roi, owner_name, owner_contact, photos, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        address, zip, property_type, units, sqft, lot_size, price,
        zoning, distress_status, tenure, distance_from_hnl,
        str_revenue, str_roi, owner_name, owner_contact, 
        JSON.stringify(photos), source
      ]
    });
    
    res.status(201).json({ id: result.lastInsertRowid, message: 'Property added successfully' });
  } catch (error) {
    console.error('Error adding property:', error);
    res.status(500).json({ error: 'Failed to add property' });
  }
});

// Calculate ROI for a property
router.post('/:id/calculate-roi', async (req, res) => {
  try {
    const { rental_income, expenses } = req.body;
    const propertyId = req.params.id;
    
    // Get property price
    const propertyResult = await client.execute({
      sql: 'SELECT price FROM properties WHERE id = ?',
      args: [propertyId]
    });
    
    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const price = propertyResult.rows[0].price;
    const noi = (rental_income * 12) - expenses;
    const roi = (noi / price) * 100;
    
    // Update property with calculated ROI
    await client.execute({
      sql: 'UPDATE properties SET str_revenue = ?, str_roi = ? WHERE id = ?',
      args: [rental_income * 12, roi, propertyId]
    });
    
    res.json({ noi, roi, annual_revenue: rental_income * 12 });
  } catch (error) {
    console.error('Error calculating ROI:', error);
    res.status(500).json({ error: 'Failed to calculate ROI' });
  }
});

module.exports = router;
