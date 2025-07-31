
// Dashboard functionality with AI chat and image scraping
let currentSection = 'dashboard';
let chatHistory = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    setupChatInput();
    setupSearchFilter();
    loadInitialLeads();
});

// Section navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(sectionName + '-section').style.display = 'block';
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
    
    currentSection = sectionName;
    
    // Load section-specific data
    if (sectionName === 'leads') {
        loadLeads();
    } else if (sectionName === 'analytics') {
        loadAnalytics();
    }
}

// Load dashboard metrics
async function loadDashboardData() {
    try {
        const response = await fetch('/api/properties');
        const properties = await response.json();
        
        // Update metrics
        document.getElementById('totalProperties').textContent = properties.length;
        document.getElementById('activeLeadsCount').textContent = properties.filter(p => p.lead_score > 70).length;
        document.getElementById('hotLeads').textContent = properties.filter(p => p.lead_score > 80).length;
        document.getElementById('distressedCount').textContent = properties.filter(p => p.distress_status && p.distress_status !== 'Market Rate').length;
        
        // Calculate average ROI
        const avgROI = properties.reduce((sum, p) => sum + (p.str_roi || 0), 0) / properties.length;
        document.getElementById('avgROI').textContent = avgROI.toFixed(1) + '%';
        
        // Load AI insights
        loadAIInsights();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// AI Chat functionality
function setupChatInput() {
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat('user', message);
    input.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Send to AI endpoint
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: message,
                context: 'property_analysis',
                chat_history: chatHistory.slice(-5) // Last 5 messages for context
            })
        });
        
        const result = await response.json();
        
        // Hide typing indicator
        hideTypingIndicator();
        
        // Add AI response to chat
        addMessageToChat('ai', result.response);
        
        // Store in chat history
        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: result.response });
        
    } catch (error) {
        hideTypingIndicator();
        addMessageToChat('ai', 'Sorry, I encountered an error. Please try again.');
        console.error('Chat error:', error);
    }
}

