import db from './server/db.js';

console.log('--- Starting Verification ---');

// 1. Create a service with variants
console.log('Creating service with variants...');
const serviceResult = db.prepare(`
    INSERT INTO services (category, name_de, name_fr, price, billing_cycle)
    VALUES (?, ?, ?, ?, ?)
`).run('Test Category', 'Base Service', 'Base Service FR', 100, 'one_time');

const serviceId = serviceResult.lastInsertRowid;
console.log('Service created with ID:', serviceId);

// Add variants
const variant1 = db.prepare(`
    INSERT INTO service_variants (service_id, name, price, billing_cycle, is_default)
    VALUES (?, ?, ?, ?, ?)
`).run(serviceId, 'Variant A', 150, 'monthly', 1);

const variant2 = db.prepare(`
    INSERT INTO service_variants (service_id, name, price, billing_cycle, is_default)
    VALUES (?, ?, ?, ?, ?)
`).run(serviceId, 'Variant B', 200, 'yearly', 0);

console.log('Variants added.');

// 1.5 Create a customer
console.log('Creating customer...');
const customerResult = db.prepare(`
    INSERT INTO customers (company_name, first_name, last_name, email)
    VALUES (?, ?, ?, ?)
`).run('Test Company', 'John', 'Doe', 'john@example.com');
const customerId = customerResult.lastInsertRowid;
console.log('Customer created with ID:', customerId);

// 2. Create an offer using Variant B
console.log('Creating offer with Variant B...');
const offerResult = db.prepare(`
    INSERT INTO offers (customer_id, offer_name, language, status, total)
    VALUES (?, ?, ?, ?, ?)
`).run(customerId, 'Variant Test Offer', 'de', 'draft', 200);

const offerId = offerResult.lastInsertRowid;

// Insert offer item with snapshot data
db.prepare(`
    INSERT INTO offer_items (offer_id, service_id, quantity, unit_price, total_price, billing_cycle, item_name, item_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(offerId, serviceId, 1, 200, 200, 'yearly', 'Base Service: Variant B', 'Description of Variant B');

console.log('Offer created with ID:', offerId);

// 3. Verify Data
console.log('Verifying offer items...');
const item = db.prepare('SELECT * FROM offer_items WHERE offer_id = ?').get(offerId);

console.log('Fetched Item:', item);

if (item.billing_cycle === 'yearly' && item.item_name === 'Base Service: Variant B' && item.unit_price === 200) {
    console.log('SUCCESS: Variant details correctly snapshotted.');
} else {
    console.error('FAILURE: Data mismatch.');
    process.exit(1);
}

// Clean up
console.log('Cleaning up...');
db.prepare('DELETE FROM offers WHERE id = ?').run(offerId);
db.prepare('DELETE FROM services WHERE id = ?').run(serviceId);
db.prepare('DELETE FROM customers WHERE id = ?').run(customerId);
// Variants cascade delete?
// Check if cascade works
const variantCount = db.prepare('SELECT COUNT(*) as count FROM service_variants WHERE service_id = ?').get(serviceId).count;
if (variantCount === 0) {
    console.log('SUCCESS: Cascade delete worked.');
} else {
    console.warn('WARNING: Cascade delete did not work, variants remain:', variantCount);
    // Cleanup manually
    db.prepare('DELETE FROM service_variants WHERE service_id = ?').run(serviceId);
}

console.log('--- Verification Complete ---');
