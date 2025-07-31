
const express = require('express');
const router = express.Router();
const { GroqClient } = require('../utils/groqClient');
const { AnthropicClient } = require('../utils/anthropicClient');
const { client } = require('../database/connection');
const multer = require('multer');
const fs = require('fs');

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Document Analysis AI Engine
router.post('/analyze-document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document provided' });
    }

    const documentPath = req.file.path;
    const documentText = await extractTextFromDocument(documentPath);
    
    const groqClient = new GroqClient();
    const anthropicClient = new AnthropicClient();

    // Determine document type
    const documentType = identifyDocumentType(documentText);
    
    let analysis;
    switch (documentType) {
      case 'NOD':
        analysis = await analyzeNOD(documentText, groqClient, anthropicClient);
        break;
      case 'FORECLOSURE_NOTICE':
        analysis = await analyzeForeclosureNotice(documentText, groqClient, anthropicClient);
        break;
      case 'LEGAL_NOTICE':
        analysis = await analyzeLegalNotice(documentText, groqClient, anthropicClient);
        break;
      case 'CONTRACT':
        analysis = await analyzeContract(documentText, groqClient, anthropicClient);
        break;
      default:
        analysis = await analyzeGenericDocument(documentText, groqClient, anthropicClient);
    }

    // Store analysis in database
    await client.execute({
      sql: `INSERT INTO document_analyses 
            (document_type, extracted_text, analysis_data, created_at)
            VALUES (?, ?, ?, ?)`,
      args: [
        documentType,
        documentText.substring(0, 5000), // Store first 5000 chars
        JSON.stringify(analysis),
        new Date().toISOString()
      ]
    });

    // Clean up uploaded file
    fs.unlinkSync(documentPath);

    res.json({
      success: true,
      document_type: documentType,
      analysis: analysis
    });

  } catch (error) {
    console.error('Document analysis error:', error);
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ 
      error: 'Failed to analyze document',
      details: error.message 
    });
  }
});

// NOD Analysis
async function analyzeNOD(documentText, groqClient, anthropicClient) {
  const prompt = `
Analyze this Notice of Default (NOD) document:

DOCUMENT TEXT:
${documentText}

Extract and provide:
1. Property address and TMK
2. Borrower name(s)
3. Lender/Trustee information
4. Default amount owed
5. Default reasons
6. Cure period deadline
7. Foreclosure sale date (if scheduled)
8. Key legal implications
9. Investment opportunity assessment
10. Recommended actions for investor
`;

  const groqAnalysis = await groqClient.analyzeDocument(documentText, prompt);
  const anthropicAnalysis = await anthropicClient.analyzeDocument(documentText, 'NOD');

  return {
    document_type: 'Notice of Default',
    key_data: extractNODData(documentText),
    groq_analysis: groqAnalysis,
    anthropic_analysis: anthropicAnalysis,
    investment_opportunity: assessNODOpportunity(documentText),
    risk_assessment: assessNODRisks(documentText),
    next_steps: generateNODActionPlan(documentText),
    urgency_level: calculateUrgencyLevel(documentText),
    analyzed_at: new Date().toISOString()
  };
}

// Foreclosure Notice Analysis
async function analyzeForeclosureNotice(documentText, groqClient, anthropicClient) {
  const prompt = `
Analyze this Foreclosure Notice:

DOCUMENT TEXT:
${documentText}

Extract and provide:
1. Property details and location
2. Auction date and time
3. Opening bid amount
4. Trustee contact information
5. Viewing/inspection opportunities
6. Title and lien information
7. Investment viability assessment
8. Bidding strategy recommendations
`;

  const groqAnalysis = await groqClient.analyzeDocument(documentText, prompt);
  const anthropicAnalysis = await anthropicClient.analyzeDocument(documentText, 'FORECLOSURE');

  return {
    document_type: 'Foreclosure Notice',
    auction_details: extractAuctionDetails(documentText),
    property_info: extractPropertyInfo(documentText),
    groq_analysis: groqAnalysis,
    anthropic_analysis: anthropicAnalysis,
    bidding_strategy: generateBiddingStrategy(documentText),
    due_diligence_checklist: generateDueDiligenceChecklist(documentText),
    analyzed_at: new Date().toISOString()
  };
}