function addMessageToChat(sender, message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    
    if (sender === 'ai') {
        bubbleDiv.innerHTML = `
            <div class="d-flex align-items-center mb-2">
                <i class="fas fa-robot me-2"></i>
                <strong>AI Assistant</strong>
            </div>
            ${formatAIMessage(message)}
        `;
    } else {
        bubbleDiv.innerHTML = `
            <div class="d-flex align-items-center mb-2">
                <i class="fas fa-user me-2"></i>
                <strong>You</strong>
            </div>
            ${message}
        `;
    }
    
    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatAIMessage(message) {
    // Format AI responses with better styling
    return message
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

function showTypingIndicator() {
    document.getElementById('typingIndicator').classList.add('show');
}

function hideTypingIndicator() {
    document.getElementById('typingIndicator').classList.remove('show');
}

// Leads functionality with image scraping
async function loadLeads() {
    try {
        const response = await fetch('/api/scraper/generate-leads?min_score=60');
        const result = await response.json();
        
        displayLeads(result.leads || []);
        
    } catch (error) {
        console.error('Error loading leads:', error);
    }
}

async function loadInitialLeads() {
    if (currentSection === 'leads') {
        await loadLeads();
    }
}

function displayLeads(leads) {
    const container = document.getElementById('leadsContainer');
    container.innerHTML = '';
    
    if (!leads || leads.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted">
                <i class="fas fa-search fa-3x mb-3"></i>
                <h5>No leads found</h5>
                <p>Click "Generate New Leads" to find investment opportunities</p>
            </div>
        `;
        return;
    }
    
    leads.forEach(lead => {
        const leadCard = createLeadCard(lead);
        container.appendChild(leadCard);
    });
}

function createLeadCard(lead) {
    const card = document.createElement('div');
    card.className = 'lead-card position-relative';
    
    const statusClass = lead.lead_score > 80 ? 'status-hot' : lead.lead_score > 60 ? 'status-warm' : 'status-cold';
    const statusText = lead.lead_score > 80 ? 'HOT' : lead.lead_score > 60 ? 'WARM' : 'COLD';
    
    card.innerHTML = `
        <div class="position-relative">
            <img src="${lead.property_image || 'https://via.placeholder.com/350x200?text=Property+Image'}" 
                 alt="Property" class="lead-image" onerror="this.src='https://via.placeholder.com/350x200?text=No+Image+Available'">
            <div class="lead-score">${lead.lead_score}</div>
            <div class="position-absolute top-0 start-0 m-2">
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
        </div>
        <div class="lead-content">
            <h6 class="mb-2">${lead.address}</h6>
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="fw-bold text-success">$${lead.price?.toLocaleString() || 'N/A'}</span>
                <span class="badge bg-secondary">${lead.distress_status || 'Standard'}</span>
            </div>
            
            <div class="ai-insights mb-3">
                <h6><i class="fas fa-brain me-2"></i>AI Analysis</h6>
                <small>${lead.ai_insights || 'Analyzing investment potential...'}</small>
            </div>
            
            <div class="d-flex justify-content-between">
                <button class="btn btn-primary btn-sm" onclick="viewLeadDetails(${lead.id})">
                    <i class="fas fa-eye me-1"></i>Details
                </button>
                <button class="btn btn-ai btn-sm" onclick="enhanceLeadWithImages(${lead.id})">
                    <i class="fas fa-image me-1"></i>Get Images
                </button>
            </div>
        </div>
    `;
    
    return card;
}

// Image scraping functionality
async function enhanceLeadsWithImages() {
    try {
        const response = await fetch('/api/scraper/enhance-with-images', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Reload leads with new images
            await loadLeads();
            
            // Show success message
            showNotification('success', `Enhanced ${result.enhanced_count} leads with property images!`);
        } else {
            showNotification('error', 'Failed to enhance leads with images');
        }
        
    } catch (error) {
        console.error('Error enhancing leads:', error);
        showNotification('error', 'Error occurred while scraping images');
    }
}

async function enhanceLeadWithImages(leadId) {
    try {
        const response = await fetch(`/api/scraper/enhance-lead-images/${leadId}`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Property images updated!');
            await loadLeads(); // Refresh the leads
        } else {
            showNotification('error', 'Failed to fetch property images');
        }
        
    } catch (error) {
        console.error('Error enhancing lead images:', error);
        showNotification('error', 'Error fetching property images');
    }
}

// AI Report generation
async function generateAIReport() {
    try {
        showNotification('info', 'Generating AI market report...');
        
        const response = await fetch('/api/ai/generate-market-report', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update AI insights section
            document.getElementById('aiInsightsContainer').innerHTML = `
                <div class="ai-insights">
                    <h6>🎯 Latest Market Analysis</h6>
                    <p>${result.market_analysis}</p>
                </div>
                <div class="ai-insights">
                    <h6>💡 Investment Opportunities</h6>
                    <p>${result.opportunities}</p>
                </div>
                <div class="ai-insights">
                    <h6>⚠️ Market Risks</h6>
                    <p>${result.risks}</p>
                </div>
            `;
            
            showNotification('success', 'AI market report generated successfully!');
        }
        
    } catch (error) {
        console.error('Error generating report:', error);
        showNotification('error', 'Failed to generate AI report');
    }
}

// Search functionality
function setupSearchFilter() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        filterContent(query);
    });
}

function filterContent(query) {
    if (currentSection === 'leads') {
        const leadCards = document.querySelectorAll('.lead-card');
        leadCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query) ? 'block' : 'none';
        });
    }
}

// Lead generation
async function generateNewLeads() {
    try {
        showNotification('info', 'AI is analyzing properties for new leads...');
        
        const response = await fetch('/api/ai/generate-leads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                min_score: 60,
                include_ai_analysis: true,
                enhance_with_images: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadLeads();
            showNotification('success', `Generated ${result.new_leads_count} new AI-powered leads!`);
        } else {
            showNotification('error', 'Failed to generate new leads');
        }
        
    } catch (error) {
        console.error('Error generating leads:', error);
        showNotification('error', 'Error occurred while generating leads');
    }
}

// Load AI insights
async function loadAIInsights() {
    try {
        const response = await fetch('/api/ai/market-insights');
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('aiInsightsContainer').innerHTML = `
                <div class="ai-insights">
                    <h6>🎯 Market Trends</h6>
                    <p>${result.market_trends}</p>
                </div>
                <div class="ai-insights">
                    <h6>💎 Top Opportunities</h6>
                    <p>${result.opportunities}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading AI insights:', error);
    }
}

// Scraping functionality
async function startScraping() {
    try {
        showNotification('info', 'Starting property scraping...');
        
        const response = await fetch('/api/scraper/scrape-hawaii', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', `Scraped ${result.total_scraped} properties successfully!`);
            await loadDashboardData(); // Refresh dashboard
        } else {
            showNotification('error', 'Scraping failed');
        }
        
    } catch (error) {
        console.error('Scraping error:', error);
        showNotification('error', 'Error occurred during scraping');
    }
}

// Utility functions
function showNotification(type, message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function viewLeadDetails(leadId) {
    // Open lead details modal or redirect
    window.open(`/lead-details.html?id=${leadId}`, '_blank');
}

// Analytics loading
async function loadAnalytics() {
    // Placeholder for analytics functionality
    document.getElementById('analyticsContainer').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">Property Distribution</div>
                    <div class="card-body">
                        <canvas id="propertyChart"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">ROI Analysis</div>
                    <div class="card-body">
                        <canvas id="roiChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    `;
}
