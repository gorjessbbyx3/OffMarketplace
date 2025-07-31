
-- Add columns for AI Property Valuation Engine
ALTER TABLE properties ADD COLUMN ai_valuation TEXT;
ALTER TABLE properties ADD COLUMN market_value_estimate INTEGER;
ALTER TABLE properties ADD COLUMN equity_capture_percentage REAL;
ALTER TABLE properties ADD COLUMN repair_cost_estimate INTEGER;
ALTER TABLE properties ADD COLUMN valuation_confidence INTEGER;
ALTER TABLE properties ADD COLUMN last_valuated DATETIME;

-- Add columns for Automated Lead Scoring
ALTER TABLE properties ADD COLUMN lead_score INTEGER;
ALTER TABLE properties ADD COLUMN acquisition_probability INTEGER;
ALTER TABLE properties ADD COLUMN urgency_level TEXT;
ALTER TABLE properties ADD COLUMN distress_indicators TEXT;
ALTER TABLE properties ADD COLUMN success_likelihood INTEGER;
ALTER TABLE properties ADD COLUMN scored_at DATETIME;

-- Add columns for Multi-Source Data Fusion
ALTER TABLE properties ADD COLUMN fused_data TEXT;
ALTER TABLE properties ADD COLUMN data_accuracy_score INTEGER;
ALTER TABLE properties ADD COLUMN source_verification TEXT;
ALTER TABLE properties ADD COLUMN ownership_history TEXT;
ALTER TABLE properties ADD COLUMN transaction_history TEXT;
ALTER TABLE properties ADD COLUMN data_last_fused DATETIME;

-- Create lead outcomes tracking table
CREATE TABLE IF NOT EXISTS lead_outcomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER,
  outcome TEXT,
  acquisition_price INTEGER,
  notes TEXT,
  recorded_at DATETIME,
  FOREIGN KEY (property_id) REFERENCES properties (id)
);

-- Create comparative properties table for valuation
CREATE TABLE IF NOT EXISTS comparable_properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_property_id INTEGER,
  comp_address TEXT,
  sale_price INTEGER,
  sale_date DATE,
  days_on_market INTEGER,
  price_per_sqft REAL,
  similarity_score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_property_id) REFERENCES properties (id)
);
