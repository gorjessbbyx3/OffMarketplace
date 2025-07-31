// Dashboard JavaScript for AI Property Finder
class PropertyDashboard {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.leadsContainer = document.getElementById('leadsContainer');
        this.typingIndicator = document.getElementById('typingIndicator');

        this.initializeEventListeners();
        this.loadDashboardData();
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

    displayLeads(leads) {
        if (leads.length === 0) {
            this.leadsContainer.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-search fa-3x mb-3"></i>
                    <p>No AI leads generated yet. Try generating new leads!</p>
                </div>
            `;
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
            // Send message to AI endpoint
            const response = await fetch('/api/test/hello', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();

            // Hide typing indicator and add AI response
            this.hideTyping();
            this.addMessage(data.response || data.message, 'ai');

            // If the message is about finding properties, also update leads
            if (message.toLowerCase().includes('find') || message.toLowerCase().includes('search')) {
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

        if (type === 'ai') {
            messageDiv.innerHTML = `<strong>AI Assistant:</strong> ${text}`;
        } else {
            messageDiv.innerHTML = `<strong>You:</strong> ${text}`;
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

    async addToLeads(propertyId) {
        const tag = 'AI Generated Lead';
        const notes = 'Generated from AI dashboard';

        try {
            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    property_id: propertyId,
                    tag: tag,
                    notes: notes
                })
            });

            if (response.ok) {
                this.addMessage('Property added to your leads successfully!', 'ai');
                this.updateStats();
            }
        } catch (error) {
            console.error('Error adding lead:', error);
        }
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

        dashboard.displayLeads(data.leads.slice(0, 10));
        dashboard.addMessage(`Generated ${data.total_leads} new leads! Found ${data.high_priority} high-priority opportunities.`, 'ai');
        dashboard.updateStats();

    } catch (error) {
        console.error('Error generating leads:', error);
        dashboard.addMessage('Sorry, I encountered an error generating leads. Please try again.', 'ai');
    }
}

async function findKakaakoOpportunity() {
    dashboard.addMessage('Searching for 4-unit apartment opportunities in Kakaako...', 'ai');

    try {
        const response = await fetch('/api/ai/find-kakaako-apartment', {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            const message = data.database_matches.length > 0 
                ? `Found ${data.database_matches.length} Kakaako properties in our database! AI analysis suggests focusing on pre-foreclosure opportunities around $2M.`
                : 'No exact matches in database, but AI has identified similar opportunities. The market shows strong potential for 4-unit buildings in Kakaako.';

            dashboard.addMessage(message, 'ai');
        }

    } catch (error) {
        console.error('Kakaako search error:', error);
        dashboard.addMessage('Unable to complete Kakaako search. Please try again.', 'ai');
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

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', function() {
    dashboard = new PropertyDashboard();
});

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
            <div class="report-card ${scoreClass}">
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
                    <button onclick="copyReport('${report.property_id}')" class="btn-copy">📋 Copy Report</button>
                    <button onclick="exportReport('${report.property_id}')" class="btn-export">📄 Export PDF</button>
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