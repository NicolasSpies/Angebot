import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database.sqlite');

const db = new Database(dbPath, { verbose: console.log });

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
        billing_cycle TEXT DEFAULT 'one_time',
        default_selected INTEGER DEFAULT 0,
        dependency_rule TEXT,
        active INTEGER DEFAULT 1,
        deleted_at DATETIME
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
        vat_number TEXT,
        deleted_at DATETIME
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
        deleted_at DATETIME,
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

    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        offer_id INTEGER UNIQUE,
        customer_id INTEGER,
        name TEXT,
        status TEXT DEFAULT 'todo',
        deadline DATETIME,
        internal_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (offer_id) REFERENCES offers(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        title TEXT,
        description TEXT,
        status TEXT DEFAULT 'todo',
        due_date DATETIME,
        priority TEXT DEFAULT 'medium',
        completed INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
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
    'ALTER TABLE offer_items ADD COLUMN billing_cycle TEXT;',
    // Projects & Tasks
    'ALTER TABLE offers ADD COLUMN internal_notes TEXT;',
    'ALTER TABLE projects ADD COLUMN deleted_at DATETIME;',
    'ALTER TABLE offers ADD COLUMN deleted_at DATETIME;',
    'ALTER TABLE customers ADD COLUMN deleted_at DATETIME;',
    'ALTER TABLE services ADD COLUMN deleted_at DATETIME;',
    'ALTER TABLE packages ADD COLUMN deleted_at DATETIME;',
    // Custom Packages
    `CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        discount_type TEXT DEFAULT 'percent',
        discount_value REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
    );`,
    `CREATE TABLE IF NOT EXISTS package_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        package_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        variant_name TEXT,
        discount_percent REAL DEFAULT 0,
        FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
    );`,
    'ALTER TABLE packages ADD COLUMN discount_type TEXT DEFAULT \'percent\';',
    'ALTER TABLE packages ADD COLUMN discount_value REAL DEFAULT 0;',
    'ALTER TABLE package_items ADD COLUMN discount_percent REAL DEFAULT 0;',
    // Notifications System
    `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        link TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);',
    'ALTER TABLE services ADD COLUMN billing_cycle TEXT DEFAULT "one_time";',
    // Notification dedup
    'ALTER TABLE notifications ADD COLUMN dedup_key TEXT;',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup ON notifications(dedup_key);',
    // Strategic notes field for offers (reuse internal_notes, add strategic_notes as alias)
    'ALTER TABLE offers ADD COLUMN strategic_notes TEXT;',
];

migrations.forEach(sql => {
    try {
        db.prepare(sql).run();
    } catch (e) {
        // Column already exists, ignore
    }
});

// Optimization: Add Indices for Performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_offers_customer_id ON offers(customer_id);
  CREATE INDEX IF NOT EXISTS idx_offer_items_offer_id ON offer_items(offer_id);
  CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
  CREATE INDEX IF NOT EXISTS idx_projects_offer_id ON projects(offer_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
`);

console.log('Database initialized with indices');
export default db;
