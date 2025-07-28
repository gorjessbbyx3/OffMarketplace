
// Global variables
let currentProperties = [];

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
        distress_status: document.getElementById('distressStatus').value
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

    propertiesList.innerHTML = properties.map(property => `
        <div class="col-md-6 col-lg-4">
            <div class="property-card">
                <div class="card-body">
                    <h5 class="card-title">${property.address}</h5>
                    <p class="card-text">
                        <strong>Price:</strong> $${Number(property.price).toLocaleString()}<br>
                        <strong>Type:</strong> ${property.property_type}<br>
                        <strong>Sqft:</strong> ${property.sqft ? Number(property.sqft).toLocaleString() : 'N/A'}<br>
                        <strong>Zoning:</strong> ${property.zoning || 'N/A'}<br>
                        <strong>Status:</strong> ${property.distress_status || 'N/A'}
                    </p>
                    ${property.str_roi ? `<span class="roi-badge">ROI: ${property.str_roi.toFixed(1)}%</span>` : ''}
                    <div class="mt-3">
                        <button class="btn btn-sm btn-success" onclick="openROICalculator(${property.id})">Calculate ROI</button>
                        <button class="btn btn-sm btn-primary" onclick="addToLeads(${property.id})">Add to Leads</button>
                    </div>
                    ${property.owner_contact ? `<small class="text-muted d-block mt-2">Owner: ${property.owner_name} - ${property.owner_contact}</small>` : ''}
                </div>
            </div>
        </div>
    `).join('');
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
            throw new Error('Failed to add lead');
        }
    } catch (error) {
        console.error('Error adding lead:', error);
        alert('Error adding property to leads. Please try again.');
    }
}
