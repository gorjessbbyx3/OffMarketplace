
// AI Property Valuation System Frontend

class AIValuationSystem {
  constructor() {
    this.selectedProperties = new Set();
    this.init();
  }

  init() {
    this.createValuationInterface();
    this.loadTopLeads();
  }

  createValuationInterface() {
    const container = document.getElementById('valuationContainer') || this.createValuationContainer();
    
    container.innerHTML = `
      <div class="ai-valuation-system">
        <div class="row">
          <div class="col-md-8">
            <div class="card">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h5><i class="fas fa-calculator"></i> AI Property Valuation Engine</h5>
                <div class="btn-group" role="group">
                  <button class="btn btn-primary btn-sm" onclick="this.runBulkValuation()">
                    <i class="fas fa-magic"></i> Bulk Valuate
                  </button>
                  <button class="btn btn-success btn-sm" onclick="this.showTopLeads()">
                    <i class="fas fa-star"></i> Top Leads
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div id="valuationResults"></div>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card">
              <div class="card-header">
                <h6><i class="fas fa-chart-line"></i> Valuation Metrics</h6>
              </div>
              <div class="card-body">
                <div id="valuationMetrics">
                  <div class="metric-item">
                    <span class="metric-label">Properties Analyzed:</span>
                    <span class="metric-value" id="analyzedCount">0</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Avg Lead Score:</span>
                    <span class="metric-value" id="avgLeadScore">0</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">High-Value Leads:</span>
                    <span class="metric-value" id="highValueCount">0</span>
                  </div>
                  <div class="metric-item">
                    <span class="metric-label">Total Equity Potential:</span>
                    <span class="metric-value" id="totalEquity">$0</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="card mt-3">
              <div class="card-header">
                <h6><i class="fas fa-cogs"></i> Valuation Settings</h6>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label>Minimum Lead Score</label>
                  <input type="range" class="form-control-range" id="minLeadScore" min="0" max="100" value="70">
                  <small class="text-muted">Current: <span id="minScoreValue">70</span></small>
                </div>
                <div class="form-group">
                  <label>Focus Area</label>
                  <select class="form-control" id="focusArea">
                    <option value="all">All Areas</option>
                    <option value="96814">Kakaako (96814)</option>
                    <option value="96815">Waikiki (96815)</option>
                    <option value="96816">Kailua (96816)</option>
                    <option value="96734">Kailua (96734)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  createValuationContainer() {
    const container = document.createElement('div');
    container.id = 'valuationContainer';
    container.className = 'valuation-container mt-3';
    document.querySelector('.container-fluid').appendChild(container);
    return container;
  }

  async runBulkValuation() {
    try {
      this.showLoading('Running AI bulk valuation on all properties...');
      
      const response = await fetch('/api/ai/bulk-valuate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 100 })
      });
      
      const result = await response.json();
      
      this.hideLoading();
      
      if (result.success) {
        this.showNotification(`✅ Bulk valuation complete: ${result.successful}/${result.processed} properties analyzed`, 'success');
        this.loadTopLeads();
        this.updateMetrics();
      } else {
        this.showNotification('❌ Bulk valuation failed', 'error');
      }
      
    } catch (error) {
      this.hideLoading();
      console.error('Bulk valuation error:', error);
      this.showNotification('❌ Bulk valuation error', 'error');
    }
  }

  async valuateProperty(propertyId) {
    try {
      this.showLoading(`Analyzing property ${propertyId} with AI...`);
      
      const response = await fetch(`/api/ai/valuate-property/${propertyId}`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      this.hideLoading();
      
      if (result.success) {
        this.displayPropertyValuation(result);
      } else {
        this.showNotification('❌ Property valuation failed', 'error');
      }
      
    } catch (error) {
      this.hideLoading();
      console.error('Property valuation error:', error);
      this.showNotification('❌ Property valuation error', 'error');
    }
  }

  displayPropertyValuation(result) {
    const modal = this.createValuationModal(result);
    document.body.appendChild(modal);
    $(modal).modal('show');
  }

  createValuationModal(result) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-calculator"></i> AI Property Valuation
            </h5>
            <button type="button" class="close" data-dismiss="modal">
              <span>&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-6">
                <h6>Valuation Summary</h6>
                <table class="table table-sm">
                  <tr>
                    <td>Current Price:</td>
                    <td><strong>$${result.valuation.current_price?.toLocaleString()}</strong></td>
                  </tr>
                  <tr>
                    <td>AI Estimated Value:</td>
                    <td><strong class="text-success">$${result.valuation.estimated_market_value?.toLocaleString()}</strong></td>
                  </tr>
                  <tr>
                    <td>Equity Capture:</td>
                    <td><strong class="text-primary">${result.valuation.equity_capture_percentage}%</strong></td>
                  </tr>
                  <tr>
                    <td>Repair Estimate:</td>
                    <td><strong>$${result.valuation.repair_cost_estimate?.toLocaleString()}</strong></td>
                  </tr>
                  <tr>
                    <td>Lead Score:</td>
                    <td><span class="badge badge-${this.getScoreBadgeClass(result.valuation.lead_score)}">${result.valuation.lead_score}/100</span></td>
                  </tr>
                </table>
              </div>
              <div class="col-md-6">
                <h6>Investment Metrics</h6>
                <div class="investment-metrics">
                  <div class="metric-card">
                    <div class="metric-title">Potential Profit</div>
                    <div class="metric-amount text-success">
                      $${((result.valuation.estimated_market_value - result.valuation.current_price) || 0).toLocaleString()}
                    </div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-title">Investment Grade</div>
                    <div class="metric-grade ${this.getGradeClass(result.valuation.investment_grade_score)}">
                      ${this.getInvestmentGrade(result.valuation.investment_grade_score)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="mt-3">
              <h6>Detailed Analysis</h6>
              <div class="analysis-content" style="max-height: 300px; overflow-y: auto;">
                ${result.detailed_analysis.replace(/\n/g, '<br>')}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-success" onclick="this.addToLeads(${result.property_id})">
              <i class="fas fa-plus"></i> Add to Leads
            </button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    `;
    return modal;
  }

