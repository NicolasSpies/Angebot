import db from './db.js';

const mockServices = [
    { category: 'Web', name_de: 'Site Web Standard', name_fr: 'Site Web Standard', description_de: 'Standard-Website mit CMS.', description_fr: 'Site web standard avec CMS.', price: 2500, unit_type: 'Project', default_selected: 1 },
    { category: 'Web', name_de: 'E-Commerce Upgrade', name_fr: 'Upgrade E-Commerce', description_de: 'Shop-Funktionalität.', description_fr: 'Fonctionnalité de boutique.', price: 1500, unit_type: 'Project', default_selected: 0 },
    { category: 'Maintenance', name_de: 'Hébergement Standard', name_fr: 'Hébergement Standard', description_de: 'Hosting und Domain.', description_fr: 'Hébergement et domaine.', price: 150, unit_type: 'Year', default_selected: 1 },
    { category: 'Marketing', name_de: 'SEO Einmalig', name_fr: 'SEO Unique', description_de: 'Grundlegende SEO-Optimierung.', description_fr: 'Optimisation SEO de base.', price: 800, unit_type: 'Project', default_selected: 0 },
    { category: 'Design', name_de: 'Logo Design', name_fr: 'Design de Logo', description_de: 'Inklusive 3 Revisionen.', description_fr: 'Inclut 3 révisions.', price: 600, unit_type: 'Project', default_selected: 0 }
];

const mockCustomers = [
    { company_name: 'Tech Solutions GmbH', language: 'de', country: 'DE', vat_number: 'DE123456789' },
    { company_name: 'Agence de Lyon', language: 'fr', country: 'FR', vat_number: 'FR987654321' }
];

const seed = () => {
    // Check if seeded already
    const count = db.prepare('SELECT count(*) as count FROM services').get();
    if (count.count > 0) {
        console.log('Database already contains data. Skipping seed.');
        return;
    }

    const insertService = db.prepare(`
        INSERT INTO services (category, name_de, name_fr, description_de, description_fr, price, unit_type, default_selected)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const s of mockServices) {
        insertService.run(s.category, s.name_de, s.name_fr, s.description_de, s.description_fr, s.price, s.unit_type, s.default_selected);
    }

    const insertCustomer = db.prepare(`
        INSERT INTO customers (company_name, language, country, vat_number)
        VALUES (?, ?, ?, ?)
    `);

    for (const c of mockCustomers) {
        insertCustomer.run(c.company_name, c.language, c.country, c.vat_number);
    }

    console.log('Seeding completed.');
};

seed();
