import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new Database(dbPath);

console.log('Repairing database schema (Correcting Foreign Keys - TAKE 2)...');

try {
    db.pragma('foreign_keys = OFF');

    // Check if backups exist
    const hasBackups = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reviews_backup'").get();
    if (!hasBackups) {
        console.log('Backups not found. Creating fresh backups...');
        db.exec('CREATE TABLE reviews_backup AS SELECT * FROM reviews');
        db.exec('CREATE TABLE review_versions_backup AS SELECT * FROM review_versions');
        db.exec('CREATE TABLE review_comments_backup AS SELECT * FROM review_comments');
    } else {
        console.log('Using existing backups');
    }

    // 2. Drop existing tables
    db.exec('DROP TABLE IF EXISTS review_comments');
    db.exec('DROP TABLE IF EXISTS review_versions');
    db.exec('DROP TABLE IF EXISTS reviews');

    // 3. Recreate reviews
    db.exec(`
        CREATE TABLE reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            title TEXT,
            status TEXT DEFAULT 'draft',
            review_limit INTEGER DEFAULT 3,
            revisions_used INTEGER DEFAULT 0,
            review_policy TEXT DEFAULT 'soft',
            unread_count INTEGER DEFAULT 0,
            current_version_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT,
            review_count_used INTEGER DEFAULT 0,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    `);

    // 4. Recreate review_versions
    db.exec(`
        CREATE TABLE review_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            review_id INTEGER,
            project_id INTEGER,
            file_url TEXT,
            compressed_file_url TEXT,
            file_size_original INTEGER,
            file_size_compressed INTEGER,
            version_number INTEGER DEFAULT 1,
            status TEXT DEFAULT 'open',
            token TEXT UNIQUE,
            is_token_active INTEGER DEFAULT 1,
            approved_at DATETIME,
            approved_by_name TEXT,
            approved_by_email TEXT,
            pin_code TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT,
            FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
        )
    `);

    // 5. Recreate review_comments (Make version_id NULLABLE for migration)
    db.exec(`
        CREATE TABLE review_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version_id INTEGER, -- Made nullable
            review_id INTEGER,
            page_number INTEGER NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            width REAL,
            height REAL,
            type TEXT DEFAULT 'comment',
            content TEXT,
            author_name TEXT,
            author_email TEXT,
            is_resolved INTEGER DEFAULT 0,
            resolved_at DATETIME,
            resolved_by TEXT,
            parent_id INTEGER,
            screenshot_url TEXT,
            created_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (version_id) REFERENCES review_versions(id) ON DELETE CASCADE
        )
    `);

    console.log('Migrating data back...');

    // Migrate reviews
    const reviews = db.prepare('SELECT * FROM reviews_backup').all();
    for (const r of reviews) {
        db.prepare(`
            INSERT INTO reviews (id, project_id, title, status, review_limit, revisions_used, review_policy, unread_count, current_version_id, created_at, updated_at, created_by, review_count_used)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(r.id, r.project_id, r.title, r.status, r.review_limit, r.revisions_used, r.review_policy, r.unread_count, r.current_version_id, r.created_at, r.updated_at, r.created_by, r.review_count_used);
    }

    // Migrate versions
    const versions = db.prepare('SELECT * FROM review_versions_backup').all();
    for (const v of versions) {
        db.prepare(`
            INSERT INTO review_versions (id, review_id, project_id, file_url, compressed_file_url, file_size_original, file_size_compressed, version_number, status, token, is_token_active, approved_at, approved_by_name, approved_by_email, pin_code, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(v.id, v.review_id, v.project_id, v.file_url, v.compressed_file_url, v.file_size_original, v.file_size_compressed, v.version_number, v.status, v.token, v.is_token_active, v.approved_at, v.approved_by_name, v.approved_by_email, v.pin_code, v.created_at, v.created_by);
    }

    // Migrate comments
    const comments = db.prepare('SELECT * FROM review_comments_backup').all();
    for (const c of comments) {
        db.prepare(`
            INSERT INTO review_comments (id, version_id, review_id, page_number, x, y, width, height, type, content, author_name, author_email, is_resolved, resolved_at, resolved_by, parent_id, screenshot_url, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(c.id, c.version_id, c.review_id, c.page_number, c.x, c.y, c.width, c.height, c.type, c.content, c.author_name, c.author_email, c.is_resolved, c.resolved_at, c.resolved_by, c.parent_id, c.screenshot_url, c.created_by, c.created_at);
    }

    console.log('Database restored successfully');

    // 7. Cleanup
    db.exec('DROP TABLE reviews_backup');
    db.exec('DROP TABLE review_versions_backup');
    db.exec('DROP TABLE review_comments_backup');

} catch (err) {
    console.error('Repair failed:', err);
} finally {
    db.pragma('foreign_keys = ON');
    db.close();
}
