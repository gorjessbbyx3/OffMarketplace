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

// Routes
app.use('/api/properties', require('./routes/properties'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/ai', require('./routes/ai-analysis'));
app.use('/api/ai', require('./routes/ai-chat'));
app.use('/api/scraper', require('./routes/scraper'));
app.use('/api/scraper', require('./routes/image-scraper'));
app.use('/api/test', require('./routes/test-groq'));

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```The code adds new routes for AI chat and image scraping to the existing Express app.