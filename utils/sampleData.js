
const client = require('../database/connection');

const sampleProperties = [
  {
    address: "800 Ward Ave, Honolulu, HI 96814",
    zip: "96814",
    property_type: "Multi-family",
    units: 4,
    sqft: 3000,
    lot_size: 5000,
    price: 1650000,
    zoning: "BMX-3",
    distress_status: "Short Sale",
    tenure: "Fee Simple",
    distance_from_hnl: 4.8,
    str_revenue: 175200,
    str_roi: 7.8,
    owner_name: "John Doe",
    owner_contact: "808-555-1234",
    photos: ["https://maps.googleapis.com/.../streetview"],
    source: "PropStream"
  },
  {
    address: "1234 Ala Moana Blvd, Honolulu, HI 96814",
    zip: "96814",
    property_type: "Condo",
    units: 1,
    sqft: 1200,
    lot_size: null,
    price: 850000,
    zoning: "A-2",
    distress_status: "Pre-foreclosure",
    tenure: "Fee Simple",
    distance_from_hnl: 3.2,
    str_revenue: 72000,
    str_roi: 6.5,
    owner_name: "Jane Smith",
    owner_contact: "808-555-5678",
    photos: [],
    source: "Public Records"
  },
  {
    address: "567 Kapiolani Blvd, Honolulu, HI 96815",
    zip: "96815",
    property_type: "Single-family",
    units: 1,
    sqft: 2100,
    lot_size: 7500,
    price: 1200000,
    zoning: "R-5",
    distress_status: "Vacant",
    tenure: "Fee Simple",
    distance_from_hnl: 5.1,
    str_revenue: 96000,
    str_roi: 5.2,
    owner_name: "Bob Johnson",
    owner_contact: "808-555-9999",
    photos: [],
    source: "Drive by"
  },
  {
    address: "2468 King St, Honolulu, HI 96826",
    zip: "96826",
    property_type: "Multi-family",
    units: 2,
    sqft: 1800,
    lot_size: 6000,
    price: 950000,
    zoning: "X-2",
    distress_status: "Estate Sale",
    tenure: "Fee Simple",
    distance_from_hnl: 7.2,
    str_revenue: 84000,
    str_roi: 6.8,
    owner_name: "Mary Wilson",
    owner_contact: "808-555-2222",
    photos: [],
    source: "MLS"
  },
  {
    address: "1357 Beretania St, Honolulu, HI 96813",
    zip: "96813",
    property_type: "Commercial",
    units: null,
    sqft: 4500,
    lot_size: 8000,
    price: 2200000,
    zoning: "BMX-3",
    distress_status: "Pre-foreclosure",
    tenure: "Fee Simple",
    distance_from_hnl: 6.5,
    str_revenue: 180000,
    str_roi: 5.9,
    owner_name: "Pacific Holdings LLC",
    owner_contact: "808-555-3333",
    photos: [],
    source: "Public Records"
  }
];

async function insertSampleData() {
  try {
    console.log('Inserting sample properties...');
    for (const property of sampleProperties) {
      await client.execute({
        sql: `INSERT INTO properties (
          address, zip, property_type, units, sqft, lot_size, price,
          zoning, distress_status, tenure, distance_from_hnl,
          str_revenue, str_roi, owner_name, owner_contact, photos, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          property.address, property.zip, property.property_type, 
          property.units, property.sqft, property.lot_size, property.price,
          property.zoning, property.distress_status, property.tenure, 
          property.distance_from_hnl, property.str_revenue, property.str_roi,
          property.owner_name, property.owner_contact, 
          JSON.stringify(property.photos), property.source
        ]
      });
    }
    console.log('Sample data inserted successfully!');
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
}

if (require.main === module) {
  insertSampleData();
}

module.exports = { insertSampleData };
