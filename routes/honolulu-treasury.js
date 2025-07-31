
const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const GroqClient = require('../utils/groqClient');
const { client } = require('../database/connection');

// Download and analyze Honolulu treasury data
router.post('/download-tax-data', async (req, res) => {
  try {
    console.log('🏛️ Starting Honolulu Treasury data download...');
    
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://www.honolulu.gov/bfs/treasury-division', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // AI-powered ZIP file detection
    const zipFiles = await page.evaluate(() => {
      const results = [];
      
      // Look for ZIP file links with various patterns
      const linkSelectors = [
        'a[href$=".zip"]',
        'a[href*="download"]',
        'a[href*="data"]',
        'a[href*="tax"]',
        'a[href*="delinquent"]',
        'a[href*="property"]'
      ];
      
      linkSelectors.forEach(selector => {
        const links = document.querySelectorAll(selector);
        links.forEach(link => {
          const href = link.href;
          const text = link.textContent.trim();
          
          if (href && (href.includes('.zip') || 
                      text.toLowerCase().includes('download') ||
                      text.toLowerCase().includes('tax data') ||
                      text.toLowerCase().includes('delinquent'))) {
            results.push({
              url: href,
              text: text,
              type: 'zip_file'
            });
          }
        });
      });
      
      return results;
    });

    console.log(`Found ${zipFiles.length} potential data files`);

    const downloadResults = [];

    // Download each ZIP file found
    for (const zipFile of zipFiles.slice(0, 3)) { // Limit to 3 files
      try {
        console.log(`Downloading: ${zipFile.text} from ${zipFile.url}`);
        
        const response = await axios({
          method: 'GET',
          url: zipFile.url,
          responseType: 'stream',
          timeout: 120000
        });

        const fileName = `honolulu_tax_data_${Date.now()}.zip`;
        const filePath = path.join(__dirname, '..', 'downloads', fileName);
        
        // Create downloads directory if it doesn't exist
        const downloadDir = path.dirname(filePath);
        if (!fs.existsSync(downloadDir)) {
          fs.mkdirSync(downloadDir, { recursive: true });
        }

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        // Analyze the downloaded file with AI
        const fileStats = fs.statSync(filePath);
        const groqClient = new GroqClient();
        
        const analysis = await groqClient.analyzeDataFile({
          fileName: fileName,
          fileSize: fileStats.size,
          url: zipFile.url,
          description: zipFile.text,
          downloadDate: new Date().toISOString()
        });

        downloadResults.push({
          fileName: fileName,
          filePath: filePath,
          fileSize: fileStats.size,
          url: zipFile.url,
          description: zipFile.text,
          ai_analysis: analysis,
          downloaded_at: new Date().toISOString()
        });

        // Store download record in database
        await client.execute({
          sql: `INSERT INTO data_downloads (
            file_name, file_path, file_size, source_url, description,
            ai_analysis, downloaded_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          args: [
            fileName,
            filePath,
            fileStats.size,
            zipFile.url,
            zipFile.text,
            JSON.stringify(analysis)
          ]
        });

      } catch (downloadError) {
        console.error(`Error downloading ${zipFile.url}:`, downloadError);
        downloadResults.push({
          url: zipFile.url,
          error: downloadError.message,
          status: 'failed'
        });
      }
    }

    await browser.close();

    res.json({
      success: true,
      message: `Downloaded ${downloadResults.filter(r => !r.error).length} files from Honolulu Treasury`,
      downloads: downloadResults,
      next_steps: [
        'Extract ZIP files to analyze property tax data',
        'Cross-reference with existing property database',
        'Identify delinquent tax properties for off-market leads'
      ]
    });

  } catch (error) {
    console.error('Treasury download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download treasury data',
      details: error.message
    });
  }
});

// Check for updates to treasury data
router.post('/check-updates', async (req, res) => {
  try {
    console.log('🔄 Checking for treasury data updates...');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://www.honolulu.gov/bfs/treasury-division', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Get current page information
    const currentData = await page.evaluate(() => {
      const results = {
        lastUpdated: null,
        dataFiles: [],
        pageHash: null
      };

      // Look for last updated dates
      const datePatterns = [
        /updated?:?\s*(\w+\s+\d{1,2},?\s+\d{4})/gi,
        /last\s+modified:?\s*(\w+\s+\d{1,2},?\s+\d{4})/gi,
        /(\w+\s+\d{1,2},?\s+\d{4})/g
      ];

      const pageText = document.body.textContent;
      
      for (const pattern of datePatterns) {
        const matches = pageText.match(pattern);
        if (matches && matches.length > 0) {
          results.lastUpdated = matches[0];
          break;
        }
      }

      // Get all data file links
      const links = document.querySelectorAll('a[href*=".zip"], a[href*="download"], a[href*="data"]');
      links.forEach(link => {
        results.dataFiles.push({
          url: link.href,
          text: link.textContent.trim(),
          href: link.getAttribute('href')
        });
      });

      // Create a simple hash of the page content for change detection
      results.pageHash = btoa(pageText.substring(0, 1000)).substring(0, 50);

      return results;
    });

    await browser.close();

    // Check against previous downloads
    const lastDownload = await client.execute({
      sql: `SELECT * FROM data_downloads 
            WHERE source_url LIKE '%honolulu.gov%' 
            ORDER BY downloaded_at DESC LIMIT 1`,
      args: []
    });

    let hasUpdates = true;
    let updateDetails = 'First time checking - no previous data';

    if (lastDownload.rows.length > 0) {
      const lastCheck = lastDownload.rows[0];
      const lastAnalysis = JSON.parse(lastCheck.ai_analysis || '{}');
      
      // Compare with previous check
      if (lastAnalysis.pageHash === currentData.pageHash) {
        hasUpdates = false;
        updateDetails = 'No changes detected since last check';
      } else {
        updateDetails = 'Page content has changed - new data may be available';
      }
    }

    // Use AI to analyze the update status
    const groqClient = new GroqClient();
    const updateAnalysis = await groqClient.analyzeDataUpdates({
      currentData,
      hasUpdates,
      lastCheck: lastDownload.rows[0] || null
    });

    res.json({
      success: true,
      has_updates: hasUpdates,
      update_details: updateDetails,
      current_data: currentData,
      ai_analysis: updateAnalysis,
      recommendation: hasUpdates ? 'Download new data' : 'No action needed',
      checked_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check for updates',
      details: error.message
    });
  }
});

// Analyze downloaded tax data for delinquent properties
router.post('/analyze-tax-data', async (req, res) => {
  try {
    console.log('📊 Analyzing downloaded tax data...');

    // Get recent downloads
    const downloads = await client.execute({
      sql: `SELECT * FROM data_downloads 
            WHERE source_url LIKE '%honolulu.gov%' 
            ORDER BY downloaded_at DESC LIMIT 5`,
      args: []
    });

    if (downloads.rows.length === 0) {
      return res.json({
        message: 'No treasury data found. Download tax data first.',
        action: 'Use /download-tax-data endpoint first'
      });
    }

    const groqClient = new GroqClient();
    const analysisResults = [];

    for (const download of downloads.rows) {
      try {
        // Analyze each downloaded file
        const analysis = await groqClient.analyzeTaxData({
          fileName: download.file_name,
          fileSize: download.file_size,
          downloadDate: download.downloaded_at,
          sourceUrl: download.source_url
        });

        analysisResults.push({
          file: download.file_name,
          analysis: analysis,
          potential_leads: analysis.estimated_delinquent_properties || 0
        });

      } catch (analysisError) {
        console.error(`Error analyzing ${download.file_name}:`, analysisError);
      }
    }

    // Generate summary insights
    const totalPotentialLeads = analysisResults.reduce((sum, result) => 
      sum + (result.potential_leads || 0), 0);

    res.json({
      success: true,
      files_analyzed: analysisResults.length,
      total_potential_leads: totalPotentialLeads,
      analysis_results: analysisResults,
      insights: {
        data_quality: 'High - Official government records',
        lead_quality: 'Excellent - Tax delinquent properties indicate financial distress',
        next_actions: [
          'Extract property addresses from tax data',
          'Cross-reference with existing property database',
          'Prioritize by amount owed and delinquency period',
          'Research ownership and contact information'
        ]
      },
      analyzed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Tax data analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze tax data',
      details: error.message
    });
  }
});

module.exports = router;
