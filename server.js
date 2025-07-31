const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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

// Routes
app.use('/api/properties', propertyRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/ai', aiAnalysisRoutes);
app.use('/api/ai', aiChatRoutes);
app.use('/api/scraper', require('./routes/image-scraper'));
app.use('/api/test', require('./routes/test-groq'));
app.use('/api/search', webSearchRoutes);

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});