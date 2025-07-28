
# Honolulu Off-Market Property Finder

A web application for finding and analyzing off-market properties in Honolulu, Hawaii. Built with Node.js, Express, and Turso database.

## Features

- **Property Search & Filtering**: Search properties by zip code, type, price range, zoning, and distress status
- **ROI Calculator**: Calculate return on investment for rental properties
- **Lead Management**: Save interesting properties as leads with tags and notes
- **Real Estate Investment Focus**: Specifically designed for Honolulu market analysis

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: Turso (SQLite-compatible)
- **Frontend**: Vanilla JavaScript with Bootstrap
- **Additional**: PDF generation, email notifications

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   - Copy `.env.example` to `.env`
   - Add your Turso database credentials

3. **Initialize Sample Data**:
   ```bash
   node utils/sampleData.js
   ```

4. **Start the Server**:
   ```bash
   npm start
   ```

5. **Access the App**:
   Open your browser to the provided URL

## API Endpoints

### Properties
- `GET /api/properties` - Get all properties with optional filters
- `GET /api/properties/:id` - Get single property
- `POST /api/properties` - Add new property
- `POST /api/properties/:id/calculate-roi` - Calculate ROI

### Leads
- `GET /api/leads` - Get all leads
- `POST /api/leads` - Add property to leads
- `PUT /api/leads/:id` - Update lead status

## Database Schema

### Properties Table
- Basic info: address, zip, property_type, units, sqft, price
- Investment data: zoning, distress_status, str_revenue, str_roi
- Owner info: owner_name, owner_contact
- Metadata: photos, source, created_at

### Leads Table
- Lead management: property_id, tag, notes, status
- Tracking: created_at

## Deployment

This app is configured for Replit deployment with automatic HTTPS and custom domains available.
