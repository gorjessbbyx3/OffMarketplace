
const express = require('express');
const router = express.Router();
const { client } = require('../database/connection');

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
    res.status(500).json({ error: 'Failed to fetch leads' });
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
