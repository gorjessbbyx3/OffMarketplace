
// Global variables
let currentProperties = [];
let scrapingInProgress = false;

// Scraping functions
async function scrapeHawaiiProperties() {
    const btn = document.getElementById('scrapeBtn');
    const status = document.getElementById('scrapingStatus');
    
    btn.disabled = true;
    btn.innerHTML = '🔄 Scraping...';
    status.innerHTML = 'Starting scraping process...';

    try {
        const response = await fetch('/api/scraper/scrape-hawaii', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        
        if (response.ok) {
            status.innerHTML = `✅ ${result.message}`;
            alert(`Scraping Complete!\n\nTotal Scraped: ${result.total_scraped}\nNew Properties: ${result.new_properties}\nErrors: ${result.errors}`);
            
            // Refresh the property list
            searchProperties();
        } else {
            status.innerHTML = `❌ Error: ${result.error}`;
            alert(`Scraping failed: ${result.error}`);
        }
    } catch (error) {
        console.error('Error during scraping:', error);
        status.innerHTML = `❌ Network error occurred`;
        alert('Network error during scraping. Please try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🌺 Scrape Hawaii Properties';
    }
}

async function getScrapingStats() {
    try {
        const response = await fetch('/api/scraper/stats');
        const stats = await response.json();
        
        if (stats.scraped_sources && stats.scraped_sources.length > 0) {
            let statsText = 'Scraped Property Statistics:\n\n';
            stats.scraped_sources.forEach(source => {
                statsText += `${source.source}:\n`;
                statsText += `  Properties: ${source.count}\n`;
                statsText += `  Avg Price: $${Math.round(source.avg_price).toLocaleString()}\n`;
                statsText += `  Price Range: $${Math.round(source.min_price).toLocaleString()} - $${Math.round(source.max_price).toLocaleString()}\n\n`;
            });
            statsText += `Last Updated: ${new Date(stats.last_updated).toLocaleString()}`;
            alert(statsText);
        } else {
            alert('No scraped properties found. Run the scraper first!');
        }
    } catch (error) {
        console.error('Error getting stats:', error);
        alert('Error loading scraping statistics.');
    }
}

// Load properties on page load
document.addEventListener('DOMContentLoaded', function() {
    searchProperties();
});

// Search properties function
async function searchProperties() {
    const filters = {
        zip: document.getElementById('zipCode').value,
        property_type: document.getElementById('propertyType').value,
        max_price: document.getElementById('maxPrice').value,
        zoning: document.getElementById('zoning').value,
        distress_status: document.getElementById('distressStatus').value,
        source: document.getElementById('sourceFilter').value
    };

    // Remove empty filters
    Object.keys(filters).forEach(key => {
        if (!filters[key]) delete filters[key];
    });

    try {
        const queryParams = new URLSearchParams(filters);
        const response = await fetch(`/api/properties?${queryParams}`);
        const properties = await response.json();
        
        currentProperties = properties;
        displayProperties(properties);
    } catch (error) {
        console.error('Error fetching properties:', error);
        alert('Error loading properties. Please try again.');
    }
}

// Display properties function
function displayProperties(properties) {
    const propertiesList = document.getElementById('propertiesList');
    
    if (properties.length === 0) {
        propertiesList.innerHTML = '<div class="col-12"><p class="text-center">No properties found matching your criteria.</p></div>';
        return;
    }

    propertiesList.innerHTML = properties.map(property => {
        const aiAnalysis = property.ai_analysis ? JSON.parse(property.ai_analysis) : null;
        
        return `
        <div class="col-md-6 col-lg-4">
            <div class="property-card">
                <div class="card-body">
                    <h5 class="card-title">${property.address}</h5>
                    <p class="card-text">
                        <strong>Price:</strong> $${Number(property.price || 0).toLocaleString()}<br>
                        <strong>Type:</strong> ${property.property_type || 'N/A'}<br>
                        <strong>Sqft:</strong> ${property.sqft ? Number(property.sqft).toLocaleString() : 'N/A'}<br>
                        <strong>Zoning:</strong> ${property.zoning || 'N/A'}<br>
                        <strong>Status:</strong> ${property.distress_status || 'N/A'}<br>
                        <strong>Source:</strong> ${property.source || 'N/A'}
                    </p>
                    
                    ${property.str_roi ? `<span class="roi-badge">ROI: ${property.str_roi.toFixed(1)}%</span>` : ''}
                    
                    ${aiAnalysis ? `
                        <div class="ai-analysis mt-2">
                            <span class="badge bg-info">AI Score: ${aiAnalysis.opportunity_score || 'N/A'}/100</span>
                            ${aiAnalysis.estimated_roi ? `<span class="badge bg-success ms-1">Est. ROI: ${aiAnalysis.estimated_roi}%</span>` : ''}
                        </div>
                        <small class="text-muted">${aiAnalysis.ai_insights || ''}</small>
                    ` : ''}
                    
                    <div class="mt-3">
                        <button class="btn btn-sm btn-success" onclick="openROICalculator(${property.id})">Calculate ROI</button>
                        <button class="btn btn-sm btn-primary" onclick="addToLeads(${property.id})">Add to Leads</button>
                        ${aiAnalysis ? `<button class="btn btn-sm btn-info" onclick="generatePropertyReport(${property.id})">📊 AI Report</button>` : ''}
                    </div>
                    
                    ${property.owner_contact ? `<small class="text-muted d-block mt-2">Owner: ${property.owner_name} - ${property.owner_contact}</small>` : ''}
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Open ROI calculator modal
function openROICalculator(propertyId) {
    document.getElementById('modalPropertyId').value = propertyId;
    const modal = new bootstrap.Modal(document.getElementById('roiModal'));
    modal.show();
}

// Calculate ROI
async function calculateROI() {
    const propertyId = document.getElementById('modalPropertyId').value;
    const rentalIncome = document.getElementById('rentalIncome').value;
    const expenses = document.getElementById('expenses').value;

    try {
        const response = await fetch(`/api/properties/${propertyId}/calculate-roi`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                rental_income: parseFloat(rentalIncome),
                expenses: parseFloat(expenses)
            })
        });

        const result = await response.json();
        
        alert(`ROI Calculation Results:
Annual Revenue: $${result.annual_revenue.toLocaleString()}
Net Operating Income: $${result.noi.toLocaleString()}
ROI: ${result.roi.toFixed(2)}%`);

        // Close modal and refresh properties
        bootstrap.Modal.getInstance(document.getElementById('roiModal')).hide();
        searchProperties();
    } catch (error) {
        console.error('Error calculating ROI:', error);
        alert('Error calculating ROI. Please try again.');
    }
}

// Add property to leads
async function addToLeads(propertyId) {
    const tag = prompt('Enter a tag for this lead (e.g., "High Priority", "Follow Up"):');
    if (!tag) return;

    const notes = prompt('Enter any notes for this lead:') || '';

    try {
        const response = await fetch('/api/leads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                property_id: propertyId,
                tag: tag,
                notes: notes
            })
        });

        if (response.ok) {
            alert('Property added to leads successfully!');
        } else {


// Scrape Hawaii properties with AI analysis
async function scrapeHawaiiProperties() {
    if (scrapingInProgress) {
        alert('Scraping already in progress. Please wait...');
        return;
    }
    
    scrapingInProgress = true;
    const scrapeBtn = document.getElementById('scrapeBtn');
    const statusDiv = document.getElementById('scrapingStatus');
    
    scrapeBtn.disabled = true;
    scrapeBtn.innerHTML = '🔄 Scraping...';
    statusDiv.innerHTML = '<div class="text-info">Analyzing Hawaii properties from multiple sources...</div>';
    
    try {
        const response = await fetch('/api/scraper/scrape-hawaii', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusDiv.innerHTML = `<div class="text-success">✅ ${result.message}</div>`;
            // Refresh the properties list
            searchProperties();
        } else {
            statusDiv.innerHTML = `<div class="text-danger">❌ Error: ${result.error}</div>`;
        }
        
    } catch (error) {
        console.error('Scraping error:', error);
        statusDiv.innerHTML = '<div class="text-danger">❌ Failed to scrape properties</div>';
    } finally {
        scrapingInProgress = false;
        scrapeBtn.disabled = false;
        scrapeBtn.innerHTML = '🌺 Scrape Hawaii Properties';
    }
}

// Get scraping statistics
async function getScrapingStats() {
    try {
        const response = await fetch('/api/scraper/stats');
        const stats = await response.json();
        
        let statsHtml = '<strong>Scraping Statistics:</strong><br>';
        if (stats.scraped_sources) {
            stats.scraped_sources.forEach(stat => {
                const analysisRate = stat.avg_lead_score ? (stat.avg_lead_score / 100) : 0;
                statsHtml += `${stat.source}: ${stat.count} properties (${(analysisRate * 100).toFixed(0)}% analyzed)<br>`;
            });
        } else {
            statsHtml += 'No scraping data available<br>';
        }
        
        document.getElementById('scrapingStatus').innerHTML = statsHtml;
    } catch (error) {
        console.error('Error fetching scraping stats:', error);
        document.getElementById('scrapingStatus').innerHTML = 'Error loading scraping statistics';
    }ng stats:', error);
    }
}

// Get AI market analysis
async function getAIMarketAnalysis() {
    try {
        document.getElementById('scrapingStatus').innerHTML = '<div class="text-info">🤖 Generating AI market analysis...</div>';
        
        const response = await fetch('/api/ai/market-analysis', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            const analysisHtml = `
                <div class="alert alert-info">
                    <h6>🤖 AI Market Analysis</h6>
                    <small class="text-muted">Analyzed ${result.properties_analyzed} properties</small>
                    <div class="mt-2" style="white-space: pre-wrap; font-size: 0.9em;">${result.market_insights}</div>
                </div>
            `;
            document.getElementById('scrapingStatus').innerHTML = analysisHtml;
        } else {
            document.getElementById('scrapingStatus').innerHTML = `<div class="text-warning">⚠️ ${result.message}</div>`;
        }
        
    } catch (error) {
        console.error('AI analysis error:', error);
        document.getElementById('scrapingStatus').innerHTML = '<div class="text-danger">❌ Failed to generate AI analysis</div>';
    }
}

// Find off-market opportunities
async function findOffMarketOpportunities() {
    try {
        document.getElementById('propertiesContainer').innerHTML = '<div class="text-center">🔍 Finding off-market opportunities...</div>';
        
        const response = await fetch('/api/ai/off-market-opportunities');
        const result = await response.json();
        
        if (result.success && result.properties.length > 0) {
            displayProperties(result.properties);
            
            // Show AI insights
            document.getElementById('scrapingStatus').innerHTML = `
                <div class="alert alert-success">
                    <h6>🎯 Off-Market Opportunities Found</h6>
                    <div class="mt-2" style="white-space: pre-wrap; font-size: 0.9em;">${result.ai_insights}</div>
                </div>
            `;
        } else {
            document.getElementById('propertiesContainer').innerHTML = '<div class="text-muted">No off-market opportunities found. Try scraping more properties first.</div>';
        }
        
    } catch (error) {
        console.error('Error finding opportunities:', error);
        document.getElementById('propertiesContainer').innerHTML = '<div class="text-danger">Failed to find opportunities</div>';
    }
}

// Generate detailed AI report for a property
async function generatePropertyReport(propertyId) {
    try {
        const response = await fetch(`/api/scraper/generate-report/${propertyId}`, {
            method: 'POST'
        });
        
        const report = await response.json();
        
        // Display report in a modal or new window
        showPropertyReport(report);
        
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate property report');
    }
}

// Display property report
function showPropertyReport(report) {
    const reportContent = `
        <div class="property-report">
            <h3>🏠 Property Investment Report</h3>
            
            <div class="row">
                <div class="col-md-6">
                    <h5>Property Summary</h5>
                    <p><strong>Address:</strong> ${report.property_summary.address}</p>
                    <p><strong>Price:</strong> $${Number(report.property_summary.price || 0).toLocaleString()}</p>
                    <p><strong>Type:</strong> ${report.property_summary.type}</p>
                    <p><strong>Status:</strong> ${report.property_summary.status || 'N/A'}</p>
                </div>
                
                <div class="col-md-6">
                    <h5>AI Investment Analysis</h5>
                    <p><strong>Opportunity Score:</strong> ${report.investment_analysis.opportunity_score}/100</p>
                    <p><strong>Estimated ROI:</strong> ${report.investment_analysis.estimated_roi}%</p>
                    <p><strong>Investment Score:</strong> ${report.investment_analysis.investment_score}/100</p>
                </div>
            </div>
            
            <div class="mt-3">
                <h5>Market Insights</h5>
                <p>${report.market_insights}</p>
                
                <h5>AI Recommendations</h5>
                <p>${report.ai_recommendations}</p>
                
                ${report.risk_assessment.length > 0 ? `
                    <h5>Risk Factors</h5>
                    <ul>
                        ${report.risk_assessment.map(risk => `<li>${risk}</li>`).join('')}
                    </ul>
                ` : ''}
                
                <small class="text-muted">
                    Data Source: ${report.data_sources} | Last Updated: ${new Date(report.last_updated).toLocaleString()}
                </small>
            </div>
        </div>
    `;
    
    // Create and show modal
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">AI Property Analysis Report</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    ${reportContent}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" onclick="window.print()">Print Report</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Remove modal from DOM when closed
    modal.addEventListener('hidden.bs.modal', () => {
        modal.remove();
    });
}

            throw new Error('Failed to add lead');
        }
    } catch (error) {
        console.error('Error adding lead:', error);
        alert('Error adding property to leads. Please try again.');
    }
}
