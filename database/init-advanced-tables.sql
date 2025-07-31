
-- AI Property Valuation Tables
CREATE TABLE IF NOT EXISTS property_valuations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER,
    estimated_value REAL,
    equity_capture REAL,
    repair_estimate REAL,
    confidence_score INTEGER,
    analysis_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties (id)
);

-- Multi-Source Data Fusion Tables
CREATE TABLE IF NOT EXISTS fused_property_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER,
    fused_data TEXT,
    data_quality_score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties (id)
);

-- Market Analytics Tables
CREATE TABLE IF NOT EXISTS market_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    neighborhood TEXT,
    forecast_data TEXT,
    confidence_score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Document Analysis Tables
CREATE TABLE IF NOT EXISTS document_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_type TEXT,
    extracted_text TEXT,
    analysis_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Environmental Risk Assessment Tables
CREATE TABLE IF NOT EXISTS environmental_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER,
    flood_risk TEXT,
    hurricane_risk TEXT,
    tsunami_risk TEXT,
    sea_level_rise_risk TEXT,
    risk_score INTEGER,
    assessment_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties (id)
);

-- Zoning Analysis Tables
CREATE TABLE IF NOT EXISTS zoning_analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER,
    current_zoning TEXT,
    development_potential TEXT,
    zoning_opportunities TEXT,
    analysis_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties (id)
);

-- Portfolio Performance Tables
CREATE TABLE IF NOT EXISTS portfolio_properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER,
    acquisition_date DATE,
    acquisition_price REAL,
    current_value REAL,
    rental_income REAL,
    expenses REAL,
    roi REAL,
    status TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties (id)
);

-- Lead Scoring with ML Tables
CREATE TABLE IF NOT EXISTS lead_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER,
    ml_score INTEGER,
    success_probability REAL,
    scoring_factors TEXT,
    model_version TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties (id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_valuations_property_id ON property_valuations(property_id);
CREATE INDEX IF NOT EXISTS idx_fused_data_property_id ON fused_property_data(property_id);
CREATE INDEX IF NOT EXISTS idx_market_analytics_neighborhood ON market_analytics(neighborhood);
CREATE INDEX IF NOT EXISTS idx_environmental_property_id ON environmental_assessments(property_id);
CREATE INDEX IF NOT EXISTS idx_zoning_property_id ON zoning_analyses(property_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_property_id ON portfolio_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_property_id ON lead_scores(property_id);
