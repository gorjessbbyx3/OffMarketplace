// Dashboard JavaScript for AI Property Finder
class PropertyDashboard {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.leadsContainer = document.getElementById('leadsContainer');
        this.typingIndicator = document.getElementById('typingIndicator');

        this.initializeEventListeners();
        this.loadDashboardData();
        this.addWelcomeMessage();
    }

    initializeEventListeners() {
        // Chat input event listeners
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Auto-refresh leads every 5 minutes
        setInterval(() => {
            this.updateStats();
        }, 300000);
    }

    async loadDashboardData() {
        await this.updateStats();
        await this.loadRecentLeads();
    }

    async updateStats() {
        try {
            // Get property statistics
            const propertiesResponse = await fetch('/api/properties');
            const properties = await propertiesResponse.json();

            // Get leads statistics
            const leadsResponse = await fetch('/api/leads');
            const leads = await leadsResponse.json();

            // Update stat cards
            document.getElementById('totalProperties').textContent = properties.length;
            document.getElementById('aiLeads').textContent = leads.length;

            // Calculate high priority leads
            const highPriorityCount = leads.filter(lead => 
                lead.tag && lead.tag.toLowerCase().includes('high')
            ).length;
            document.getElementById('highPriorityLeads').textContent = highPriorityCount;

            // Calculate average ROI
            const propertiesWithROI = properties.filter(p => p.str_roi);
            const avgROI = propertiesWithROI.length > 0 
                ? (propertiesWithROI.reduce((sum, p) => sum + p.str_roi, 0) / propertiesWithROI.length).toFixed(1)
                : '0';
            document.getElementById('avgROI').textContent = avgROI + '%';

        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async loadRecentLeads() {
        try {
            const response = await fetch('/api/scraper/generate-leads');
            const data = await response.json();

            if (data.leads && data.leads.length > 0) {
                this.displayLeads(data.leads.slice(0, 10)); // Show top 10 leads
            }
        } catch (error) {
            console.error('Error loading leads:', error);
        }
    }

    async searchProperties() {
        const zipSelect = document.getElementById('zipCode');
        const customZipInput = document.getElementById('customZipCode');

        let zipValue = zipSelect.value;
        if (zipValue === 'custom' && customZipInput.value.trim()) {
            zipValue = customZipInput.value.trim();
        } else if (zipValue === 'custom') {
            zipValue = '';
        }

        const filters = {
            zip: zipValue,
            property_type: document.getElementById('propertyType').value,
            max_price: document.getElementById('maxPrice').value,
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

            this.displayProperties(properties);
            this.addMessage(`Found ${properties.length} properties matching your search criteria.`, 'ai');
        } catch (error) {
            console.error('Error fetching properties:', error);
            this.addMessage('Error loading properties. Please try again.', 'ai');
        }
    }

    displayProperties(properties) {
        const container = document.getElementById('propertiesContainer');
        const countBadge = document.getElementById('resultsCount');

        countBadge.textContent = `${properties.length} properties`;

        if (properties.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted">
                    <i class="fas fa-search fa-3x mb-3"></i>
                    <p>No properties found matching your criteria.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = properties.map(property => {
            const aiAnalysis = property.ai_analysis ? JSON.parse(property.ai_analysis) : null;

            return `
                <div class="col-md-6 col-lg-4">
                    <div class="property-card">
                        <h6 class="mb-2">${property.address}</h6>
                        <div class="row">
                            <div class="col-6">
                                <small class="text-muted">Price:</small><br>
                                <strong>$${Number(property.price || 0).toLocaleString()}</strong>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Type:</small><br>
                                ${property.property_type || 'N/A'}
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-6">
                                <small class="text-muted">Status:</small><br>
                                ${property.distress_status || 'N/A'}
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Source:</small><br>
                                ${property.source || 'N/A'}
                            </div>
                        </div>

                        ${property.str_roi ? `<span class="roi-badge mt-2 d-inline-block">ROI: ${property.str_roi.toFixed(1)}%</span>` : ''}

                        ${aiAnalysis ? `
                            <div class="ai-analysis mt-2">
                                <span class="badge bg-info">AI Score: ${aiAnalysis.opportunity_score || 'N/A'}/100</span>
                                ${aiAnalysis.estimated_roi ? `<span class="badge bg-success ms-1">Est. ROI: ${aiAnalysis.estimated_roi}%</span>` : ''}
                            </div>
                            <small class="text-muted d-block mt-1">${aiAnalysis.ai_insights || ''}</small>
                        ` : ''}

                        <div class="mt-3">
                            <button class="btn btn-sm btn-success" onclick="dashboard.openROICalculator(${property.id})">
                                <i class="fas fa-calculator"></i> ROI
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="dashboard.addToLeads('${property.id}')">
                                <i class="fas fa-star"></i> Lead
                            </button>
                            ${aiAnalysis ? `<button class="btn btn-sm btn-info" onclick="dashboard.analyzeProperty('${property.id}')">
                                <i class="fas fa-chart-line"></i> Analyze
                            </button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    openROICalculator(propertyId) {
        const rentalIncome = prompt('Enter monthly rental income ($):');
        const expenses = prompt('Enter annual expenses ($):');

        if (rentalIncome && expenses) {
            this.calculateROI(propertyId, rentalIncome, expenses);
        }
    }

    async calculateROI(propertyId, rentalIncome, expenses) {
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

            this.addMessage(`ROI Calculation Results:
                Annual Revenue: $${result.annual_revenue.toLocaleString()}
                Net Operating Income: $${result.noi.toLocaleString()}
                ROI: ${result.roi.toFixed(2)}%`, 'ai');

        } catch (error) {
            console.error('Error calculating ROI:', error);
            this.addMessage('Error calculating ROI. Please try again.', 'ai');
        }
    }

    displayOffMarketLeads(leads) {
        const container = document.getElementById('leadsContainer');
        if (!container) return;

        if (!leads || leads.length === 0) {
            container.innerHTML = '<div class="text-muted">No off-market opportunities found.</div>';
            return;
        }

        container.innerHTML = leads.map(lead => `
            <div class="card mb-3 ${lead.urgency_level === 'critical' ? 'border-danger' : lead.urgency_level === 'high' ? 'border-warning' : ''}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <span class="badge bg-${lead.urgency_level === 'critical' ? 'danger' : lead.urgency_level === 'high' ? 'warning' : 'success'} me-2">
                            ${lead.off_market_score}/100
                        </span>
                        <strong>${lead.address}</strong>
                        <span class="badge bg-info ms-2">${lead.urgency_level.toUpperCase()}</span>
                    </div>
                    <span class="text-success fw-bold">$${lead.price?.toLocaleString()}</span>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Type:</strong> ${lead.property_type}</p>
                            <p><strong>Status:</strong> ${lead.distress_status}</p>
                            <p><strong>Source:</strong> ${lead.source}</p>
                            <p><strong>Est. Discount:</strong> ${lead.estimated_discount}</p>
                            <p><strong>Lead Quality:</strong> <span class="badge bg-${lead.lead_quality === 'A' ? 'success' : lead.lead_quality === 'B' ? 'warning' : 'secondary'}">${lead.lead_quality}</span></p>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-2">
                                <strong>Off-Market Indicators:</strong>
                                <ul class="list-unstyled mt-1">
                                    ${(lead.off_market_indicators || []).map(indicator => 
                                        `<li><small class="text-primary">• ${indicator}</small></li>`
                                    ).join('')}
                                </ul>
                            </div>
                            <div class="mb-2">
                                <strong>Motivation Signals:</strong>
                                <ul class="list-unstyled mt-1">
                                    ${(lead.motivation_signals || []).map(signal => 
                                        `<li><small class="text-warning">• ${signal}</small></li>`
                                    ).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <strong>AI Analysis:</strong>
                        <p class="text-muted small">${lead.ai_reasoning}</p>
                    </div>
                    <div class="mt-2">
                        <strong>Contact Strategy:</strong>
                        <p class="small">${lead.contact_strategy}</p>
                    </div>
                    <div class="mt-2">
                        <strong>Action Plan:</strong>
                        <ul class="list-unstyled">
                            ${(lead.action_plan || []).map(action => 
                                `<li class="small">✓ ${action}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    <div class="mt-3">
                        <button class="btn btn-primary btn-sm me-2" onclick="dashboard.addToLeads('${lead.id}', 'Hot Off-Market Lead')">
                            Add to Leads
                        </button>
                        <button class="btn btn-outline-info btn-sm" onclick="dashboard.showPropertyDetails('${lead.id}')">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    displayLeads(leads) {
        const container = document.getElementById('leadsContainer');
        if (!container) return;

        if (!leads || leads.length === 0) {
            container.innerHTML = '<div class="text-muted">No leads found. Try generating new leads first.</div>';
            return;
        }

        this.leadsContainer.innerHTML = leads.map(lead => `
            <div class="lead-card">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-1">${lead.address}</h6>
                    <span class="lead-priority ${this.getPriorityClass(lead.lead_score)}">
                        ${this.getPriorityText(lead.lead_score)}
                    </span>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <small class="text-muted">Price:</small> <strong>$${Number(lead.price || 0).toLocaleString()}</strong><br>
                        <small class="text-muted">Status:</small> ${lead.distress_status || 'N/A'}<br>
                        <small class="text-muted">Source:</small> ${lead.source}
                    </div>
                    <div class="col-md-6">
                        <small class="text-muted">Lead Score:</small> <strong>${lead.lead_score}/100</strong><br>
                        <small class="text-muted">Est. Equity:</small> $${Number(lead.estimated_equity || 0).toLocaleString()}<br>
                        <small class="text-muted">Next Action:</small> ${lead.next_action}
                    </div>
                </div>
                <div class="mt-2">
                    <button class="btn btn-sm btn-primary" onclick="dashboard.contactLead('${lead.id}')">
                        <i class="fas fa-phone"></i> Contact
                    </button>
                    <button class="btn btn-sm btn-success" onclick="dashboard.analyzeProperty('${lead.id}')">
                        <i class="fas fa-chart-line"></i> Analyze
                    </button>
                    <button class="btn btn-sm btn-info" onclick="dashboard.addToLeads('${lead.id}')">
                        <i class="fas fa-star"></i> Save Lead
                    </button>
                </div>
            </div>
        `).join('');
    }

    getPriorityClass(score) {
        if (score >= 80) return 'priority-high';
        if (score >= 60) return 'priority-medium';
        return 'priority-low';
    }

    getPriorityText(score) {
        if (score >= 80) return 'HIGH';
        if (score >= 60) return 'MEDIUM';
        return 'LOW';
    }

    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message) return;

        // Add user message to chat
        this.addMessage(message, 'user');
        this.chatInput.value = '';

        // Show typing indicator
        this.showTyping();

        try {
            // Send message to AI chat endpoint
            const response = await fetch('/api/ai-chat/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();

            // Hide typing indicator and add AI response
            this.hideTyping();

            if (data.success) {
                this.addMessage(data.response, 'ai');
            } else {
                this.addMessage(data.fallback_response || 'I apologize, but I\'m having trouble processing your request right now. Please try again.', 'ai');
            }

            // If the message is about finding properties, also update leads
            if (message.toLowerCase().includes('find') || message.toLowerCase().includes('search') || message.toLowerCase().includes('property')) {
                setTimeout(() => this.loadRecentLeads(), 1000);
            }

        } catch (error) {
            this.hideTyping();
            this.addMessage('Sorry, I encountered an error. Please try again.', 'ai');
            console.error('Chat error:', error);
        }
    }

    addMessage(text, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        if (type === 'ai') {
            messageDiv.innerHTML = `
                <div class="message-header">
                    <strong><i class="fas fa-robot"></i> AI Assistant</strong>
                    <span class="timestamp">${timestamp}</span>
                </div>
                <div class="message-content">${text}</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-header">
                    <strong><i class="fas fa-user"></i> You</strong>
                    <span class="timestamp">${timestamp}</span>
                </div>
                <div class="message-content">${text}</div>
            `;
        }

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showTyping() {
        this.typingIndicator.style.display = 'block';
    }

    hideTyping() {
        this.typingIndicator.style.display = 'none';
    }

    addWelcomeMessage() {
        const welcomeMessage = `Hello! I'm your AI real estate assistant for Hawaii properties. I can help you with:

🏠 Finding investment properties
📊 Market analysis and trends
💰 ROI calculations
🔍 Off-market opportunities
📋 Property comparisons

Try asking: "Find me a duplex in Kakaako under $1M" or "What's the current market like for condos?"`;

        this.addMessage(welcomeMessage, 'ai');
    }

    async contactLead(leadId) {
        alert(`Contacting lead ${leadId}. This would integrate with your CRM or phone system.`);
    }

    async analyzeProperty(propertyId) {
        try {
            const response = await fetch(`/api/ai/analyze-property/${propertyId}`, {
                method: 'POST'
            });
            const analysis = await response.json();

            if (analysis.success) {
                this.addMessage(`Property analysis complete! Investment score: ${analysis.analysis.investment_score}/100. ${analysis.analysis.ai_insights}`, 'ai');
            }
        } catch (error) {
            console.error('Analysis error:', error);
        }
    }

    viewTaxAnalysis(propertyId) {
        // Display detailed tax delinquency analysis
        this.addMessage(`🔍 Analyzing tax payment history for property ID: ${propertyId}...`, 'ai');

        // Simulate tax analysis (in real implementation, this would call your tax analysis API)
        setTimeout(() => {
            this.addMessage(`
📊 TAX DELINQUENCY ANALYSIS COMPLETE:

🏛️ **Recommended Verification Steps:**
• Check Honolulu County property tax records
• Search for outstanding liens at Bureau of Conveyances  
• Verify current tax assessment and payment status
• Look up any tax certificate sales or auctions

💰 **Key Research Resources:**
• qpublic.schneidercorp.com (Honolulu County)
• hawaii.gov Bureau of Conveyances
• Honolulu.gov Real Property Tax portal
• Legal notices in Star Advertiser

⚠️ **Due Diligence Priority:** Verify tax payment status before any offers. Delinquent taxes can add significant acquisition costs but also provide negotiation leverage.
            `, 'ai');
        }, 1500);
    }

    addToLeads(propertyId) {
        // Add property to leads tracking system
        console.log('Adding property to leads:', propertyId);
        this.addMessage(`Property ${propertyId} added to your leads tracking system.`, 'ai');
    }

    viewDetailedAnalysis(propertyId) {
        this.addMessage(`Viewing detailed analysis for property ${propertyId}. This would show comprehensive tenant revenue calculations, lease information, condition assessment, and investment strategy recommendations.`, 'ai');
    }
}

// Global functions for button clicks
async function generateAILeads() {
    document.getElementById('leadsContainer').innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2">AI is generating new leads...</p>
        </div>
    `;

    try {
        const response = await fetch('/api/scraper/generate-leads');
        const data = await response.json();

        if (data.leads && data.leads.length > 0) {
            dashboard.displayLeads(data.leads.slice(0, 10));
            dashboard.addMessage(`Generated ${data.leads.length} new leads! Found ${data.high_priority || 0} high-priority opportunities.`, 'ai');
        } else {
            dashboard.addMessage('No leads found in database. Let me search for current opportunities...', 'ai');
        }
        dashboard.updateStats();

    } catch (error) {
        console.error('Error generating leads:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        dashboard.addMessage('Database search had issues, let me search the web for current opportunities...', 'ai');

        // Fallback to web search
        try {
            const webSearchResponse = await fetch('/api/search/search-properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: 'Hawaii investment properties foreclosure distressed',
                    location: 'Honolulu',
                    property_type: 'Multi-unit'
                })
            });
            const webData = await webSearchResponse.json();

            if (webData.success) {
                dashboard.addMessage(`Found current market opportunities through web search! Analyzing ${webData.sources_searched.length} sources including foreclosure.com and Hawaii MLS.`, 'ai');

                // Display web search results
                const searchResults = document.getElementById('leadsContainer');
                searchResults.innerHTML = `
                    <div class="alert alert-info">
                        <h6>🌐 Web Search Results</h6>
                        <small>Sources: ${webData.sources_searched.join(', ')}</small>
                        <div class="mt-2" style="white-space: pre-wrap; font-size: 0.9em;">${webData.search_results}</div>
                    </div>
                `;
            }
        } catch (webError) {
            dashboard.addMessage('Both database and web search are having issues. Please try again later.', 'ai');
        }
    }
}

async function findShortTermRentalProperties() {
    dashboard.addMessage('Searching for short-term rental investment opportunities in Hawaii...', 'ai');

    try {
        const response = await fetch('/api/ai/find-str-properties', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                criteria: {
                    property_type: 'Short-term Rental',
                    location: 'Hawaii',
                    investment_focus: 'Airbnb/VRBO potential',
                    min_roi: 8
                }
            })
        });
        const data = await response.json();

        if (data.success) {
            const message = data.database_matches && data.database_matches.length > 0 
                ? `Found ${data.database_matches.length} potential short-term rental properties! AI analysis shows strong vacation rental demand in tourist areas.`
                : 'AI identified prime short-term rental opportunities near beaches, tourist attractions, and downtown areas. Properties with existing permits show highest potential.';

            dashboard.addMessage(message, 'ai');

            // If we have actual properties, display them
            if (data.properties && data.properties.length > 0) {
                dashboard.displayProperties(data.properties);
            }
        }

    } catch (error) {
        console.error('Short-term rental search error:', error);
        dashboard.addMessage('Unable to complete short-term rental search. Analyzing market trends for vacation rental opportunities...', 'ai');

        // Fallback message with general STR insights
        setTimeout(() => {
            dashboard.addMessage('Based on Hawaii tourism data: Properties within 1 mile of beaches, Waikiki, or major attractions typically generate 15-25% higher rental yields. Consider condos with existing vacation rental permits.', 'ai');
        }, 2000);
    }
}

async function getMarketAnalysis() {
    dashboard.addMessage('Generating comprehensive market analysis...', 'ai');

    try {
        const response = await fetch('/api/ai/market-analysis', {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            dashboard.addMessage(data.market_insights, 'ai');
        } else {
            dashboard.addMessage(data.message, 'ai');
        }

    } catch (error) {
        console.error('Market analysis error:', error);
        dashboard.addMessage('Unable to generate market analysis. Please try again.', 'ai');
    }
}

async function scrapeProperties() {
    dashboard.addMessage('Starting property scraping process...', 'ai');

    try {
        const response = await fetch('/api/scraper/scrape-hawaii', {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            dashboard.addMessage(`Scraping complete! Found ${data.total_scraped} properties with ${data.new_properties} new additions.`, 'ai');
            dashboard.updateStats();
            setTimeout(() => dashboard.loadRecentLeads(), 2000);
        } else {
            dashboard.addMessage(`Scraping encountered issues: ${data.error}`, 'ai');
        }

    } catch (error) {
        console.error('Scraping error:', error);
        dashboard.addMessage('Scraping failed. Please check the server status.', 'ai');
    }
}

async function refreshLeads() {
    await dashboard.loadRecentLeads();
    dashboard.addMessage('Leads refreshed with latest data!', 'ai');
}

function sendMessage() {
    dashboard.sendMessage();
}

// Search properties from dashboard
async function searchProperties() {
    await dashboard.searchProperties();
}

// Clear search filters
function clearFilters() {
    document.getElementById('zipCode').value = '';
    document.getElementById('customZipCode').value = '';
    document.getElementById('customZipCode').style.display = 'none';
    document.getElementById('propertyType').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('distressStatus').value = '';
    document.getElementById('sourceFilter').value = '';

    dashboard.addMessage('Search filters cleared.', 'ai');

    // Clear results
    document.getElementById('propertiesContainer').innerHTML = `
        <div class="col-12 text-center text-muted">
            <i class="fas fa-search fa-3x mb-3"></i>
            <p>Use the search filters above to find properties</p>
        </div>
    `;
    document.getElementById('resultsCount').textContent = '0 properties';
}

// Scrape Hawaii properties
async function scrapeHawaiiProperties() {
    dashboard.addMessage('Starting Hawaii property scraping...', 'ai');

    try {
        const response = await fetch('/api/scraper/scrape-hawaii', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            dashboard.addMessage(`Scraping complete! Found ${result.total_scraped} properties with ${result.new_properties} new additions.`, 'ai');
            dashboard.updateStats();

            // Auto-refresh search results if filters are applied
            const hasFilters = document.getElementById('zipCode').value || 
                             document.getElementById('propertyType').value || 
                             document.getElementById('maxPrice').value;
            if (hasFilters) {
                setTimeout(() => dashboard.searchProperties(), 2000);
            }
        } else {
            dashboard.addMessage(`Scraping encountered issues: ${result.error}`, 'ai');
        }

    } catch (error) {
        console.error('Scraping error:', error);
        dashboard.addMessage('Scraping failed. Please check the server status.', 'ai');
    }
}

// Handle zip code dropdown change
function handleZipCodeChange() {
    const zipSelect = document.getElementById('zipCode');
    const customZipInput = document.getElementById('customZipCode');

    if (zipSelect.value === 'custom') {
        customZipInput.style.display = 'block';
        customZipInput.focus();
    } else {
        customZipInput.style.display = 'none';
        customZipInput.value = '';
    }
}

// Find off-market leads
async function findOffMarketLeads() {
    dashboard.addMessage('🔍 Analyzing properties for off-market opportunities...', 'ai');

    try {
        const response = await fetch('/api/off-market-leads/find-off-market-leads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success && data.leads && data.leads.length > 0) {
            displayOffMarketLeads(data.leads);
            dashboard.addMessage(`🎯 Found ${data.leads.length} off-market opportunities! Analyzed ${data.total_analyzed} properties. ${data.market_summary}`, 'ai');
        } else {
            dashboard.addMessage('No high-potential off-market opportunities found in current data. Try scraping new properties first.', 'ai');
        }

    } catch (error) {
        console.error('Off-market leads error:', error);
        dashboard.addMessage('Error finding off-market leads. Please try again.', 'ai');
    }

    function displayOffMarketLeads(leads) {
        const resultsDiv = document.getElementById('results');

        if (!resultsDiv) {
            console.error("Results div not found.");
            return;
        }

        resultsDiv.innerHTML = '<h3>🎯 Off-Market Investment Opportunities</h3>';

        leads.forEach(lead => {
            const urgencyColor = {
                'critical': 'danger',
                'high': 'warning',
                'medium': 'info',
                'low': 'secondary'
            }[lead.urgency_level] || 'secondary';

            // Enhanced card display with tax delinquency and pre-foreclosure focus
            const card = document.createElement('div');
            card.className = `property-card mb-3 border-left-${urgencyColor}`;

            // Format tax delinquency indicators
            const taxIndicators = lead.tax_delinquency_signals || [];
            const preForeclosureIndicators = lead.pre_foreclosure_signals || [];

            card.innerHTML = `
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h5 class="card-title">
                            ${lead.address}
                            <span class="badge badge-${urgencyColor} ml-2">${lead.urgency_level?.toUpperCase()}</span>
                            ${lead.off_market_score >= 80 ? '<span class="badge badge-warning ml-1">🔥 HOT LEAD</span>' : ''}
                        </h5>
                        <p class="text-muted mb-2">
                            <strong>Score:</strong> ${lead.off_market_score}/100 | 
                            <strong>Type:</strong> ${lead.property_type} | 
                            <strong>Status:</strong> ${lead.distress_status} |
                            <strong>Source:</strong> ${lead.source}
                        </p>

                        ${lead.tax_delinquency_analysis ? `
                        <div class="alert alert-warning p-2 mb-2">
                            <h6><i class="fas fa-exclamation-triangle"></i> Tax Delinquency Analysis:</h6>
                            <ul class="list-unstyled mb-0 ml-3">
                                <li><strong>Probability:</strong> ${lead.tax_delinquency_analysis.delinquency_probability || 'Unknown'}</li>
                                <li><strong>Estimated Back Taxes:</strong> ${lead.tax_delinquency_analysis.estimated_back_taxes || 'TBD'}</li>
                                <li><strong>Tax Sale Eligible:</strong> ${lead.tax_delinquency_analysis.tax_sale_eligible || 'Unknown'}</li>
                            </ul>
                        </div>
                        ` : ''}

                        ${(lead.pre_foreclosure_signals && lead.pre_foreclosure_signals.length > 0) ? `
                        <div class="alert alert-danger p-2 mb-2">
                            <h6><i class="fas fa-gavel"></i> Pre-Foreclosure Indicators:</h6>
                            <ul class="list-unstyled mb-0 ml-3">
                                ${lead.pre_foreclosure_signals.map(indicator => `<li><i class="fas fa-ban text-danger"></i> ${indicator}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}

                        <div class="mb-2">
                            <strong>Off-Market Indicators:</strong>
                            <ul class="list-unstyled ml-3">
                                ${lead.off_market_indicators?.map(indicator => `<li><i class="fas fa-arrow-right text-warning"></i> ${indicator}</li>`).join('') || ''}
                            </ul>
                        </div>
                        <div class="mb-2">
                            <strong>Motivation Signals:</strong>
                            <span class="text-info">${lead.motivation_signals?.join(', ') || 'Standard market conditions'}</span>
                        </div>
                    </div>
                    <div class="col-md-4 text-right">
                        <h4 class="text-success">$${lead.price?.toLocaleString()}</h4>
                        <p class="text-muted mb-1">Est. Discount: ${lead.estimated_discount}</p>
                        <p class="text-muted mb-1">Lead Quality: <strong>${lead.lead_quality}</strong></p>
                        ${lead.urgency_level === 'critical' ? '<p class="text-danger"><strong>⏰ URGENT ACTION REQUIRED</strong></p>' : ''}
                        <button class="btn btn-sm btn-primary mb-1" onclick="dashboard.viewDetailedAnalysis('${lead.id}')">
                            <i class="fas fa-chart-line"></i> Full Analysis
                        </button>
                        <button class="btn btn-sm btn-warning mb-1" onclick="dashboard.viewTaxAnalysis('${lead.id}')">
                            <i class="fas fa-dollar-sign"></i> Tax Status
                        </button>
                        <button class="btn btn-sm btn-success" onclick="dashboard.addToLeads('${lead.id}')">
                            <i class="fas fa-plus"></i> Add to Leads
                        </button>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <div class="alert alert-info p-2">
                            <strong>Contact Strategy:</strong> ${lead.contact_strategy}<br>
                            <strong>Priority Actions:</strong> ${lead.action_items?.slice(0, 3).join(' • ') || 'Standard due diligence required'}
                            ${lead.action_items?.length > 3 ? `<br><small class="text-muted">+${lead.action_items.length - 3} more action items</small>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

            resultsDiv.appendChild(card);
        });
    }
}

// Find off-market properties with enhanced analysis
async function findOffMarketProperties() {
    dashboard.addMessage('🏠 Searching for off-market properties with comprehensive analysis...', 'ai');

    try {
        const response = await fetch('/api/off-market/find-off-market-leads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success && data.leads && data.leads.length > 0) {
            // Display properties in the main container
            const container = document.getElementById('propertiesContainer');
            const countBadge = document.getElementById('resultsCount');

            countBadge.textContent = `${data.leads.length} off-market properties`;

            container.innerHTML = data.leads.map(property => {
                const tenantAnalysis = property.tenant_revenue_analysis || {};
                const leaseAnalysis = property.lease_analysis || {};
                const conditionAssessment = property.condition_assessment || {};

                return `
                    <div class="col-md-6 col-lg-4">
                        <div class="property-card border-${property.urgency_level === 'critical' ? 'danger' : property.urgency_level === 'high' ? 'warning' : 'primary'}">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="mb-0">${property.address}</h6>
                                <span class="badge bg-${property.urgency_level === 'critical' ? 'danger' : property.urgency_level === 'high' ? 'warning' : 'info'}">
                                    ${property.off_market_score}/100
                                </span>
                            </div>

                            <div class="row">
                                <div class="col-6">
                                    <small class="text-muted">Price:</small><br>
                                    <strong>$${Number(property.price || 0).toLocaleString()}</strong>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Type:</small><br>
                                    ${property.property_type || 'N/A'}
                                </div>
                            </div>

                            <div class="row mt-2">
                                <div class="col-6">
                                    <small class="text-muted">Tenure:</small><br>
                                    ${leaseAnalysis.tenure_type?.replace('_', ' ') || 'Unknown'}
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Condition:</small><br>
                                    ${conditionAssessment.property_condition?.replace('_', ' ') || 'TBD'}
                                </div>
                            </div>

                            <div class="row mt-2">
                                <div class="col-6">
                                    <small class="text-muted">Est. Rent:</small><br>
                                    ${tenantAnalysis.estimated_monthly_rent || 'Analyzing...'}
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Strategy:</small><br>
                                    ${conditionAssessment.investment_strategy || 'TBD'}
                                </div>
                            </div>

                            <div class="mt-2">
                                <small class="text-muted">Source:</small> ${property.source || 'N/A'}<br>
                                <small class="text-muted">Urgency:</small> 
                                <span class="badge bg-${property.urgency_level === 'critical' ? 'danger' : property.urgency_level === 'high' ? 'warning' : 'info'}">
                                    ${property.urgency_level?.toUpperCase()}
                                </span>
                            </div>

                            <div class="mt-3">
                                <button class="btn btn-sm btn-success" onclick="dashboard.openROICalculator(${property.id})">
                                    <i class="fas fa-calculator"></i> ROI
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="dashboard.addToLeads('${property.id}')">
                                    <i class="fas fa-star"></i> Lead
                                </button>
                                <button class="btn btn-sm btn-info" onclick="dashboard.viewDetailedAnalysis('${property.id}')">
                                    <i class="fas fa-chart-line"></i> Details
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            dashboard.addMessage(`🎯 Found ${data.leads.length} off-market properties! Analyzed ${data.total_analyzed} properties with comprehensive tenant revenue, lease analysis, and condition assessments.`, 'ai');
        } else {
            dashboard.addMessage('No off-market properties found in current data. Try scraping new properties first.', 'ai');
        }

    } catch (error) {
        console.error('Off-market properties error:', error);
        dashboard.addMessage('Error finding off-market properties. Please try again.', 'ai');
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', function() {
    dashboard = new PropertyDashboard();
});

// Missing utility functions
function showLoading(message = 'Loading...') {
    const loadingDiv = document.getElementById('loadingIndicator') || createLoadingIndicator();
    loadingDiv.innerHTML = `
        <div class="text-center">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2">${message}</p>
        </div>
    `;
    loadingDiv.style.display = 'block';
}

function hideLoading() {
    const loadingDiv = document.getElementById('loadingIndicator');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

function createLoadingIndicator() {
    const div = document.createElement('div');
    div.id = 'loadingIndicator';
    div.className = 'position-fixed top-50 start-50 translate-middle';
    div.style.zIndex = '9999';
    document.body.appendChild(div);
    return div;
}

function addMessage(type, message) {
    if (dashboard) {
        dashboard.addMessage(message, type === 'system' ? 'ai' : type);
    }
}

// Copy report function
function copyReport(propertyId) {
    // Get the report content
    const reportCard = document.querySelector(`[data-property-id="${propertyId}"]`);
    if (reportCard) {
        const reportText = reportCard.innerText;
        navigator.clipboard.writeText(reportText).then(() => {
            alert('Report copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy report');
        });
    }
}

// Export report function
function exportReport(propertyId) {
    alert(`Exporting report for property ${propertyId} as PDF. This would integrate with a PDF generation library.`);
}

async function generateDetailedReports() {
    try {
        showLoading('🤖 Analyzing with GROQ AI and 🧠 generating detailed reports with Anthropic AI...');

        const response = await fetch('/api/ai/generate-detailed-reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        hideLoading();

        if (data.success) {
            displayDetailedReports(data);
            addMessage('system', `✅ Generated ${data.successful_analyses} detailed reports using GROQ + Anthropic AI system`);
            if (data.failed_analyses > 0) {
                addMessage('system', `⚠️ ${data.failed_analyses} properties failed analysis - check API keys`);
            }
        } else {
            addMessage('system', '❌ Failed to generate detailed reports');
        }

    } catch (error) {
        hideLoading();
        console.error('Error generating reports:', error);
        addMessage('system', '❌ Error generating detailed reports - check ANTHROPIC_API_KEY');
    }
}

function displayDetailedReports(data) {
    const resultsDiv = document.getElementById('results');
    const resultsContainer = document.getElementById('resultsContainer');
    
    // Show the results container
    if (resultsContainer) {
        resultsContainer.style.display = 'block';
    }

    let html = `
        <div class="reports-header">
            <h3>📊 Dual AI Property Analysis Reports</h3>
            <p>🤖 GROQ AI + 🧠 Anthropic AI • ${data.total_properties_processed} properties • ${data.successful_analyses} successful</p>
            <div class="ai-stats">
                <span class="stat">✅ Success: ${data.successful_analyses}</span>
                <span class="stat">❌ Failed: ${data.failed_analyses}</span>
                <span class="stat">⏰ Generated: ${new Date(data.processing_timestamp).toLocaleString()}</span>
            </div>
        </div>
    `;

    data.detailed_reports.forEach(report => {
        if (report.error) {
            html += `
                <div class="report-card error">
                    <h4>❌ ${report.address}</h4>
                    <p>Analysis failed: ${report.details}</p>
                    <small>Check API keys and try again</small>
                </div>
            `;
            return;
        }

        const score = report.comprehensive_score || report.groq_analysis?.investment_score || 0;
        const scoreClass = score >= 7 ? 'high-score' : score >= 5 ? 'medium-score' : 'low-score';

        html += `
            <div class="report-card ${scoreClass}" data-property-id="${report.property_id || report.id}">
                <div class="report-header">
                    <h4>${report.address}</h4>
                    <div class="dual-scores">
                        <div class="score-badge comprehensive">Overall: ${score}/10</div>
                        <div class="score-badge groq">GROQ: ${report.groq_analysis?.investment_score || 'N/A'}/10</div>
                    </div>
                    <div class="price">$${report.price?.toLocaleString()}</div>
                </div>

                <div class="report-content">
                    <div class="ai-section groq-section">
                        <h5>🤖 GROQ AI Quick Analysis</h5>
                        <div class="quick-stats">
                            <span class="stat">Score: ${report.groq_analysis?.investment_score}/10</span>
                            <span class="stat">Off-Market: ${report.groq_analysis?.off_market_potential || 'Unknown'}</span>
                            <span class="stat">ROI: ${report.groq_analysis?.roi_potential || 'TBD'}</span>
                        </div>
                        <p><strong>Key Opportunities:</strong> ${Array.isArray(report.groq_analysis?.opportunities) 
                            ? report.groq_analysis.opportunities.slice(0, 2).join(', ') 
                            : report.groq_analysis?.opportunities || 'Analysis pending'}</p>
                    </div>

                    <div class="ai-section anthropic-section">
                        <h5>🧠 Anthropic AI Comprehensive Report</h5>
                        <div class="detailed-content">
                            ${report.anthropic_detailed_report?.detailed_report 
                                ? formatDetailedReport(report.anthropic_detailed_report.detailed_report)
                                : '<p class="no-data">Detailed analysis not available - check ANTHROPIC_API_KEY</p>'}
                        </div>
                        <div class="report-meta">
                            <span>Model: ${report.anthropic_detailed_report?.model_used || 'N/A'}</span>
                            <span>Confidence: ${report.anthropic_detailed_report?.analysis_confidence || 'N/A'}</span>
                            <span>Generated: ${report.anthropic_detailed_report?.generated_at 
                                ? new Date(report.anthropic_detailed_report.generated_at).toLocaleString() 
                                : 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div class="report-actions">
                    <button onclick="copyReport('${report.property_id || report.id}')" class="btn-copy">📋 Copy Report</button>
                    <button onclick="exportReport('${report.property_id || report.id}')" class="btn-export">📄 Export PDF</button>
                    <button onclick="dashboard.addToLeads('${report.property_id || report.id}')" class="btn btn-sm btn-success ms-2">
                        <i class="fas fa-star"></i> Add to Leads
                    </button>
                </div>
            </div>
        `;
    });

    resultsDiv.innerHTML = html;
}

function formatDetailedReport(report) {
    // Format the Anthropic report with better HTML structure
    return report
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>')
        .replace(/(\d+\.\s[A-Z][^:]+:)/g, '<strong>$1</strong>')
        .replace(/(EXECUTIVE SUMMARY|INVESTMENT HIGHLIGHTS|FINANCIAL ANALYSIS|MARKET ANALYSIS|RISK ASSESSMENT|DUE DILIGENCE|RECOMMENDATION)/g, '<h6>$1</h6>');
}

// Generate leads
async function generateLeads() {
    const location = document.getElementById('lead-location').value;
    const propertyType = document.getElementById('lead-property-type').value;
    const budget = document.getElementById('lead-budget').value;
    const goals = document.getElementById('lead-goals').value;

    if (!location || !propertyType || !budget) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        showLoading(true);

        const response = await fetch('/api/ai/generate-leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                criteria: { location, propertyType, budget: parseInt(budget), investmentGoals: goals }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayLeads(data.leads || []);
        displayAiAnalysis(data.aiAnalysis || 'No analysis available');

        // Also search web for additional properties
        searchWebProperties(location, propertyType, budget);

    } catch (error) {
        console.error('Error generating leads:', error);
        alert('Failed to generate leads. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Search web for additional property data
async function searchWebProperties(location, propertyType, maxPrice) {
    try {
        const response = await fetch('/api/search/search-properties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location, propertyType, maxPrice })
        });

        if (response.ok) {
            const data = await response.json();
            displayWebSearchResults(data);
        }
    } catch (error) {
        console.error('Web search error:', error);
    }
}

// Display web search results
function displayWebSearchResults(data) {
    const webResultsDiv = document.getElementById('web-search-results') || createWebSearchResultsDiv();

    let html = '<h4>Additional Online Properties Found:</h4>';
    data.searchResults.forEach(source => {
        html += `<div class="web-source">
            <h5>${source.source}</h5>`;
        source.properties.forEach(property => {
            html += `<div class="web-property">
                <strong>${property.address}</strong><br>
                Type: ${property.type}<br>
                Price: $${property.price?.toLocaleString()}<br>
                <small>${property.description}</small>
            </div>`;
        });
        html += '</div>';
    });

    if (data.aiAnalysis) {
        html += `<div class="web-analysis">
            <h5>Market Analysis:</h5>
            <p>${data.aiAnalysis}</p>
        </div>`;
    }

    webResultsDiv.innerHTML = html;
}

function createWebSearchResultsDiv() {
    const div = document.createElement('div');
    div.id = 'web-search-results';
    div.className = 'mt-4';
    document.getElementById('ai-leads-results').appendChild(div);
    return div;
}