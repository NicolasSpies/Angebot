import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database.sqlite');

const db = new Database(dbPath, { verbose: console.log });

// Enable performance and stability optimizations
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

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
        revision_limit INTEGER,
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
    // Signature fields
    'ALTER TABLE offers ADD COLUMN signed_by_name TEXT;',
    'ALTER TABLE offers ADD COLUMN signed_by_email TEXT;',
    'ALTER TABLE offers ADD COLUMN signature_data TEXT;',
    'ALTER TABLE offers ADD COLUMN signed_ip TEXT;',
    'ALTER TABLE offers ADD COLUMN signed_pdf_url TEXT;',
    'ALTER TABLE offers ADD COLUMN declined_at DATETIME;',
    // Project enhancements
    'ALTER TABLE projects ADD COLUMN priority TEXT DEFAULT \'medium\';',
    'ALTER TABLE projects ADD COLUMN strategic_notes TEXT;',
    `CREATE TABLE IF NOT EXISTS project_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        event_type TEXT, -- 'status_change', 'deadline_update', 'note_added'
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );`,
    'CREATE INDEX IF NOT EXISTS idx_project_events_project_id ON project_events(project_id);',
    // Global Activity Log
    `CREATE TABLE IF NOT EXISTS global_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL, -- 'offer', 'project', 'customer'
        entity_id INTEGER NOT NULL,
        action TEXT NOT NULL, -- 'created', 'updated', 'status_change', 'linked', etc.
        metadata TEXT, -- JSON string for extra details (e.g. { oldStatus: 'draft', newStatus: 'sent' })
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    'CREATE INDEX IF NOT EXISTS idx_global_activities_entity ON global_activities(entity_type, entity_id);',
    'CREATE INDEX IF NOT EXISTS idx_global_activities_created_at ON global_activities(created_at);',
    'ALTER TABLE offers ADD COLUMN parent_id INTEGER;',
    'ALTER TABLE offers ADD COLUMN version_number INTEGER DEFAULT 1;',
    'ALTER TABLE offers ADD COLUMN is_template INTEGER DEFAULT 0;',
    'ALTER TABLE offers ADD COLUMN archived_at DATETIME;',
    'ALTER TABLE projects ADD COLUMN archived_at DATETIME;',
    'ALTER TABLE customers ADD COLUMN archived_at DATETIME;',
    'ALTER TABLE services ADD COLUMN archived_at DATETIME;',
    'ALTER TABLE packages ADD COLUMN archived_at DATETIME;',
    'ALTER TABLE offers ADD COLUMN created_by TEXT;',
    'ALTER TABLE offers ADD COLUMN updated_by TEXT;',
    'ALTER TABLE projects ADD COLUMN created_by TEXT;',
    'ALTER TABLE projects ADD COLUMN updated_by TEXT;',
    'ALTER TABLE customers ADD COLUMN created_by TEXT;',
    'ALTER TABLE customers ADD COLUMN updated_by TEXT;',
    'ALTER TABLE services ADD COLUMN created_by TEXT;',
    'ALTER TABLE services ADD COLUMN updated_by TEXT;',
    'ALTER TABLE global_activities ADD COLUMN created_by TEXT;',
    'ALTER TABLE global_activities ADD COLUMN updated_by TEXT;',
    `CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL, -- 'offer', 'project'
        entity_id INTEGER NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT
    );`,
    'CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);',
    // --- REVIEW SYSTEM (Phase 1) ---
    `CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        current_version_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS review_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id INTEGER,
        project_id INTEGER, -- Legacy field for migration compatibility
        file_url TEXT,
        compressed_file_url TEXT,
        file_size_original INTEGER,
        file_size_compressed INTEGER,
        version_number INTEGER DEFAULT 1,
        status TEXT DEFAULT 'open', -- 'open', 'changes_requested', 'approved', 'superseded'
        token TEXT UNIQUE,
        is_token_active INTEGER DEFAULT 1,
        approved_at DATETIME,
        approved_by_name TEXT,
        approved_by_email TEXT,
        pin_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS review_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version_id INTEGER NOT NULL,
        page_number INTEGER NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        width REAL,
        height REAL,
        type TEXT DEFAULT 'comment', -- 'comment', 'highlight', 'strike'
        content TEXT,
        author_name TEXT,
        author_email TEXT,
        is_resolved INTEGER DEFAULT 0,
        resolved_at DATETIME,
        resolved_by TEXT,
        parent_id INTEGER,
        screenshot_url TEXT,
        created_by TEXT, -- For internal users
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        annotation_data TEXT, -- For structured JSON (freehand, highlight, etc.)
        FOREIGN KEY (version_id) REFERENCES review_versions(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS review_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        review_id INTEGER NOT NULL,
        version_id INTEGER NOT NULL,
        action_type TEXT NOT NULL, -- 'approve', 'request_changes'
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (version_id) REFERENCES review_versions(id) ON DELETE CASCADE
    );`,
    'ALTER TABLE reviews ADD COLUMN token TEXT;',
    'ALTER TABLE reviews ADD COLUMN is_token_active INTEGER DEFAULT 1;',
    'ALTER TABLE review_comments ADD COLUMN annotation_data TEXT;',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_token ON reviews(token);',
    'CREATE INDEX IF NOT EXISTS idx_review_actions_review_id ON review_actions(review_id);',
    'CREATE INDEX IF NOT EXISTS idx_reviews_project_id ON reviews(project_id);',
    'CREATE INDEX IF NOT EXISTS idx_review_versions_review_id ON review_versions(review_id);',
    // Data Cleanup: Ensure only one review per project
    `DELETE FROM reviews WHERE id NOT IN(SELECT MIN(id) FROM reviews GROUP BY project_id); `,
    // Data Sync: Ensure project_id in review_versions is correct
    `UPDATE review_versions SET review_id = (SELECT id FROM reviews WHERE reviews.project_id = review_versions.project_id) WHERE review_id IS NULL; `,
    // New Advanced Review System Columns
    'ALTER TABLE reviews ADD COLUMN status TEXT DEFAULT \'draft\';',
    'ALTER TABLE reviews ADD COLUMN review_limit INTEGER;',
    'ALTER TABLE reviews ADD COLUMN review_count_used INTEGER DEFAULT 0;',
    'ALTER TABLE reviews ADD COLUMN revisions_used INTEGER DEFAULT 0;',
    'ALTER TABLE reviews ADD COLUMN review_policy TEXT DEFAULT \'soft\';',
    'ALTER TABLE reviews ADD COLUMN unread_count INTEGER DEFAULT 0;',
    'ALTER TABLE projects ADD COLUMN revision_limit INTEGER;',
    'ALTER TABLE projects ADD COLUMN review_limit INTEGER;',
    'ALTER TABLE reviews ADD COLUMN current_version_id INTEGER;',
    'ALTER TABLE reviews ADD COLUMN updated_at DATETIME;',
    'UPDATE reviews SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;',
    'ALTER TABLE review_comments ADD COLUMN version_id INTEGER;',
    'UPDATE review_comments SET version_id = (SELECT current_version_id FROM reviews WHERE reviews.id = review_comments.review_id) WHERE version_id IS NULL;',
    'CREATE INDEX IF NOT EXISTS idx_review_comments_version_id ON review_comments(version_id);',
    'ALTER TABLE review_versions ADD COLUMN compressed_size_bytes INTEGER;',
    'ALTER TABLE review_versions ADD COLUMN original_size_bytes INTEGER;',
    'ALTER TABLE review_versions ADD COLUMN compression_ratio REAL;',
    'ALTER TABLE review_versions ADD COLUMN last_accessed_at DATETIME;',
    'ALTER TABLE review_versions ADD COLUMN retention_expires_at DATETIME;',
    'ALTER TABLE review_versions ADD COLUMN is_active INTEGER DEFAULT 1;',
    'ALTER TABLE review_versions ADD COLUMN is_pinned INTEGER DEFAULT 0;',
    'ALTER TABLE review_versions ADD COLUMN file_deleted INTEGER DEFAULT 0;',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_offers_token ON offers(token);',
    'ALTER TABLE reviews ADD COLUMN deleted_at DATETIME;',
    'CREATE INDEX IF NOT EXISTS idx_reviews_deleted_at ON reviews(deleted_at);',
];

migrations.forEach(sql => {
    try {
        db.prepare(sql).run();
    } catch (e) {
        // If it's just "column already exists", we can safely ignore
        if (!e.message.includes('duplicate column name') && !e.message.includes('already exists')) {
            console.error(`[Migration Error] Failed to run: ${sql} `);
            console.error(e);
        }
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