// Contract Analysis
async function analyzeContract(documentText, groqClient, anthropicClient) {
  const prompt = `
Analyze this real estate contract:

DOCUMENT TEXT:
${documentText}

Extract and analyze:
1. Contract type and parties
2. Property description
3. Purchase price and terms
4. Contingencies and deadlines
5. Risk factors and concerns
6. Key clauses and conditions
7. Recommended modifications
8. Legal compliance issues
`;

  const groqAnalysis = await groqClient.analyzeDocument(documentText, prompt);
  const anthropicAnalysis = await anthropicClient.analyzeDocument(documentText, 'CONTRACT');

  return {
    document_type: 'Real Estate Contract',
    contract_terms: extractContractTerms(documentText),
    risk_analysis: analyzeContractRisks(documentText),
    groq_analysis: groqAnalysis,
    anthropic_analysis: anthropicAnalysis,
    recommendations: generateContractRecommendations(documentText),
    compliance_check: checkContractCompliance(documentText),
    analyzed_at: new Date().toISOString()
  };
}

// Helper functions for document processing
function extractTextFromDocument(filePath) {
  try {
    // Simple text extraction (would use PDF parser in production)
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error('Failed to extract text from document');
  }
}

function identifyDocumentType(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('notice of default') || lowerText.includes('nod')) return 'NOD';
  if (lowerText.includes('foreclosure') && lowerText.includes('auction')) return 'FORECLOSURE_NOTICE';
  if (lowerText.includes('purchase agreement') || lowerText.includes('contract')) return 'CONTRACT';
  if (lowerText.includes('legal notice')) return 'LEGAL_NOTICE';
  
  return 'GENERIC';
}

function extractNODData(text) {
  return {
    property_address: extractWithRegex(text, /property.*?located.*?at\s+(.*?)(?:\n|\.)/i),
    borrower_name: extractWithRegex(text, /borrower.*?:\s+(.*?)(?:\n|,)/i),
    default_amount: extractWithRegex(text, /amount.*?(\$[\d,]+\.?\d*)/i),
    cure_deadline: extractWithRegex(text, /cure.*?period.*?(\d{1,2}\/\d{1,2}\/\d{4})/i),
    trustee: extractWithRegex(text, /trustee.*?:\s+(.*?)(?:\n|,)/i)
  };
}

function extractAuctionDetails(text) {
  return {
    auction_date: extractWithRegex(text, /auction.*?date.*?(\d{1,2}\/\d{1,2}\/\d{4})/i),
    auction_time: extractWithRegex(text, /time.*?(\d{1,2}:\d{2}\s*[ap]m)/i),
    opening_bid: extractWithRegex(text, /opening.*?bid.*?(\$[\d,]+)/i),
    location: extractWithRegex(text, /location.*?:\s+(.*?)(?:\n|\.)/i)
  };
}

function extractWithRegex(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : 'Not found';
}

function assessNODOpportunity(text) {
  const score = 50;
  const factors = [];
  
  if (text.toLowerCase().includes('residential')) {
    factors.push('Residential property - good for investment');
  }
  
  if (text.match(/\$[\d,]+/)) {
    factors.push('Default amount identified');
  }
  
  return {
    opportunity_score: score,
    key_factors: factors,
    recommendation: score > 60 ? 'Pursue' : 'Investigate further'
  };
}

// Text-based document analysis route
router.post('/analyze-text', async (req, res) => {
  try {
    const { document_text, document_type } = req.body;

    if (!document_text) {
      return res.status(400).json({ error: 'No document text provided' });
    }

    const groqClient = new GroqClient();
    const anthropicClient = new AnthropicClient();

    const detectedType = document_type || identifyDocumentType(document_text);
    
    let analysis;
    switch (detectedType) {
      case 'NOD':
        analysis = await analyzeNOD(document_text, groqClient, anthropicClient);
        break;
      case 'FORECLOSURE_NOTICE':
        analysis = await analyzeForeclosureNotice(document_text, groqClient, anthropicClient);
        break;
      default:
        analysis = await analyzeGenericDocument(document_text, groqClient, anthropicClient);
    }

    res.json({
      success: true,
      document_type: detectedType,
      analysis: analysis
    });

  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze document text',
      details: error.message 
    });
  }
});

async function analyzeGenericDocument(documentText, groqClient, anthropicClient) {
  const prompt = `
Analyze this real estate document:

DOCUMENT TEXT:
${documentText}

Provide:
1. Document type classification
2. Key information extracted
3. Real estate investment relevance
4. Important dates and deadlines
5. Action items for investor
`;

  const groqAnalysis = await groqClient.analyzeDocument(documentText, prompt);
  
  return {
    document_type: 'Generic Real Estate Document',
    key_information: extractKeyInformation(documentText),
    groq_analysis: groqAnalysis,
    investment_relevance: assessInvestmentRelevance(documentText),
    analyzed_at: new Date().toISOString()
  };
}

module.exports = router;