  async loadTopLeads() {
    try {
      const minScore = document.getElementById('minLeadScore')?.value || 70;
      const response = await fetch(`/api/ai/top-leads?limit=20&min_score=${minScore}`);
      const result = await response.json();
      
      if (result.success) {
        this.displayTopLeads(result.leads);
      }
      
    } catch (error) {
      console.error('Error loading top leads:', error);
    }
  }

  displayTopLeads(leads) {
    const container = document.getElementById('valuationResults');
    
    if (!leads || leads.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i> No high-scoring leads found. Run bulk valuation to analyze properties.
        </div>
      `;
      return;
    }

    const leadsHtml = leads.map(lead => `
      <div class="lead-card" data-property-id="${lead.id}">
        <div class="row align-items-center">
          <div class="col-md-4">
            <div class="property-info">
              <h6>${lead.address}</h6>
              <small class="text-muted">${lead.property_type} • ${lead.zip}</small>
            </div>
          </div>
          <div class="col-md-2">
            <div class="price-info">
              <div class="current-price">$${lead.price?.toLocaleString()}</div>
              <div class="estimated-value text-success">$${lead.ai_estimated_value?.toLocaleString()}</div>
            </div>
          </div>
          <div class="col-md-2">
            <div class="profit-info">
              <div class="potential-profit text-primary">
                $${(lead.potential_profit || 0).toLocaleString()}
              </div>
              <div class="profit-percentage text-muted">
                ${(lead.profit_percentage || 0).toFixed(1)}%
              </div>
            </div>
          </div>
          <div class="col-md-2">
            <span class="badge badge-${this.getScoreBadgeClass(lead.ai_lead_score)} lead-score">
              ${lead.ai_lead_score}/100
            </span>
          </div>
          <div class="col-md-2">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary" onclick="aiValuation.valuateProperty(${lead.id})">
                <i class="fas fa-calculator"></i>
              </button>
              <button class="btn btn-outline-success" onclick="aiValuation.addToLeads(${lead.id})">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="leads-header">
        <h6><i class="fas fa-star"></i> Top AI-Scored Investment Opportunities</h6>
        <small class="text-muted">Showing ${leads.length} properties with lead score ≥ ${document.getElementById('minLeadScore')?.value || 70}</small>
      </div>
      <div class="leads-list">
        ${leadsHtml}
      </div>
    `;
  }

  async updateMetrics() {
    try {
      const response = await fetch('/api/properties');
      const properties = await response.json();
      
      const analyzed = properties.filter(p => p.ai_lead_score > 0);
      const avgScore = analyzed.length > 0 ? 
        analyzed.reduce((sum, p) => sum + p.ai_lead_score, 0) / analyzed.length : 0;
      const highValue = analyzed.filter(p => p.ai_lead_score >= 80);
      const totalEquity = analyzed.reduce((sum, p) => sum + (p.potential_profit || 0), 0);
      
      document.getElementById('analyzedCount').textContent = analyzed.length;
      document.getElementById('avgLeadScore').textContent = avgScore.toFixed(1);
      document.getElementById('highValueCount').textContent = highValue.length;
      document.getElementById('totalEquity').textContent = `$${totalEquity.toLocaleString()}`;
      
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  getScoreBadgeClass(score) {
    if (score >= 90) return 'success';
    if (score >= 80) return 'primary';
    if (score >= 70) return 'warning';
    return 'secondary';
  }

  getInvestmentGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'C+';
    return 'C';
  }

  getGradeClass(score) {
    if (score >= 85) return 'text-success';
    if (score >= 75) return 'text-primary';
    if (score >= 65) return 'text-warning';
    return 'text-secondary';
  }

  showLoading(message) {
    const existing = document.getElementById('loadingIndicator');
    if (existing) existing.remove();
    
    const loader = document.createElement('div');
    loader.id = 'loadingIndicator';
    loader.className = 'alert alert-info';
    loader.innerHTML = `
      <div class="d-flex align-items-center">
        <div class="spinner-border spinner-border-sm mr-2" role="status"></div>
        ${message}
      </div>
    `;
    
    document.getElementById('valuationResults').prepend(loader);
  }

  hideLoading() {
    const loader = document.getElementById('loadingIndicator');
    if (loader) loader.remove();
  }

  showNotification(message, type = 'info') {
    // Implementation for showing notifications
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
      ${message}
      <button type="button" class="close" data-dismiss="alert">
        <span>&times;</span>
      </button>
    `;
    
    document.querySelector('.container-fluid').prepend(alert);
    
    setTimeout(() => {
      $(alert).alert('close');
    }, 5000);
  }

  async addToLeads(propertyId) {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          tag: 'AI-Generated',
          notes: 'Generated by AI valuation system'
        })
      });
      
      if (response.ok) {
        this.showNotification('✅ Property added to leads', 'success');
      }
      
    } catch (error) {
      console.error('Error adding to leads:', error);
      this.showNotification('❌ Failed to add to leads', 'error');
    }
  }
}

// Initialize AI Valuation System
let aiValuation;
document.addEventListener('DOMContentLoaded', function() {
  aiValuation = new AIValuationSystem();
});

// Event listeners
document.addEventListener('change', function(e) {
  if (e.target.id === 'minLeadScore') {
    document.getElementById('minScoreValue').textContent = e.target.value;
    if (aiValuation) aiValuation.loadTopLeads();
  }
});
