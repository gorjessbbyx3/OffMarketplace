
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://roomrover-turso-vercel-icfg-ap5eqpbt7utbn3gisakslqcg.aws-us-east-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN
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

module.exports = client;
