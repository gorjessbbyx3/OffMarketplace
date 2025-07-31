const { createClient } = require('@libsql/client');
require('dotenv').config();

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.warn('Missing required environment variables: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN');
  console.log('Falling back to local SQLite database');
}

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Test connection
client.execute('SELECT 1').catch(err => {
  console.error('Database connection failed:', err.message);
});

// Initialize database tables
async function initDatabase() {
  try {
    console.log('🔧 Initializing database...');

    // Create properties table
    await client.execute({
      sql: `CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT,
        price REAL,
        property_type TEXT,
        details TEXT,
        source TEXT,
        investment_score REAL,
        lead_score REAL,
        distress_status TEXT,
        contact_info TEXT,
        off_market_score INTEGER DEFAULT 0,
        units INTEGER,
        sqft INTEGER,
        analyzed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    });

    // Initialize advanced AI feature tables
    const fs = require('fs');
    const path = require('path');

    try {
      const initScript = fs.readFileSync(path.join(__dirname, 'init-advanced-tables.sql'), 'utf8');
      const statements = initScript.split(';').filter(stmt => stmt.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          await client.execute({ sql: statement });
        }
      }
      console.log('✅ Advanced AI tables initialized');
    } catch (error) {
      console.log('⚠️ Advanced tables init script not found, creating manually...');

      // Create advanced tables manually
      await client.execute({
        sql: `CREATE TABLE IF NOT EXISTS property_valuations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          property_id INTEGER,
          estimated_value REAL,
          equity_capture REAL,
          repair_estimate REAL,
          confidence_score INTEGER,
          analysis_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      });

      await client.execute({
        sql: `CREATE TABLE IF NOT EXISTS market_analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          neighborhood TEXT,
          forecast_data TEXT,
          confidence_score INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      });

      await client.execute({
        sql: `CREATE TABLE IF NOT EXISTS document_analyses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_type TEXT,
          extracted_text TEXT,
          analysis_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      });
    }

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error; // Re-throw to prevent silent failuresr);
  }
}

initDatabase();

module.exports = { client, initDatabase };