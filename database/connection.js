const { createClient } = require('@libsql/client');
require('dotenv').config();

let client;

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.warn('Missing required environment variables: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN');
  console.log('Falling back to local SQLite database');
  
  // Create local SQLite client
  client = createClient({
    url: 'file:./dev.db'
  });
} else {
  // Create Turso client
  client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
}

// Initialize database with basic schema
async function initDatabase() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT,
        price REAL,
        property_type TEXT,
        source TEXT,
        source_url TEXT,
        title TEXT,
        description TEXT,
        distress_status TEXT,
        ai_insights TEXT,
        investment_score REAL,
        scraped_at DATETIME,
        data_type TEXT,
        published_date DATETIME,
        rss_category TEXT,
        lead_type TEXT,
        opportunity_type TEXT,
        urgency_level TEXT,
        lead_score INTEGER,
        acquisition_probability REAL,
        distress_indicators TEXT,
        success_likelihood INTEGER,
        scored_at DATETIME,
        details TEXT,
        zip TEXT,
        owner_contact TEXT,
        owner_name TEXT,
        sqft INTEGER,
        lot_size INTEGER,
        urgency TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER,
        tag TEXT,
        notes TEXT,
        status TEXT DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties (id)
      )
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS lead_outcomes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER,
        outcome TEXT,
        acquisition_price REAL,
        notes TEXT,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties (id)
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

module.exports = { client, initDatabase };