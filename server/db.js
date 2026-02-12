import Database from 'better-sqlite3';
import { join } from 'path';

const db = new Database('database.sqlite', { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1), -- Singleton record
        company_name TEXT,
        address TEXT,
        vat_number TEXT,
        logo_url TEXT,
        email TEXT,
        phone TEXT,
        website TEXT,
        default_currency TEXT DEFAULT 'EUR',
        default_vat_rules TEXT,
        default_payment_terms TEXT
    );

    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,
        name_de TEXT,
        name_fr TEXT,
        description_de TEXT,
        description_fr TEXT,
        price REAL,
        cost_price REAL DEFAULT 0,
        unit_type TEXT,
        default_selected INTEGER DEFAULT 0,
        dependency_rule TEXT,
        active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        postal_code TEXT,
        language TEXT,
        country TEXT,
        vat_number TEXT
    );

    CREATE TABLE IF NOT EXISTS offers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        offer_name TEXT,
        language TEXT,
        status TEXT DEFAULT 'draft',
        subtotal REAL,
        vat REAL,
        total REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME,
        signed_at DATETIME,
        token TEXT UNIQUE,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS offer_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offer_id INTEGER,
        service_id INTEGER,
        quantity REAL,
        unit_price REAL,
        total_price REAL,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(id)
    );

    CREATE TABLE IF NOT EXISTS offer_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offer_id INTEGER,
        event_type TEXT, -- 'viewed', 'signed', 'declined'
        comment TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
    );

    -- Seed settings if not exists
    INSERT OR IGNORE INTO settings (id, company_name) VALUES (1, 'My Agency');
`);

// Simple migrations for existing tables
const migrations = [
    'ALTER TABLE services ADD COLUMN cost_price REAL DEFAULT 0;',
    'ALTER TABLE customers ADD COLUMN first_name TEXT;',
    'ALTER TABLE customers ADD COLUMN last_name TEXT;',
    'ALTER TABLE customers ADD COLUMN email TEXT;',
    'ALTER TABLE customers ADD COLUMN phone TEXT;',
    'ALTER TABLE customers ADD COLUMN address TEXT;',
    'ALTER TABLE customers ADD COLUMN city TEXT;',
    'ALTER TABLE customers ADD COLUMN postal_code TEXT;',
    'ALTER TABLE settings ADD COLUMN phone TEXT;',
    'ALTER TABLE settings ADD COLUMN website TEXT;',
    'ALTER TABLE offers ADD COLUMN offer_name TEXT;',
    'ALTER TABLE offers ADD COLUMN due_date DATETIME;',
    'ALTER TABLE settings ADD COLUMN default_validity_days INTEGER DEFAULT 14;',
    // Service Variants
    `CREATE TABLE IF NOT EXISTS service_variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        name_de TEXT,
        name_fr TEXT,
        price REAL NOT NULL,
        description TEXT,
        cost_price REAL DEFAULT 0,
        billing_cycle TEXT DEFAULT 'one_time',
        is_default INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        FOREIGN KEY(service_id) REFERENCES services(id) ON DELETE CASCADE
    );`,
    // Offer Item Snapshotting
    'ALTER TABLE offer_items ADD COLUMN item_name TEXT;',
    'ALTER TABLE offer_items ADD COLUMN item_description TEXT;',
    'ALTER TABLE offer_items ADD COLUMN billing_cycle TEXT;'
];

migrations.forEach(sql => {
    try {
        db.prepare(sql).run();
    } catch (e) {
        // Column already exists, ignore
    }
});

export default db;
