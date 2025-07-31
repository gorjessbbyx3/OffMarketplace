const { createClient } = require('@libsql/client');
require('dotenv').config();

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.warn('Missing required environment variables: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN');
  console.log('Falling back to local SQLite database');
}

// Create client with fallback to local database
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// Initialize database function
async function initDatabase() {
  try {
    // Create properties table if it doesn't exist
    await client.execute(`
      CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address TEXT,
        zip TEXT,
        property_type TEXT,
        units INTEGER,
        sqft INTEGER,
        price REAL,
        zoning TEXT,
        distress_status TEXT,
        str_revenue REAL,
        str_roi REAL,
        owner_name TEXT,
        owner_contact TEXT,
        photos TEXT,
        source TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create leads table if it doesn't exist
    await client.execute(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER,
        tag TEXT,
        notes TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties (id)
      )
    `);

    console.log('✅ Database tables initialized');
    return true;
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return false;
  }
}

module.exports = { client, initDatabase };

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
    // Create properties table
    await client.execute(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL,
      zip TEXT NOT NULL,
      property_type TEXT NOT NULL,
      units INTEGER,
      sqft INTEGER,
      lot_size INTEGER,
      price INTEGER,
      zoning TEXT,
      distress_status TEXT,
      tenure TEXT,
      distance_from_hnl REAL,
      str_revenue INTEGER,
      str_roi REAL,
      owner_name TEXT,
      owner_contact TEXT,
      photos TEXT,
      source TEXT,
      ai_analysis TEXT,
      raw_data TEXT,
      analyzed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Create leads table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER,
        tag TEXT,
        notes TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties (id)
      )
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initDatabase();

module.exports = { client, initDatabase };