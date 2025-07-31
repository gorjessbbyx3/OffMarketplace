const express = require('express');
const router = express.Router();
const { client } = require('../database/connection');

// Save property as lead
router.post('/', async (req, res) => {
  try {
    const { property_id, lead_source, status, priority, notes } = req.body;
    
    // Get property details
    const propertyResult = await client.execute({
      sql: 'SELECT * FROM properties WHERE id = ?',
      args: [property_id]
    });
    
    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const property = propertyResult.rows[0];
    
    // Insert into leads table
    const result = await client.execute({
      sql: `INSERT INTO leads (
        property_id, address, price, property_type, lead_source, 
        status, priority, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      args: [
        property_id,
        property.address,
        property.price,
        property.property_type,
        lead_source || 'Manual',
        status || 'New',
        priority || 'Medium',
        notes || ''
      ]
    });
    
    res.json({ 
      success: true, 
      lead_id: result.lastInsertRowid,
      message: 'Property saved as lead successfully' 
    });
    
  } catch (error) {
    console.error('Error saving lead:', error);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

// Get all leads
router.get('/', async (req, res) => {
  try {
    const result = await client.execute(`
      SELECT l.*, p.address, p.price, p.owner_name 
      FROM leads l 
      JOIN properties p ON l.property_id = p.id 
      ORDER BY l.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leads',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add new lead
router.post('/', async (req, res) => {
  try {
    const { property_id, tag, notes } = req.body;

    const result = await client.execute({
      sql: 'INSERT INTO leads (property_id, tag, notes) VALUES (?, ?, ?)',
      args: [property_id, tag, notes]
    });

    res.status(201).json({ id: result.lastInsertRowid, message: 'Lead added successfully' });
  } catch (error) {
    console.error('Error adding lead:', error);
    res.status(500).json({ error: 'Failed to add lead' });
  }
});

// Update lead status
router.put('/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;

    await client.execute({
      sql: 'UPDATE leads SET status = ?, notes = ? WHERE id = ?',
      args: [status, notes, req.params.id]
    });

    res.json({ message: 'Lead updated successfully' });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

module.exports = router;