const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Initialize database
const { initDatabase } = require('./database/connection');
initDatabase().then(() => {
  console.log('✅ Database initialized successfully');
}).catch(err => {
  console.error('❌ Database initialization failed:', err);
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const propertyRoutes = require('./routes/properties');
const leadRoutes = require('./routes/leads');
const scraperRoutes = require('./routes/scraper');
const aiAnalysisRoutes = require('./routes/ai-analysis');
const imageScraper = require('./routes/image-scraper');
const aiChatRoutes = require('./routes/ai-chat');
const webSearchRoutes = require('./routes/web-search');
const offMarketLeadsRoutes = require('./routes/off-market-leads');

// Routes
app.use('/api/properties', propertyRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/ai', aiAnalysisRoutes);
app.use('/api/ai', aiChatRoutes);
app.use('/api/scraper', require('./routes/image-scraper'));
app.use('/api/test', require('./routes/test-groq'));
app.use('/api/search', webSearchRoutes);
app.use('/api/off-market', offMarketLeadsRoutes);

// Serve dashboard as default landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Serve other static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server successfully running on http://0.0.0.0:${PORT}`);
  console.log('🏠 Dashboard available at: /dashboard.html');
  console.log('📊 API endpoints ready');
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Cleaning up and retrying...`);
    process.exit(1);
  } else {
    console.error('Full error details:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});