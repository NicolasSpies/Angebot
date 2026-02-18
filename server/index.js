import express from 'express';
import cors from 'cors';
import db from './db.js';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

// --- GLOBAL REQUEST LOGGER ---
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
});

// --- DEFENSIVE TIMEOUT MIDDLEWARE ---
app.use('/api', (req, res, next) => {
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            console.error(`[TIMEOUT] Request hanging: ${req.method} ${req.url}`);
            res.status(504).json({
                error: 'Request Timeout',
                message: 'The server took too long to respond. Please try again.'
            });
        }
    }, 5000); // 5 second timeout
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    next();
});

app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', version: '1.0.1-phase3', time: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
    try {
        db.prepare('SELECT 1').get();
        res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// --- REMINDERS BACKGROUND JOB ---
function checkReminders() {
    console.log('[Background] Checking for reminders...');
    try {
        // 1. Expiring Offers (in 3 days)
        const expiringOffers = db.prepare(`
            SELECT o.id, o.offer_name, c.company_name, o.due_date 
            FROM offers o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.status = 'sent' 
            AND o.due_date = date('now', '+3 days')
        `).all();

        expiringOffers.forEach(off => {
            const dedupKey = `reminder_expiring_${off.id}_${off.due_date}`;
            createNotification(
                'warning',
                'Offer Expiring',
                `The offer "${off.offer_name}" for ${off.company_name} expires in 3 days.`,
                `/offers/${off.id}`,
                dedupKey
            );
        });

        // 2. Overdue Projects
        const overdueProjects = db.prepare(`
            SELECT p.id, p.name, c.company_name, p.deadline
            FROM projects p
            JOIN customers c ON p.customer_id = c.id
            WHERE p.status IN ('todo', 'in_progress', 'feedback')
            AND p.deadline < date('now')
        `).all();

        overdueProjects.forEach(proj => {
            const dedupKey = `reminder_overdue_${proj.id}_${proj.deadline}`;
            createNotification(
                'danger',
                'Project Overdue',
                `Project "${proj.name}" for ${proj.company_name} is overdue.`,
                `/projects/${proj.id}`,
                dedupKey
            );
        });

        console.log(`[Background] Check complete. Expiring: ${expiringOffers.length}, Overdue: ${overdueProjects.length}`);
        return { expiring: expiringOffers.length, overdue: overdueProjects.length };
    } catch (err) {
        console.error('[Background] Reminder check failed:', err);
        return { expiring: 0, overdue: 0 };
    }
}

// --- NOTIFICATION HELPER (with dedup) ---
function createNotification(type, title, message, link, dedupKey) {
    try {
        if (dedupKey) {
            db.prepare(`
                INSERT OR IGNORE INTO notifications (type, title, message, link, dedup_key)
                VALUES (?, ?, ?, ?, ?)
            `).run(type, title, message || null, link || null, dedupKey);
        } else {
            db.prepare(`
                INSERT INTO notifications (type, title, message, link)
                VALUES (?, ?, ?, ?)
            `).run(type, title, message || null, link || null);
        }
    } catch (err) {
        console.error('Failed to create notification:', err);
    }
}

// --- ACTIVITY LOG HELPER ---

function logActivity(entityType, entityId, action, metadata = {}) {
    try {
        db.prepare(`
            INSERT INTO global_activities (entity_type, entity_id, action, metadata)
            VALUES (?, ?, ?, ?)
        `).run(entityType, entityId, action, JSON.stringify(metadata));
    } catch (err) {
        console.error('Failed to log activity:', err);
    }
}

function saveBase64Image(base64Data, subDir = 'screenshots') {
    if (!base64Data || !base64Data.startsWith('data:image')) return null;

    try {
        const dir = path.join(__dirname, '../uploads', subDir);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const format = base64Data.split(';')[0].split('/')[1];
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${format}`;
        const filePath = path.join(dir, fileName);
        const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        fs.writeFileSync(filePath, buffer);
        return `/uploads/${subDir}/${fileName}`;
    } catch (err) {
        console.error('Failed to save base64 image:', err);
        return null;
    }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- ACTIVITY API ---
app.get('/api/activities', (req, res) => {
    try {
        const { limit = 50, entityType, entityId } = req.query;
        let query = 'SELECT * FROM global_activities';
        const params = [];

        if (entityType) {
            query += ' WHERE entity_type = ?';
            params.push(entityType);
            if (entityId) {
                query += ' AND entity_id = ?';
                params.push(entityId);
            }
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const activities = db.prepare(query).all(...params);
        res.json(activities.map(a => ({
            ...a,
            metadata: JSON.parse(a.metadata || '{}')
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/activities', (req, res) => {
    const { entityType, entityId, action, metadata } = req.body;
    try {
        logActivity(entityType, entityId, action, metadata);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- NOTIFICATIONS API ---
app.get('/api/notifications', (req, res) => {
    try {
        const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all();
        const unreadResult = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get();
        const unreadCount = unreadResult ? unreadResult.count : 0;
        res.json({ notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/:id/read', (req, res) => {
    try {
        db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/notifications/read-all', (req, res) => {
    try {
        db.prepare('UPDATE notifications SET is_read = 1').run();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/notifications/clear-all', (req, res) => {
    try {
        db.prepare('DELETE FROM notifications').run();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/notifications/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CHECK EXPIRING OFFERS & PROJECTS ---
app.get('/api/notifications/check-expiring', (req, res) => {
    try {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
        const todayStr = now.toISOString();

        // Offers with validity <= 3 days away that are NOT signed/declined/draft
        const expiringOffers = db.prepare(`
            SELECT id, offer_name, due_date FROM offers
            WHERE due_date IS NOT NULL
              AND due_date <= ?
              AND due_date >= ?
              AND status NOT IN ('signed', 'declined', 'draft')
              AND deleted_at IS NULL
        `).all(threeDaysFromNow, todayStr);

        for (const offer of expiringOffers) {
            const daysLeft = Math.ceil((new Date(offer.due_date) - now) / (1000 * 60 * 60 * 24));
            createNotification(
                'warning',
                'Offer Expiring Soon ⏰',
                `"${offer.offer_name}" expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
                `/offer/preview/${offer.id}`,
                `offer_expiring_${offer.id}_${offer.due_date}`
            );
        }

        // Projects with deadline <= 3 days away that are NOT done
        const urgentProjects = db.prepare(`
            SELECT id, name, deadline FROM projects
            WHERE deadline IS NOT NULL
              AND deadline <= ?
              AND deadline >= ?
              AND status NOT IN ('done', 'completed', 'cancelled')
              AND deleted_at IS NULL
        `).all(threeDaysFromNow, todayStr);

        for (const project of urgentProjects) {
            const daysLeft = Math.ceil((new Date(project.deadline) - now) / (1000 * 60 * 60 * 24));
            createNotification(
                'warning',
                'Project Due Soon 🔥',
                `"${project.name}" is due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
                `/projects/${project.id}`,
                `project_due_${project.id}_${project.deadline}`
            );
        }

        res.json({
            checked: expiringOffers.length + urgentProjects.length,
            expiring: expiringOffers.length,
            urgent: urgentProjects.length
        });
    } catch (err) {
        console.error('[API] /api/notifications/check-expiring failed:', err);
        res.status(500).json({ error: err.message });
    }
});

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|svg|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg, .svg and .pdf format allowed!'));
    }
});

app.post('/api/upload', upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'file', maxCount: 1 }]), (req, res) => {
    const files = req.files;
    const file = (files?.logo?.[0]) || (files?.file?.[0]);

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    res.json({
        url: fileUrl,
        filePath: `/uploads/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype
    });
});

// --- SETTINGS ---
app.get('/api/settings', (req, res) => {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json(settings);
});

app.put('/api/settings', (req, res) => {
    const { company_name, address, vat_number, logo_url, email, default_currency, default_vat_rules, default_payment_terms, default_hourly_rate, work_categories, phone, website, default_validity_days } = req.body;
    db.prepare(`
        UPDATE settings SET 
            company_name = ?, address = ?, vat_number = ?, logo_url = ?, 
            email = ?, default_currency = ?, default_vat_rules = ?, default_payment_terms = ?,
            default_hourly_rate = ?, work_categories = ?, phone = ?, website = ?, default_validity_days = ?
        WHERE id = 1
    `).run(company_name, address, vat_number, logo_url, email, default_currency, default_vat_rules, default_payment_terms, default_hourly_rate, work_categories, phone, website, default_validity_days);
    res.json({ success: true });
});

// --- SERVICES ---
app.get('/api/services', (req, res) => {
    const services = db.prepare('SELECT * FROM services WHERE deleted_at IS NULL').all();
    const variants = db.prepare('SELECT * FROM service_variants WHERE active = 1').all();

    const servicesWithVariants = services.map(s => ({
        ...s,
        variants: variants.filter(v => v.service_id === s.id)
    }));

    res.json(servicesWithVariants);
});

app.post('/api/services', (req, res) => {
    const { category, name_de, name_fr, description_de, description_fr, price, unit_type, default_selected, billing_cycle, variants } = req.body;

    const transaction = db.transaction(() => {
        const result = db.prepare(`
            INSERT INTO services (category, name_de, name_fr, description_de, description_fr, price, unit_type, default_selected, billing_cycle)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(category, name_de, name_fr, description_de, description_fr, price, unit_type, default_selected ? 1 : 0, billing_cycle || 'one_time');

        const serviceId = result.lastInsertRowid;

        if (variants && Array.isArray(variants)) {
            const insertVariant = db.prepare(`
                INSERT INTO service_variants (service_id, name, name_de, name_fr, price, description, cost_price, billing_cycle, is_default, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const v of variants) {
                insertVariant.run(
                    serviceId,
                    v.name || '',
                    v.name_de || v.name || '',
                    v.name_fr || v.name || '',
                    v.price || 0,
                    v.description || '',
                    v.cost_price || 0,
                    v.billing_cycle || 'one_time',
                    v.is_default ? 1 : 0,
                    v.active !== undefined ? (v.active ? 1 : 0) : 1
                );
            }
        }
        return serviceId;
    });

    try {
        const id = transaction();
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/services/:id', (req, res) => {
    const { category, name_de, name_fr, description_de, description_fr, price, unit_type, default_selected, active, billing_cycle, variants } = req.body;
    const serviceId = req.params.id;

    const transaction = db.transaction(() => {
        db.prepare(`
            UPDATE services SET 
                category = ?, name_de = ?, name_fr = ?, description_de = ?, description_fr = ?, 
                price = ?, unit_type = ?, default_selected = ?, active = ?, billing_cycle = ?
            WHERE id = ?
        `).run(category, name_de, name_fr, description_de, description_fr, price, unit_type, default_selected ? 1 : 0, active ? 1 : 0, billing_cycle || 'one_time', serviceId);

        // Handle variants: Strategy -> Delete all and re-insert (easiest for now, assuming no FK issues from offer_items since we use snapshotting)
        // If we wanted to be smarter we would update existing ones with IDs.
        // For now, let's try to preserve IDs if they are passed, otherwise insert.
        // Actually, simple Delete/Insert is safer for state consistency unless we need to keep history.
        db.prepare('DELETE FROM service_variants WHERE service_id = ?').run(serviceId);

        if (variants && Array.isArray(variants)) {
            const insertVariant = db.prepare(`
                INSERT INTO service_variants (service_id, name, name_de, name_fr, price, description, cost_price, billing_cycle, is_default, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            for (const v of variants) {
                insertVariant.run(
                    serviceId,
                    v.name || '',
                    v.name_de || v.name || '',
                    v.name_fr || v.name || '',
                    v.price || 0,
                    v.description || '',
                    v.cost_price || 0,
                    v.billing_cycle || 'one_time',
                    v.is_default ? 1 : 0,
                    v.active !== undefined ? (v.active ? 1 : 0) : 1
                );
            }
        }
    });

    try {
        transaction();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/services/:id', (req, res) => {
    const serviceId = req.params.id;
    try {
        db.prepare('UPDATE services SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(serviceId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CUSTOMERS ---
app.get('/api/customers', (req, res) => {
    try {
        const customers = db.prepare("SELECT * FROM customers WHERE archived_at IS NULL AND deleted_at IS NULL ORDER BY company_name ASC").all();

        // Enrich with health status
        const enrichedCustomers = customers.map(c => {
            const overdueCount = db.prepare(`
                SELECT COUNT(*) as count FROM projects 
                WHERE customer_id = ? AND status IN ('todo', 'in_progress', 'feedback') 
                AND deadline IS NOT NULL AND deadline < date('now')
            `).get(c.id).count;

            const lastSigned = db.prepare(`
                SELECT MAX(signed_at) as last FROM offers 
                WHERE customer_id = ? AND status = 'signed'
            `).get(c.id).last;

            let health = 'stable';
            if (overdueCount > 0) {
                health = 'overdue';
            } else if (!lastSigned) {
                health = 'inactive';
            } else {
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                if (new Date(lastSigned) < sixMonthsAgo) {
                    health = 'risk';
                }
            }

            return { ...c, health };
        });

        res.json(enrichedCustomers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/customers', (req, res) => {
    const { company_name, first_name, last_name, email, phone, address, city, postal_code, language, country, vat_number, portal_enabled } = req.body;
    const result = db.prepare(`
        INSERT INTO customers (company_name, first_name, last_name, email, phone, address, city, postal_code, language, country, vat_number, portal_enabled, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(company_name, first_name, last_name, email, phone, address, city, postal_code, language, country, vat_number, portal_enabled ? 1 : 0, 'System', 'System');
    logActivity('customer', result.lastInsertRowid, 'created', { name: company_name || `${first_name} ${last_name}` });
    res.json({ id: result.lastInsertRowid });
});

app.put('/api/customers/:id', (req, res) => {
    const { company_name, first_name, last_name, email, phone, address, city, postal_code, language, country, vat_number, portal_enabled } = req.body;
    db.prepare(`
        UPDATE customers SET 
            company_name = ?, first_name = ?, last_name = ?, email = ?, phone = ?, 
            address = ?, city = ?, postal_code = ?, language = ?, country = ?, 
            vat_number = ?, portal_enabled = ?, updated_by = ?
        WHERE id = ?
    `).run(
        company_name, first_name, last_name, email, phone,
        address, city, postal_code, language, country,
        vat_number, portal_enabled ? 1 : 0, 'System', req.params.id
    );
    res.json({ success: true });
});

app.delete('/api/customers/:id', (req, res) => {
    try {
        db.transaction(() => {
            db.prepare('UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE customer_id = ?').run(req.params.id);
            db.prepare('UPDATE offers SET deleted_at = CURRENT_TIMESTAMP WHERE customer_id = ?').run(req.params.id);
            db.prepare('UPDATE reviews SET deleted_at = CURRENT_TIMESTAMP WHERE project_id IN (SELECT id FROM projects WHERE customer_id = ?)').run(req.params.id);
            db.prepare('UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/portal/notifications/:customerId', (req, res) => {
    try {
        const { customerId } = req.params;
        const notifications = db.prepare('SELECT * FROM notifications WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50').all(customerId);
        const unreadResult = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE customer_id = ? AND is_read = 0').get(customerId);
        const unreadCount = unreadResult ? unreadResult.count : 0;
        res.json({ notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/portal/notifications/:customerId/read-all', (req, res) => {
    try {
        const { customerId } = req.params;
        db.prepare('UPDATE notifications SET is_read = 1 WHERE customer_id = ?').run(customerId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/portal/notifications/:customerId/clear-all', (req, res) => {
    try {
        const { customerId } = req.params;
        db.prepare('DELETE FROM notifications WHERE customer_id = ?').run(customerId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CUSTOMER PORTAL ENDPOINTS ---

app.get('/api/portal/data/:customerId', (req, res) => {
    console.log(`[Portal API] GET data for customer ${req.params.customerId}`);
    try {
        const { customerId } = req.params;
        const customer = db.prepare('SELECT id, company_name, email, portal_enabled FROM customers WHERE id = ? AND deleted_at IS NULL').get(customerId);

        if (!customer) {
            console.warn(`[Portal API] Customer ${customerId} not found`);
            return res.status(404).json({ error: 'Customer not found' });
        }

        console.log(`[Portal API] Found customer: ${customer.company_name}, portal_enabled: ${customer.portal_enabled}`);

        const profile = db.prepare('SELECT * FROM portal_user_profiles WHERE customer_id = ?').get(customerId);

        const projects = db.prepare(`
            SELECT p.*, o.offer_name, o.total as offer_total, o.status as offer_status, o.id as offer_id
            FROM projects p
            LEFT JOIN offers o ON p.offer_id = o.id
            WHERE p.customer_id = ? AND p.deleted_at IS NULL
            ORDER BY p.created_at DESC
        `).all(customerId);

        const projectIds = projects.map(p => p.id);
        let reviews = [];
        if (projectIds.length > 0) {
            const placeholders = projectIds.map(() => '?').join(',');
            reviews = db.prepare(`
                SELECT r.*, p.name as project_name, rv.version_number as latest_version
                FROM reviews r
                JOIN projects p ON r.project_id = p.id
                LEFT JOIN review_versions rv ON r.current_version_id = rv.id
                WHERE r.project_id IN (${placeholders}) AND r.deleted_at IS NULL
                ORDER BY r.created_at DESC
            `).all(...projectIds);
        }

        const notifications = db.prepare(`
            SELECT * FROM notifications 
            WHERE customer_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50
        `).all(customerId);

        const agreements = db.prepare(`
            SELECT id, offer_name, total, signed_at, created_at, status
            FROM offers 
            WHERE customer_id = ? AND status = 'signed' AND archived_at IS NULL AND deleted_at IS NULL
            ORDER BY signed_at DESC
        `).all(customerId);

        res.json({
            customer,
            profile: profile || null,
            projects,
            reviews,
            notifications,
            agreements
        });
    } catch (err) {
        console.error('[Portal API] GET /api/portal/data failed:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/portal/profile/:customerId', (req, res) => {
    console.log(`[Portal API] POST profile for customer ${req.params.customerId}`, req.body);
    try {
        const { customerId } = req.params;
        const { first_name, last_name, email, company } = req.body;

        const existing = db.prepare('SELECT id FROM portal_user_profiles WHERE customer_id = ?').get(customerId);

        if (existing) {
            db.prepare(`
                UPDATE portal_user_profiles 
                SET first_name = ?, last_name = ?, email = ?, company = ?, updated_at = CURRENT_TIMESTAMP
                WHERE customer_id = ?
            `).run(first_name, last_name, email, company, customerId);
        } else {
            db.prepare(`
                INSERT INTO portal_user_profiles (customer_id, first_name, last_name, email, company)
                VALUES (?, ?, ?, ?, ?)
            `).run(customerId, first_name, last_name, email, company);
        }

        const updated = db.prepare('SELECT * FROM portal_user_profiles WHERE customer_id = ?').get(customerId);
        res.json({ success: true, profile: updated });
    } catch (err) {
        console.error('[Portal API] POST /api/portal/profile failed:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/audit/repair', (req, res) => {
    try {
        const orphaned = db.prepare(`
            SELECT id, customer_id, offer_name, internal_notes 
            FROM offers 
            WHERE status = 'signed' 
            AND id NOT IN (SELECT offer_id FROM projects WHERE offer_id IS NOT NULL AND deleted_at IS NULL)
        `).all();

        for (const off of orphaned) {
            db.prepare(`
                INSERT INTO projects (offer_id, customer_id, name, status, review_limit)
                VALUES (?, ?, ?, 'todo', 3)
            `).run(off.id, off.customer_id, off.offer_name);
            logActivity('project', off.id, 'auto_created_via_repair', { offer_id: off.id });
        }

        res.json({ success: true, repaired: orphaned.length });
    } catch (err) {
        console.error('[API] /api/audit/repair failed:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/customers/:id/dashboard', (req, res) => {
    try {
        const customerId = req.params.id;
        const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const offers = db.prepare(`
            SELECT o.*, 
            (SELECT COUNT(*) FROM offer_items WHERE offer_id = o.id) as item_count
            FROM offers o 
            WHERE o.customer_id = ?
            ORDER BY o.created_at DESC
        `).all(customerId);

        const projects = db.prepare(`
            SELECT p.*, o.offer_name, o.total as offer_total, o.status as offer_status
            FROM projects p
            LEFT JOIN offers o ON p.offer_id = o.id
            WHERE p.customer_id = ? AND p.deleted_at IS NULL
            ORDER BY p.created_at DESC
        `).all(customerId);

        const openOffers = offers.filter(o => ['draft', 'sent'].includes(o.status));
        const activeProjects = projects.filter(p => !['done', 'completed', 'cancelled'].includes(p.status));

        const stats = {
            totalRevenue: offers.filter(o => o.status === 'signed').reduce((acc, curr) => acc + curr.total, 0),
            totalOffers: offers.length,
            signedCount: offers.filter(o => o.status === 'signed').length,
            pendingCount: offers.filter(o => o.status === 'sent').length,
            declinedCount: offers.filter(o => o.status === 'declined').length,
            draftCount: offers.filter(o => o.status === 'draft').length,
            openOffersCount: openOffers.length,
            openOffersValue: openOffers.reduce((acc, curr) => acc + (curr.total || 0), 0),
            activeProjectsCount: activeProjects.length,
            projectStatusBreakdown: {
                pending: projects.filter(p => p.status === 'pending').length,
                todo: projects.filter(p => p.status === 'todo').length,
                in_progress: projects.filter(p => ['active', 'in_progress'].includes(p.status)).length,
                done: projects.filter(p => ['done', 'completed'].includes(p.status)).length,
            },
            avgOfferValue: offers.length > 0 ? (offers.reduce((acc, curr) => acc + curr.total, 0) / offers.length) : 0,
            lastActivity: offers.length > 0 ? offers[0].updated_at : null
        };

        res.json({ customer, offers, projects, stats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- OFFERS ---


app.get('/api/offers', (req, res) => {
    const offers = db.prepare(`
        SELECT o.*, c.company_name as customer_name 
        FROM offers o 
        LEFT JOIN customers c ON o.customer_id = c.id
        WHERE o.archived_at IS NULL AND o.deleted_at IS NULL
        ORDER BY o.created_at DESC
    `).all();
    res.json(offers);
});

app.get('/api/offers/:id', (req, res) => {
    const offer = db.prepare(`
        SELECT o.*, 
               c.company_name as customer_name, 
               c.first_name, 
               c.last_name, 
               c.email, 
               c.phone, 
               c.address, 
               c.city, 
               c.postal_code, 
               c.country as customer_country,
               c.vat_number 
        FROM offers o 
        LEFT JOIN customers c ON o.customer_id = c.id 
        WHERE o.id = ? AND o.deleted_at IS NULL
    `).get(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    const items = db.prepare(`
        SELECT oi.*, s.name_de, s.name_fr, s.description_de, s.description_fr, oi.billing_cycle,
               ps.selections_json, ps.note as print_note, ps.option_set_id
        FROM offer_items oi 
        LEFT JOIN services s ON oi.service_id = s.id 
        LEFT JOIN offer_line_print_selections ps ON oi.id = ps.offer_line_id
        WHERE oi.offer_id = ?
    `).all(req.params.id).map(item => ({
        ...item,
        print_selections: item.selections_json ? JSON.parse(item.selections_json) : (item.specs ? (typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs) : null),
        specs: item.specs ? (typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs) : null
    }));

    res.json({ ...offer, items });
});

app.get('/api/offers/public/:token', (req, res) => {
    const offer = db.prepare(`
        SELECT o.*, 
               c.company_name as customer_name, 
               c.first_name, 
               c.last_name, 
               c.email, 
               c.phone, 
               c.address, 
               c.city, 
               c.postal_code, 
               c.country as customer_country,
               c.vat_number 
        FROM offers o 
        JOIN customers c ON o.customer_id = c.id 
        WHERE o.token = ?
    `).get(req.params.token);

    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    const items = db.prepare(`
        SELECT oi.*, s.name_de, s.name_fr, s.description_de, s.description_fr, oi.billing_cycle,
               ps.selections_json, ps.note as print_note, ps.option_set_id
        FROM offer_items oi 
        LEFT JOIN services s ON oi.service_id = s.id 
        LEFT JOIN offer_line_print_selections ps ON oi.id = ps.offer_line_id
        WHERE oi.offer_id = ?
    `).all(offer.id).map(item => ({
        ...item,
        print_selections: item.selections_json ? JSON.parse(item.selections_json) : (item.specs ? (typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs) : null),
        specs: item.specs ? (typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs) : null
    }));

    res.json({ ...offer, items });
});

const syncProjectWithOffer = (offerId, status, offerName, dueDate, strategicNotes, customerId, internalNotes) => {
    console.log(`[Sync] Starting sync for Offer ${offerId} (Status: ${status})`);

    // 1. Determine Target Project Status
    let targetStatus = null;
    if (status === 'signed') targetStatus = 'in_progress';
    else if (status === 'declined') targetStatus = 'cancelled';

    // We only create projects when signed
    if (status !== 'signed' && status !== 'declined' && status !== 'sent') {
        console.log(`[Sync] Skipping sync for non-final status: ${status}`);
        return null;
    }

    // Fetch offer details if missing (highly robust against argument gaps)
    const offer = db.prepare('SELECT offer_name, customer_id, strategic_notes, internal_notes, parent_id, project_id FROM offers WHERE id = ?').get(offerId);
    if (!offer) return null;

    const finalOfferName = offerName || offer.offer_name;
    const finalCustomerId = customerId || offer.customer_id;
    const finalStrategicNotes = strategicNotes || offer.strategic_notes || null;
    const finalInternalNotes = internalNotes || offer.internal_notes || null;

    const rootOfferId = offer.parent_id || offerId;

    // 2. Check if Project exists
    let existingProject = null;
    if (offer.project_id) {
        existingProject = db.prepare('SELECT id, status, strategic_notes, offer_id FROM projects WHERE id = ?').get(offer.project_id);
    }

    if (!existingProject) {
        existingProject = db.prepare(`
            SELECT id, status, strategic_notes, offer_id FROM projects 
            WHERE offer_id = ? 
               OR offer_id IN (SELECT id FROM offers WHERE parent_id = ? OR id = ?)
        `).get(offerId, rootOfferId, rootOfferId);
    }

    if (existingProject) {
        console.log(`[Sync] Found existing project ${existingProject.id}`);
        let updateFields = [];
        let params = [];

        if (existingProject.offer_id !== offerId) {
            updateFields.push('offer_id = ?');
            params.push(offerId);
        }

        if (targetStatus && existingProject.status !== targetStatus) {
            updateFields.push('status = ?');
            params.push(targetStatus);
        }

        if (finalOfferName) {
            updateFields.push('name = ?');
            params.push(finalOfferName);
        }

        if (finalStrategicNotes) {
            updateFields.push('strategic_notes = ?');
            params.push(finalStrategicNotes);
        }

        if (finalInternalNotes) {
            updateFields.push('internal_notes = ?');
            params.push(finalInternalNotes);
        }

        if (updateFields.length > 0) {
            const setClause = updateFields.join(', ');
            params.push(existingProject.id);
            db.prepare(`UPDATE projects SET ${setClause} WHERE id = ?`).run(...params);
        }

        // Repair Offer -> Project link if missing
        db.prepare('UPDATE offers SET project_id = ? WHERE id = ?').run(existingProject.id, offerId);

        return existingProject.id;
    } else if (status === 'signed' && finalCustomerId) {
        console.log(`[Sync] Creating new project for signed Offer ${offerId}`);

        const result = db.prepare(`
            INSERT INTO projects (offer_id, customer_id, name, status, strategic_notes, internal_notes, review_limit)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(offerId, finalCustomerId, finalOfferName || 'Untitled Project', targetStatus || 'in_progress', finalStrategicNotes || null, finalInternalNotes || null, 3);

        const newProjectId = result.lastInsertRowid;

        // Link Offer -> Project
        db.prepare('UPDATE offers SET project_id = ? WHERE id = ?').run(newProjectId, offerId);

        return newProjectId;
    }

    return null;
};

// --- PDF GENERATION HELPER ---
async function generateOfferPDF(offerId) {
    const offer = db.prepare(`
        SELECT o.*, 
               c.company_name as customer_name, 
               c.address as customer_address,
               c.city as customer_city, 
               c.postal_code as customer_postal_code,
               c.country as customer_country,
               c.vat_number as customer_vat
        FROM offers o 
        JOIN customers c ON o.customer_id = c.id 
        WHERE o.id = ?
    `).get(offerId);

    if (!offer) throw new Error('Offer not found');

    const items = db.prepare(`
        SELECT oi.*, 
               s.name_de, s.name_fr, s.description_de, s.description_fr,
               oi.group_id, oi.group_type, oi.price_mode, oi.is_selected, oi.specs,
               olps.selections_json as print_selections_json,
               olps.print_note
        FROM offer_items oi 
        LEFT JOIN services s ON oi.service_id = s.id AND oi.type = 'service'
        LEFT JOIN offer_line_print_selections olps ON oi.id = olps.offer_line_id
        WHERE oi.offer_id = ?
    `).all(offerId);

    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    const lang = offer.language || 'de';

    // Group items
    const groups = { one_time: [], yearly: [], monthly: [] };
    items.forEach(item => {
        const cycle = item.billing_cycle || 'one_time';
        if (!groups[cycle]) groups[cycle] = [];
        groups[cycle].push(item);
    });

    const cycleTitles = {
        one_time: { de: 'Einmalige Kosten', fr: 'Frais uniques' },
        yearly: { de: 'Jährliche Kosten', fr: 'Frais annuels' },
        monthly: { de: 'Monatliche Kosten', fr: 'Frais mensuels' }
    };

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString(lang === 'de' ? 'de-DE' : 'fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount || 0);
    };

    // Calculate totals helper
    const calculateTotals = (items) => {
        const subtotal = items
            .filter(i => i.price_mode !== 'UNSET' && !(i.group_type === 'OR' && !i.is_selected))
            .reduce((acc, i) => acc + ((i.unit_price || 0) * (i.quantity || 0)), 0);

        const discountAmount = subtotal * ((offer.discount_percent || 0) / 100);
        const discountedSubtotal = subtotal - discountAmount;
        const vatRate = offer.customer_country === 'BE' ? 0.21 : 0.0;
        const vat = discountedSubtotal * vatRate;
        return { subtotal, vat, total: discountedSubtotal + vat };
    };

    // Construct HTML
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            :root {
                --primary: #0F172A;
                --text-main: #0F172A;
                --text-secondary: #64748B;
                --text-muted: #94A3B8;
                --border: #E2E8F0;
                --bg-main: #F8F9FA;
            }
            body {
                font-family: 'Inter', system-ui, sans-serif;
                margin: 0;
                padding: 40px;
                color: var(--text-main);
                font-size: 13px;
                line-height: 1.5;
            }
            .header { display: flex; justify-content: space-between; margin-bottom: 60px; padding-bottom: 40px; border-bottom: 1px solid var(--border); }
            .logo { max-height: 60px; margin-bottom: 20px; }
            .company-info h2 { font-size: 16px; margin: 0 0 10px 0; }
            .company-details { color: var(--text-secondary); font-size: 11px; }
            .recipient-box { text-align: right; min-width: 250px; }
            .offer-badge { background: var(--bg-main); padding: 15px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 30px; }
            .offer-badge h1 { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #0F172A; margin: 0 0 5px 0; font-weight: 900; }
            .offer-name { font-size: 18px; font-weight: 800; margin-bottom: 5px; }
            .recipient-details h3 { font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; }
            .recipient-name { font-size: 16px; font-weight: 800; margin-bottom: 5px; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { text-align: left; font-size: 10px; text-transform: uppercase; color: var(--text-muted); padding: 10px 0; border-bottom: 2px solid var(--text-main); }
            td { padding: 15px 0; border-bottom: 1px solid var(--border); vertical-align: top; }
            .item-name { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
            .item-desc { color: var(--text-secondary); font-size: 11px; }
            
            .totals-container { display: flex; justify-content: flex-end; margin-top: 30px; }
            .totals-box { width: 250px; background: var(--bg-main); padding: 20px; border-radius: 8px; border: 1px solid var(--border); }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .total-row.grand { margin-top: 15px; padding-top: 15px; border-top: 1px dashed var(--border); font-weight: 800; font-size: 16px; color: #0F172A; }
            
            .signature-section { margin-top: 80px; display: flex; flex-direction: column; align-items: flex-end; }
            .signature-img { height: 60px; max-width: 200px; object-fit: contain; margin-bottom: 10px; }
            .signature-line { width: 200px; height: 1px; background: var(--text-main); margin-bottom: 10px; }
            .signer-info { text-align: right; font-size: 10px; color: var(--text-secondary); }
            .signer-name { font-weight: 800; color: var(--text-main); text-transform: uppercase; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-info">
                ${settings.logo_url ? `<img src="${settings.logo_url}" class="logo">` : ''}
                <h2>${settings.company_name}</h2>
                <div class="company-details">
                    ${settings.address || ''}<br>
                    ${settings.email ? `@ ${settings.email}` : ''}
                </div>
            </div>
            <div class="recipient-box">
                <div class="offer-badge">
                    <h1>${lang === 'de' ? 'Geschäftliches Angebot' : 'Proposition Commerciale'}</h1>
                    <div class="offer-name">${offer.offer_name || `#${offer.id}`}</div>
                    <div style="font-size: 11px; font-weight: 700;">${formatDate(offer.created_at)}</div>
                </div>
                <div class="recipient-details">
                    <h3>Prepared for</h3>
                    <div class="recipient-name">${offer.customer_name}</div>
                    <div class="company-details">
                        ${offer.customer_address || ''}<br>
                        ${offer.customer_postal_code || ''} ${offer.customer_city || ''}
                    </div>
                </div>
            </div>
        </div>

        ${['one_time', 'yearly', 'monthly'].map(cycle => {
        const groupItems = groups[cycle];
        if (!groupItems || groupItems.length === 0) return '';
        const totals = calculateTotals(groupItems);

        return `
                <div style="margin-bottom: 40px; page-break-inside: avoid;">
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <span style="font-weight: 800; text-transform: uppercase; letter-spacing: 1px; font-size: 11px;">
                            ${lang === 'de' ? cycleTitles[cycle].de : cycleTitles[cycle].fr}
                        </span>
                        <div style="flex: 1; height: 1px; background: var(--border); margin-left: 20px;"></div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>${lang === 'de' ? 'Service/Beschreibung' : 'Service/Description'}</th>
                                <th style="width: 60px; text-align: center;">${lang === 'de' ? 'Menge' : 'Qté'}</th>
                                <th style="width: 100px; text-align: right;">${lang === 'de' ? 'Einheit' : 'Unité'}</th>
                                <th style="width: 100px; text-align: right;">${lang === 'de' ? 'Betrag' : 'Total'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(() => {
                const processed = [];
                const groupMap = {};
                groupItems.forEach(item => {
                    if (item.group_id) {
                        if (!groupMap[item.group_id]) {
                            groupMap[item.group_id] = { isGroup: true, id: item.group_id, type: item.group_type, items: [] };
                            processed.push(groupMap[item.group_id]);
                        }
                        groupMap[item.group_id].items.push(item);
                    } else {
                        processed.push({ ...item, isGroup: false });
                    }
                });

                return processed.map(entry => {
                    if (entry.isGroup) {
                        return `
                                            <tr style="background: rgba(248, 249, 250, 0.5);">
                                                <td colspan="4" style="padding: 20px; border-bottom: 1px solid var(--border);">
                                                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                                                        <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; padding: 2px 6px; border-radius: 4px; background: ${entry.type === 'OR' ? '#fff7ed' : '#eff6ff'}; color: ${entry.type === 'OR' ? '#c2410c' : '#1d4ed8'}; border: 1px solid ${entry.type === 'OR' ? '#ffedd5' : '#dbeafe'};">
                                                            ${entry.type} Group
                                                        </span>
                                                        <div style="flex: 1; height: 1px; background: var(--border); opacity: 0.5;"></div>
                                                    </div>
                                                    <div style="display: flex; flex-direction: column; gap: 20px;">
                                                        ${entry.items.map((item, iIdx) => {
                            const isPrint = item.type === 'print';
                            const specsJson = item.specs ? (typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs) : (item.print_selections_json ? JSON.parse(item.print_selections_json) : null);
                            const specs = specsJson ? Object.entries(specsJson).filter(([_, v]) => v !== undefined && v !== null) : [];

                            return `
                                                                    <div style="display: flex; gap: 20px; position: relative; padding: 15px; border-radius: 12px; border: 1px solid transparent; margin-bottom: 10px;">
                                                                            ${entry.type === 'OR' && iIdx > 0 ? `
                                                                                <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); font-size: 8px; font-weight: 800; color: #64748b; background: white; padding: 2px 10px; border: 1px solid #ffedd5; border-radius: 10px; z-index: 10; text-transform: uppercase; letter-spacing: 1px;">OR</div>
                                                                            ` : ''}
                                                                            <div style="flex: 1;">
                                                                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                                                                    <div class="item-name" style="margin-bottom: 0;">${item.item_name || (lang === 'de' ? item.name_de : item.name_fr)}</div>
                                                                                    ${item.price_mode === 'UNSET' ? `<span style="font-size: 7px; font-weight: 900; background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; padding: 1px 4px; border-radius: 10px; text-transform: uppercase;">Pending</span>` : ''}
                                                                                </div>
                                                                                <div class="item-desc">${item.item_description || (lang === 'de' ? item.description_de : item.description_fr) || 'Strategic service deliverable'}</div>
                                                                                ${specs.length > 0 ? `
                                                                                    <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;">
                                                                                        ${specs.map(([k, v]) => `
                                                                                            <div style="font-size: 9px; background: #f8fafc; border: 1px solid #f1f5f9; padding: 2px 6px; border-radius: 4px; display: flex; align-items: center; gap: 4px;">
                                                                                                <span style="text-transform: uppercase; font-weight: 900; font-size: 7px; color: #94a3b8; border-right: 1px solid #e2e8f0; padding-right: 4px; height: 8px; line-height: 8px;">${k.replace(/_/g, ' ')}</span>
                                                                                                <span style="font-weight: 700; color: #475569;">${v || (lang === 'de' ? 'Keines' : lang === 'fr' ? 'Aucun' : 'None')}</span>
                                                                                            </div>
                                                                                        `).join('')}
                                                                                    </div>
                                                                                ` : ''}
                                                                                ${isPrint && item.print_note ? `
                                                                                    <div style="margin-top: 10px; font-size: 10px; font-style: italic; color: #64748b; border-left: 2px solid #e2e8f0; padding-left: 10px;">
                                                                                        ${item.print_note}
                                                                                    </div>
                                                                                ` : ''}
                                                                            </div>
                                                                            <div style="width: 60px; text-align: center;">
                                                                                <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">${item.quantity}</div>
                                                                                <div style="font-size: 8px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Units</div>
                                                                            </div>
                                                                            <div style="width: 100px; text-align: right; font-weight: 700; color: var(--text-secondary); font-size: 12px;">
                                                                                ${item.price_mode === 'UNSET' ? '—' : formatCurrency(item.unit_price)}
                                                                            </div>
                                                                            <div style="width: 100px; text-align: right;">
                                                                                ${entry.type === 'OR' && !item.is_selected ?
                                    `<span style="font-size: 9px; color: #94a3b8; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; background: #f8fafc; padding: 2px 6px; border-radius: 4px;">Option</span>` :
                                    (item.price_mode === 'UNSET' ? `<span style="font-size: 9px; color: #d97706; font-weight: 900; text-transform: uppercase; font-style: italic;">TBD</span>` : `<div style="font-size: 13px; font-weight: 800;">${formatCurrency(item.quantity * item.unit_price)}</div>`)
                                }
                                                                            </div>
                                                                        </div>
                                                                    `;
                        }).join('')}
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                    } else {
                        const item = entry;
                        const isPrint = item.type === 'print';
                        const specsJson = item.specs ? (typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs) : (item.print_selections_json ? JSON.parse(item.print_selections_json) : null);
                        const specs = specsJson ? Object.entries(specsJson).filter(([_, v]) => v !== undefined && v !== null) : [];

                        return `
                                            <tr style="page-break-inside: avoid;">
                                                <td style="padding: 20px 0;">
                                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                                        <div class="item-name" style="margin-bottom: 0;">${item.item_name || (lang === 'de' ? item.name_de : item.name_fr)}</div>
                                                        ${isPrint && item.option_set_name ? `<span style="font-size: 8px; color: #3b82f6; text-transform: uppercase; font-weight: 900; background: #eff6ff; padding: 1px 5px; border-radius: 4px;">${item.option_set_name}</span>` : ''}
                                                        ${item.price_mode === 'UNSET' ? `<span style="font-size: 7px; font-weight: 900; background: #fffbeb; color: #d97706; border: 1px solid #fef3c7; padding: 1px 4px; border-radius: 10px; text-transform: uppercase;">Pending</span>` : ''}
                                                    </div>
                                                    <div class="item-desc">${item.item_description || (lang === 'de' ? item.description_de : item.description_fr) || 'Strategic service deliverable'}</div>
                                                    
                                                    ${specs.length > 0 ? `
                                                        <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;">
                                                            ${specs.map(([k, v]) => `
                                                                <div style="font-size: 9px; background: #f8fafc; border: 1px solid #f1f5f9; padding: 2px 6px; border-radius: 4px; display: flex; align-items: center; gap: 4px;">
                                                                    <span style="text-transform: uppercase; font-weight: 900; font-size: 7px; color: #94a3b8; border-right: 1px solid #e2e8f0; padding-right: 4px; height: 8px; line-height: 8px;">${k.replace(/_/g, ' ')}</span>
                                                                    <span style="font-weight: 700; color: #475569;">${v || (lang === 'de' ? 'Keines' : lang === 'fr' ? 'Aucun' : 'None')}</span>
                                                                </div>
                                                            `).join('')}
                                                        </div>
                                                    ` : ''}
                                                    
                                                    ${isPrint && item.print_note ? `
                                                        <div style="margin-top: 10px; font-size: 10px; font-style: italic; color: #64748b; border-left: 2px solid #e2e8f0; padding-left: 10px;">
                                                            ${item.print_note}
                                                        </div>
                                                    ` : ''}
                                                </td>
                                                <td style="text-align: center; vertical-align: middle; padding: 20px 0;">
                                                    <div style="font-size: 13px; font-weight: 800; color: var(--text-main);">${item.quantity}</div>
                                                    <div style="font-size: 8px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Units</div>
                                                </td>
                                                <td style="text-align: right; vertical-align: middle; padding: 20px 0; font-weight: 700; color: var(--text-secondary); font-size: 12px;">
                                                    ${item.price_mode === 'UNSET' ? '—' : formatCurrency(item.unit_price)}
                                                </td>
                                                <td style="text-align: right; vertical-align: middle; padding: 20px 0;">
                                                    ${item.price_mode === 'UNSET' ? `<span style="color: #d97706; font-weight: 900; text-transform: uppercase; font-size: 9px; font-style: italic;">TBD</span>` : `<div style="font-size: 13px; font-weight: 800;">${formatCurrency(item.quantity * item.unit_price)}</div>`}
                                                </td>
                                            </tr>
                                        `;
                    }
                }).join('')
            })()}
                        </tbody>
                    </table>
                    <div class="totals-container">
                        <div class="totals-box">
                            <div class="total-row">
                                <span style="color: var(--text-muted); font-weight: 700;">Netto</span>
                                <span>${formatCurrency(totals.subtotal)}</span>
                            </div>
                            <div class="total-row">
                                <span style="color: var(--text-muted); font-weight: 700;">MwSt (${offer.customer_country === 'BE' ? '21%' : '0%'})</span>
                                <span>${formatCurrency(totals.vat)}</span>
                            </div>
                            <div class="total-row grand">
                                <span>TOTAL</span>
                                <span>${formatCurrency(totals.total)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
    }).join('')}

        ${offer.status === 'signed' ? `
            <div class="signature-section" style="page-break-inside: avoid;">
                <img src="${offer.signature_data}" class="signature-img">
                <div class="signature-line"></div>
                <div class="signer-info">
                    <div class="signer-name">Signed by ${offer.signed_by_name}</div>
                    <div>${formatDate(offer.signed_at)} • ${offer.signed_by_email}</div>
                    <div style="margin-top: 4px; opacity: 0.5;">IP: ${offer.signed_ip || 'Verification code attached'}</div>
                </div>
            </div>
        ` : ''}
    </body>
    </html>
    `;

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    await browser.close();
    return pdf;
}

app.get('/api/offers/:id/signed-pdf', async (req, res) => {
    try {
        const offerId = req.params.id;
        const offer = db.prepare('SELECT offer_name, id FROM offers WHERE id = ?').get(offerId);
        if (!offer) return res.status(404).json({ error: 'Offer not found' });

        const pdfBuffer = await generateOfferPDF(offerId);

        const filename = `Offer_${offer.offer_name || offer.id}_Signed.pdf`.replace(/[^a-z0-9_\-.]/gi, '_');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
    } catch (err) {
        console.error('[PDF] Export failed:', err);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

app.post('/api/offers/repair-links', (req, res) => {
    try {
        const signedOffers = db.prepare(`
            SELECT id, offer_name, customer_id, strategic_notes, internal_notes, project_id 
            FROM offers 
            WHERE status = 'signed' AND (project_id IS NULL OR project_id NOT IN (SELECT id FROM projects))
        `).all();

        const repairs = [];
        db.transaction(() => {
            for (const offer of signedOffers) {
                const projectId = syncProjectWithOffer(
                    offer.id,
                    'signed',
                    offer.offer_name,
                    null,
                    offer.strategic_notes,
                    offer.customer_id,
                    offer.internal_notes
                );
                if (projectId) {
                    repairs.push({ offerId: offer.id, projectId });
                }
            }
        })();

        res.json({ success: true, repairs });
    } catch (err) {
        console.error('[Repair] Failed:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/offers/public/:token/decline', (req, res) => {
    const { token } = req.params;
    const { comment } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const offer = db.prepare('SELECT * FROM offers WHERE token = ?').get(token);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    db.transaction(() => {
        db.prepare("UPDATE offers SET status = 'declined', declined_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(offer.id);
        db.prepare("INSERT INTO offer_events (offer_id, event_type, comment, ip_address) VALUES (?, 'declined', ?, ?)").run(offer.id, comment, ip);

        // Smart Sync
        syncProjectWithOffer(offer.id, 'declined');

        // Notification
        createNotification('offer', 'Offer Declined ❌', `Offer "${offer.offer_name}" has been declined by the client.`, `/offers`, `offer_declined_${offer.id}`);

        logActivity('offer', offer.id, 'declined', { comment });
    })();

    res.json({ success: true });
});

const signRateLimit = new Map();

app.post('/api/offers/public/:token/sign', (req, res) => {
    const { token } = req.params;
    const { name, email, signatureData, pdfUrl, items } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // ... rate limit logic stays the same ...
    const now = Date.now();
    const limitWindow = 60 * 60 * 1000;
    const limitCount = 5;
    let rateData = signRateLimit.get(ip) || { count: 0, firstAttempt: now };
    if (now - rateData.firstAttempt > limitWindow) rateData = { count: 0, firstAttempt: now };
    if (rateData.count >= limitCount) return res.status(429).json({ error: 'Too many attempts' });
    rateData.count++;
    signRateLimit.set(ip, rateData);

    const offer = db.prepare('SELECT * FROM offers WHERE token = ?').get(token);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (['signed', 'declined'].includes(offer.status)) return res.status(400).json({ error: 'Offer finalized' });

    try {
        db.transaction(() => {
            // Update items selection
            if (items && Array.isArray(items)) {
                const updateItem = db.prepare('UPDATE offer_items SET is_selected = ? WHERE id = ? AND offer_id = ?');
                for (const item of items) {
                    updateItem.run(item.is_selected ? 1 : 0, item.id, offer.id);
                }
            }

            db.prepare(`
                UPDATE offers SET 
                    status = 'signed', 
                    signed_at = CURRENT_TIMESTAMP, 
                    updated_at = CURRENT_TIMESTAMP,
                    signed_by_name = ?,
                    signed_by_email = ?,
                    signature_data = ?,
                    signed_ip = ?,
                    signed_pdf_url = ?
                WHERE id = ?
            `).run(name, email, signatureData, ip, pdfUrl || null, offer.id);

            db.prepare("INSERT INTO offer_events (offer_id, event_type, ip_address) VALUES (?, 'signed', ?)").run(offer.id, ip);
            syncProjectWithOffer(offer.id, 'signed');
            createNotification('offer', 'Offer Signed! ✍️', `Offer "${offer.offer_name}" signed by ${name}`, `/offers/${offer.id}`, `offer_signed_${offer.id}`);
            logActivity('offer', offer.id, 'signed', { signedBy: name });
        })();

        const updatedOffer = db.prepare('SELECT * FROM offers WHERE id = ?').get(offer.id);
        res.json({ success: true, offer: updatedOffer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/offers', (req, res) => {
    const { customer_id, offer_name, language, status, subtotal, vat, total, items, due_date, internal_notes, strategic_notes, linked_project_id } = req.body;
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const transaction = db.transaction(() => {
        const offerResult = db.prepare(`
            INSERT INTO offers (customer_id, offer_name, language, status, subtotal, vat, total, token, due_date, internal_notes, strategic_notes, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(customer_id, offer_name, language, status || 'draft', subtotal, vat, total, token, due_date, internal_notes || null, strategic_notes || null, 'System', 'System');

        const offerId = offerResult.lastInsertRowid;

        const insertItem = db.prepare(`
            INSERT INTO offer_items (
                offer_id, service_id, quantity, unit_price, total_price, 
                billing_cycle, item_name, item_description, type, print_snapshot,
                group_id, group_type, specs, price_mode, is_selected,
                supplier_price, margin
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        if (items && Array.isArray(items)) {
            for (const item of items) {
                const itemRes = insertItem.run(
                    offerId,
                    item.service_id,
                    item.quantity,
                    item.unit_price,
                    item.total_price,
                    item.billing_cycle || 'one_time',
                    item.item_name || null,
                    item.item_description || null,
                    item.type || 'service',
                    item.print_snapshot || null,
                    item.group_id || null,
                    item.group_type || null,
                    item.specs ? JSON.stringify(item.specs) : null,
                    item.price_mode || 'CALCULATED',
                    item.is_selected === undefined ? 1 : (item.is_selected ? 1 : 0),
                    item.supplier_price || 0,
                    item.margin || 0
                );

                const offerLineId = itemRes.lastInsertRowid;

                if (item.type === 'print' && item.print_selections) {
                    db.prepare(`
                        INSERT INTO offer_line_print_selections (offer_line_id, print_product_id, option_set_id, selections_json, note)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(
                        offerLineId,
                        item.service_id, // For print items, service_id = print_product_id in this logic
                        item.option_set_id || null,
                        JSON.stringify(item.print_selections),
                        item.print_note || null
                    );
                }
            }
        }

        // Project Synchronization Logic
        if (linked_project_id) {
            db.prepare('UPDATE projects SET offer_id = ? WHERE id = ?').run(offerId, linked_project_id);
            syncProjectWithOffer(offerId, status || 'draft', offer_name, null, strategic_notes, customer_id);
        } else {
            syncProjectWithOffer(offerId, status || 'draft', offer_name, null, strategic_notes, customer_id);
        }

        logActivity('offer', offerId, 'created', { name: offer_name, status: status || 'draft', total: total });
        if (status === 'sent') logActivity('offer', offerId, 'sent', {});

        return offerId;
    });

    try {
        const id = transaction();
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ... (duplicate endpoint remains similar, skipping for brevity but it creates 'draft' so less critical for sync) ...

app.put('/api/offers/:id', (req, res) => {
    const { customer_id, offer_name, language, status, subtotal, vat, total, items, due_date, internal_notes, strategic_notes, discount_percent } = req.body;
    let offerId = req.params.id;

    // Versioning logic: if offer is already 'sent' or 'signed', creating a new update should forge a new version record
    const currentOffer = db.prepare('SELECT status, version_number, parent_id, token FROM offers WHERE id = ?').get(offerId);

    const transaction = db.transaction(() => {
        if (currentOffer && (currentOffer.status === 'sent' || currentOffer.status === 'signed')) {
            // Create a new version
            const newVersionNumber = (currentOffer.version_number || 1) + 1;
            const parentId = currentOffer.parent_id || offerId;
            const newToken = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

            const result = db.prepare(`
                    INSERT INTO offers (
                        customer_id, offer_name, language, status, 
                        subtotal, vat, total, due_date, internal_notes, strategic_notes,
                        parent_id, version_number, token, created_by, updated_by, discount_percent
                    ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(customer_id, offer_name, language, subtotal, vat, total, due_date, internal_notes || null, strategic_notes || null, parentId, newVersionNumber, newToken, 'System', 'System', discount_percent || 0);

            offerId = result.lastInsertRowid;

            logActivity('offer', offerId, 'version_created', {
                parentId,
                versionNumber: newVersionNumber,
                name: offer_name
            });
        } else {
            // Normal update - Dynamically build update to support partial updates (e.g. from sync)
            const fields = [];
            const params = [];

            const updatableFields = [
                'customer_id', 'offer_name', 'language', 'status',
                'subtotal', 'vat', 'total', 'due_date',
                'internal_notes', 'strategic_notes', 'discount_percent'
            ];

            updatableFields.forEach(field => {
                if (req.body[field] !== undefined) {
                    fields.push(`${field} = ?`);
                    params.push(req.body[field]);
                }
            });

            if (fields.length > 0) {
                fields.push('updated_at = CURRENT_TIMESTAMP');
                fields.push('updated_by = ?');
                params.push('System');
                params.push(offerId);

                db.prepare(`
                    UPDATE offers SET ${fields.join(', ')}
                    WHERE id = ?
                `).run(...params);
            }

            logActivity('offer', offerId, 'updated', {
                status: status || currentOffer.status,
                total: total || (currentOffer ? JSON.parse(currentOffer.metadata || '{}').total : null), // metadata fallback if available, simple for now
                linkedProject: strategic_notes ? 'synced' : 'none'
            });
        }

        // Replace items for the (potentially new) offerId - ONLY if items are provided
        if (items && Array.isArray(items)) {
            db.prepare('DELETE FROM offer_items WHERE offer_id = ?').run(offerId);

            const insertItem = db.prepare(`
            INSERT INTO offer_items (
                offer_id, service_id, quantity, unit_price, total_price, 
                billing_cycle, item_name, item_description, type, print_snapshot,
                group_id, group_type, specs, price_mode, is_selected,
                supplier_price, margin
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

            for (const item of items) {
                insertItem.run(
                    offerId,
                    item.service_id,
                    item.quantity,
                    item.unit_price,
                    item.total_price,
                    item.billing_cycle || 'one_time',
                    item.item_name || null,
                    item.item_description || null,
                    item.type || 'service',
                    item.print_snapshot || null,
                    item.group_id || null,
                    item.group_type || null,
                    item.specs ? JSON.stringify(item.specs) : null,
                    item.price_mode || 'CALCULATED',
                    item.is_selected === undefined ? 1 : (item.is_selected ? 1 : 0),
                    item.supplier_price || 0,
                    item.margin || 0
                );
            }
        }

        // Smart Sync
        syncProjectWithOffer(offerId, status, offer_name, null, strategic_notes, customer_id, internal_notes);
    });

    try {
        transaction();
        res.json({ success: true, id: offerId }); // Return the (potentially new) ID
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/api/offers/:id/send', (req, res) => {
    const offerId = req.params.id;

    // Check if offer has a customer
    const offerCheck = db.prepare('SELECT customer_id, offer_name, due_date, internal_notes, strategic_notes, token FROM offers WHERE id = ?').get(offerId);
    if (!offerCheck || !offerCheck.customer_id) {
        return res.status(400).json({ error: 'Cannot send offer without an assigned customer.' });
    }

    db.transaction(() => {
        db.prepare(`
            UPDATE offers SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
            WHERE id = ?
                `).run(offerId);

        // Smart Sync
        syncProjectWithOffer(offerId, 'sent', offerCheck.offer_name, null, offerCheck.strategic_notes, offerCheck.customer_id); // Pass null for dueDate

        logActivity('offer', offerId, 'sent', {});
    })();

    // Return token so frontend can redirect to public page
    res.json({ success: true, token: offerCheck.token });
});

// Manual status update endpoint
app.delete('/api/offers/:id', (req, res) => {
    try {
        const offer = db.prepare('SELECT status FROM offers WHERE id = ?').get(req.params.id);
        if (offer && offer.status === 'signed') {
            return res.status(400).json({ error: 'Signed offers cannot be moved to trash.' });
        }
        db.prepare('UPDATE offers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/offers/:id/restore', (req, res) => {
    try {
        db.prepare('UPDATE offers SET deleted_at = NULL WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/offers/:id/status', (req, res) => {
    const { status } = req.body;
    const offerId = req.params.id;

    try {
        db.transaction(() => {
            const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerId);
            const oldStatus = offer.status;

            db.prepare('UPDATE offers SET status = ? WHERE id = ?').run(status, offerId);

            if (status === 'sent') {
                db.prepare("UPDATE offers SET sent_at = COALESCE(sent_at, CURRENT_TIMESTAMP) WHERE id = ?").run(offerId);
            }
            if (status === 'signed') {
                db.prepare("UPDATE offers SET signed_at = COALESCE(signed_at, CURRENT_TIMESTAMP) WHERE id = ?").run(offerId);
            }

            if (offer) {
                if (status === 'sent' && !offer.customer_id) {
                    throw new Error('Cannot set status to "sent" without an assigned customer.');
                }
                syncProjectWithOffer(offerId, status, offer.offer_name, null, offer.strategic_notes, offer.customer_id); // Pass null for dueDate

                // Only notify on signed status (meaningful trigger)
                if (status === 'signed') {
                    createNotification('offer', 'Offer Signed! ✍️', `Offer "${offer.offer_name}" has been signed.`, '/projects', `offer_signed_${offerId}`);
                }

                if (oldStatus !== status) {
                    logActivity('offer', offerId, 'status_change', { oldStatus, newStatus: status });
                }
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PROJECTS ---
app.post('/api/projects', (req, res) => {
    const { name, customer_id, deadline, status, internal_notes, priority, strategic_notes, review_limit } = req.body;
    try {
        // Insert project
        const result = db.prepare(`
            INSERT INTO projects (customer_id, name, status, deadline, internal_notes, priority, strategic_notes, review_limit, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            customer_id || null,
            name || 'New Project',
            status || 'todo',
            deadline || null,
            internal_notes || null,
            priority || 'medium',
            strategic_notes || null,
            review_limit === undefined ? 3 : (review_limit === '' ? null : review_limit),
            'System',
            'System'
        );

        // Log creation event
        db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(result.lastInsertRowid, 'created', 'Project created');
        logActivity('project', result.lastInsertRowid, 'created', { name: name || 'New Project' });

        res.json({ id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects', (req, res) => {
    try {
        const projects = db.prepare(`
            SELECT p.*, c.company_name as customer_name, o.offer_name, o.total as offer_total, o.status as offer_status,
                   r.status as latest_review_status, rv.version_number as latest_review_version, r.unread_count as latest_review_unread,
                   r.id as latest_review_id, rv.token as latest_review_token, p.review_limit as project_review_limit, r.revisions_used
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN offers o ON p.offer_id = o.id
            LEFT JOIN (
                SELECT r1.* 
                FROM reviews r1
                WHERE r1.id IN (SELECT MAX(id) FROM reviews WHERE deleted_at IS NULL GROUP BY project_id)
            ) r ON p.id = r.project_id
            LEFT JOIN review_versions rv ON r.current_version_id = rv.id
            WHERE p.archived_at IS NULL AND p.deleted_at IS NULL
            ORDER BY p.created_at DESC
        `).all();
        res.json(projects);
    } catch (err) {
        console.error('[API] /api/projects failed:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id', (req, res) => {
    try {
        const project = db.prepare(`
            SELECT p.*, c.company_name as customer_name, o.offer_name, o.total as offer_total, o.status as offer_status, o.id as offer_id,
                   r.status as latest_review_status, rv.version_number as latest_review_version, r.unread_count as latest_review_unread,
                   r.id as latest_review_id, r.revisions_used
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN offers o ON p.offer_id = o.id
            LEFT JOIN reviews r ON p.id = r.project_id AND r.deleted_at IS NULL
            LEFT JOIN review_versions rv ON r.current_version_id = rv.id
            WHERE p.id = ? AND p.deleted_at IS NULL
        `).get(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC').all(req.params.id);
        res.json({ ...project, tasks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id', (req, res) => {
    const { name, status, deadline, internal_notes, customer_id, offer_id, priority, strategic_notes, review_limit } = req.body;
    const projectId = req.params.id;
    try {
        const currentProject = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
        if (!currentProject) return res.status(404).json({ error: 'Project not found' });

        // Block manual status change if linked offer is still pending/sent
        if (status) {
            const project = db.prepare('SELECT p.*, o.status as offer_status FROM projects p LEFT JOIN offers o ON p.offer_id = o.id WHERE p.id = ?').get(projectId);
            if (project && project.offer_id && ['pending', 'sent', 'draft'].includes(project.offer_status)) {
                if (status !== project.status) {
                    return res.status(400).json({ error: 'Cannot change project status while the linked offer is still pending. The project status will update automatically when the offer is signed or declined.' });
                }
            }
        }

        if (name !== undefined && name.trim() === '') {
            return res.status(400).json({ error: 'Project name cannot be empty' });
        }

        db.transaction(() => {
            const allowedFields = {
                name: 'name',
                status: 'status',
                deadline: 'deadline',
                internal_notes: 'internal_notes',
                customer_id: 'customer_id',
                offer_id: 'offer_id',
                priority: 'priority',
                strategic_notes: 'strategic_notes',
                review_limit: 'review_limit'
            };

            const updates = [];
            const params = [];

            for (const [key, val] of Object.entries(req.body)) {
                if (allowedFields[key]) {
                    updates.push(`${allowedFields[key]} = ?`);
                    // Handle empty strings as null for optional fields
                    if (['deadline', 'internal_notes', 'strategic_notes', 'customer_id', 'offer_id', 'review_limit'].includes(key) && val === '') {
                        params.push(null);
                    } else {
                        params.push(val);
                    }
                }
            }

            if (updates.length > 0) {
                updates.push('updated_at = CURRENT_TIMESTAMP');
                updates.push('updated_by = ?');
                params.push('System');
                params.push(projectId);

                db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);
            }

            // Sync Offer Name if Project Name changed
            if (name && name !== currentProject.name && currentProject.offer_id) {
                const offer = db.prepare('SELECT offer_name FROM offers WHERE id = ?').get(currentProject.offer_id);
                if (offer && offer.offer_name === currentProject.name) {
                    db.prepare('UPDATE offers SET offer_name = ? WHERE id = ?').run(name, currentProject.offer_id);
                }
            }

            // Log events for changes
            if (status !== undefined && status !== currentProject.status) {
                db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(projectId, 'status_change', `Status changed from ${currentProject.status} to ${status}`);
            }
            if (deadline !== undefined && deadline !== currentProject.deadline) {
                db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(projectId, 'deadline_update', `Deadline updated to ${deadline}`);
            }
            if (priority !== undefined && priority !== currentProject.priority) {
                db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(projectId, 'priority_change', `Priority updated to ${priority}`);
            }
            if (strategic_notes !== undefined && strategic_notes !== currentProject.strategic_notes) {
                db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(projectId, 'notes_update', `Strategic notes updated`);
            }

            // Sync limit to reviews table
            if (review_limit !== undefined) {
                db.prepare('UPDATE reviews SET review_limit = ? WHERE project_id = ?').run(
                    review_limit === '' ? null : review_limit,
                    projectId
                );
            }

            logActivity('project', projectId, 'updated', {
                status: status !== currentProject.status ? status : undefined,
                renamed: name !== currentProject.name
            });
        })();

        // Return the updated project object for frontend sync
        const updatedProject = db.prepare(`
            SELECT 
                p.*, 
                c.company_name as customer_name, 
                o.offer_name, o.total as offer_total, o.status as offer_status, o.id as offer_id,
                r.status as latest_review_status, 
                rv.version_number as latest_review_version, 
                r.unread_count as latest_review_unread,
                r.id as latest_review_id, 
                r.revisions_used
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN offers o ON p.offer_id = o.id
            LEFT JOIN reviews r ON p.id = r.project_id AND r.deleted_at IS NULL
            LEFT JOIN review_versions rv ON r.current_version_id = rv.id
            WHERE p.id = ? AND p.deleted_at IS NULL
        `).get(projectId);

        res.json({ success: true, project: updatedProject });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Activity Timeline
app.get('/api/projects/:id/activity', (req, res) => {
    try {
        const projectId = req.params.id;
        const project = db.prepare('SELECT offer_id FROM projects WHERE id = ?').get(projectId);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const projectEvents = db.prepare("SELECT p.*, 'project' as source FROM project_events p WHERE project_id = ?").all(projectId);
        const offerEvents = project.offer_id ? db.prepare("SELECT o.*, 'offer' as source FROM offer_events o WHERE offer_id = ?").all(project.offer_id) : [];

        const combined = [...projectEvents, ...offerEvents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json(combined);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', (req, res) => {
    try {
        db.transaction(() => {
            db.prepare('UPDATE reviews SET deleted_at = CURRENT_TIMESTAMP WHERE project_id = ?').run(req.params.id);
            db.prepare('UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- REVIEWS ---
app.get('/api/viewer-test', (req, res) => {
    res.json({ message: 'Viewer test route active', timestamp: new Date().toISOString() });
});

// DELETED DUPLICATE app.get('/api/reviews/:id')

app.get('/api/reviews', (req, res) => {
    try {
        const reviews = db.prepare(`
            SELECT 
                r.id, r.project_id, r.title, r.status, r.review_limit, r.review_policy, 
                r.created_by, r.token as token, r.created_at, r.updated_at, 
                r.revisions_used, r.current_version_id, r.is_token_active,
                p.name as project_name, 
                rv.status as current_status, rv.version_number, 
                rv.token as version_token
            FROM reviews r
            JOIN projects p ON r.project_id = p.id
            LEFT JOIN review_versions rv ON r.current_version_id = rv.id
            WHERE p.deleted_at IS NULL AND r.deleted_at IS NULL
            ORDER BY r.updated_at DESC
        `).all();
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reviews/:id', (req, res) => {
    try {
        const review = db.prepare(`
            SELECT r.*, p.name as project_name, rv.status as current_status, rv.version_number
            FROM reviews r
            JOIN projects p ON r.project_id = p.id
            LEFT JOIN review_versions rv ON r.current_version_id = rv.id
            WHERE r.id = ?
        `).get(req.params.id);

        if (!review) return res.status(404).json({ error: 'Review not found' });

        // Get versions for the switcher
        const versions = db.prepare(`
            SELECT id, version_number, status, token, created_at 
            FROM review_versions 
            WHERE review_id = ? 
            ORDER BY version_number DESC
        `).all(req.params.id);

        res.json({ ...review, versions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reviews/:id/versions', (req, res) => {
    try {
        const versions = db.prepare(`
            SELECT id, version_number, status, token, created_at, created_by, file_url
            FROM review_versions 
            WHERE review_id = ? 
            ORDER BY version_number DESC
        `).all(req.params.id);
        res.json(versions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PUBLIC REVIEWS (Unauthenticated) ---

app.get('/api/review-by-token/:token', (req, res) => {
    try {
        // Find container (Review) by token
        const container = db.prepare(`
            SELECT r.*, p.name as project_name
            FROM reviews r
            JOIN projects p ON r.project_id = p.id
            WHERE r.token = ?
        `).get(req.params.token);

        if (!container) {
            return res.status(404).json({ error: 'Review not found' });
        }

        if (container.is_token_active === 0) {
            return res.status(410).json({ error: 'This review link is no longer active' });
        }

        // Get the requested version (default to current if no query param)
        const versionId = req.query.v;
        const version = versionId
            ? db.prepare('SELECT * FROM review_versions WHERE id = ? AND review_id = ?').get(versionId, container.id)
            : db.prepare('SELECT * FROM review_versions WHERE id = ?').get(container.current_version_id);

        if (!version) {
            return res.status(404).json({ error: 'Review version not found' });
        }

        const isCurrent = version.id === container.current_version_id;

        // Versions for switcher
        const allVersions = db.prepare(`
            SELECT id, version_number, status, token FROM review_versions
            WHERE review_id = ?
            ORDER BY version_number DESC
        `).all(container.id);

        // Alias version token to avoid collision with container token
        const { token: version_token, ...versionData } = version;

        res.json({
            ...container,
            review_limit: container.review_limit || 3,
            ...versionData,
            version_token,
            isCurrent,
            allVersions,
            containerId: container.id,
            versionId: version.id
        });
    } catch (err) {
        console.error('[API] /api/review-by-token failed:', err);
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/reviews/:id/action', (req, res) => {
    const { action, firstName, lastName, email, versionId } = req.body;
    const reviewId = req.params.id;

    console.log('[DEBUG] Entering /api/reviews/:id/action');
    console.log('[DEBUG] Body:', req.body);
    console.log('[DEBUG] Params:', req.params);

    try {
        const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
        console.log('[DEBUG] Review found:', review ? 'YES' : 'NO');
        if (!review) return res.status(404).json({ error: 'Review not found' });

        // Fallback to current_version_id if versionId is missing or wrong
        const actualVersionId = versionId || review.current_version_id;
        console.log('[DEBUG] Actual Version ID:', actualVersionId);

        const version = db.prepare('SELECT * FROM review_versions WHERE id = ?').get(actualVersionId);
        console.log('[DEBUG] Version found:', version ? 'YES' : 'NO');

        if (!version) {
            console.error(`[ReviewAction] Version mismatch: review ${reviewId} target ${versionId}`);
            return res.status(404).json({ error: 'Version not found for this review' });
        }

        // Revision limit check for request-changes
        if (action === 'request-changes') {
            if (review.revisions_used >= review.review_limit) {
                return res.status(409).json({ error: 'Revision limit reached for this container.' });
            }
        }

        const newStatus = action === 'approve' ? 'approved' : 'changes_requested';
        console.log('[DEBUG] New status will be:', newStatus);

        db.transaction(() => {
            console.log('[DEBUG] Starting transaction');
            db.prepare(`
                INSERT INTO review_actions (review_id, version_id, action_type, first_name, last_name, email)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(reviewId, actualVersionId, action === 'approve' ? 'approve' : 'request-changes', firstName || null, lastName || null, email || null);

            db.prepare('UPDATE review_versions SET status = ? WHERE id = ?').run(newStatus, actualVersionId);

            if (action === 'request-changes') {
                const countRes = db.prepare("SELECT COUNT(*) as count FROM review_actions WHERE version_id = ? AND action_type = 'request-changes'").get(actualVersionId);
                const alreadyRequested = countRes ? countRes.count : 0;

                if (alreadyRequested <= 1) {
                    db.prepare("UPDATE reviews SET revisions_used = revisions_used + 1, status = 'changes_requested', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reviewId);
                } else {
                    db.prepare("UPDATE reviews SET status = 'changes_requested', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reviewId);
                }
            } else {
                db.prepare("UPDATE reviews SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reviewId);
            }

            const clientName = `${firstName || ''} ${lastName || ''}`.trim() || email || 'Client';
            const msg = `${clientName} ${action === 'approve' ? 'approved' : 'requested changes for'} "${review.title || 'Review'}" v${version.version_number}.`;

            db.prepare('INSERT INTO notifications (type, title, message, link) VALUES (?, ?, ?, ?)').run(
                'review_action',
                action === 'approve' ? 'Review Approved' : 'Changes Requested',
                msg,
                `/projects/${review.project_id}`
            );
        })();

        res.json({ success: true, status: newStatus });
    } catch (err) {
        console.error('[CRITICAL] /api/reviews/:id/action failure:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reviews/version/:id', (req, res) => {
    try {
        const version = db.prepare(`
            SELECT rv.*, r.project_id, r.current_version_id, p.name as project_name 
            FROM review_versions rv
            JOIN reviews r ON rv.review_id = r.id
            JOIN projects p ON r.project_id = p.id
            WHERE rv.id = ?
        `).get(req.params.id);

        if (!version) {
            return res.status(404).json({ error: 'Version not found' });
        }

        if (version.file_deleted === 1) {
            return res.status(410).json({
                code: 'FILE_EXPIRED',
                message: 'This review version file has expired'
            });
        }

        const isCurrent = version.id === version.current_version_id;
        res.json({ ...version, isCurrent });
    } catch (err) {
        console.error('[API] /api/reviews/version/:id failed:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/reviews/:id', (req, res) => {
    try {
        db.prepare('UPDATE reviews SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id/reviews', (req, res) => {
    try {
        const reviews = db.prepare(`
            SELECT 
                r.id, r.project_id, r.title, r.status, r.review_limit, r.review_policy, 
                r.created_by, r.token as token, r.created_at, r.updated_at, 
                r.revisions_used, r.current_version_id, r.is_token_active,
                rv.status as current_status, rv.version_number, 
                rv.token as version_token, rv.is_token_active as is_version_token_active
            FROM reviews r
            LEFT JOIN review_versions rv ON r.current_version_id = rv.id
            WHERE r.project_id = ? AND r.deleted_at IS NULL
            ORDER BY r.created_at DESC
            `).all(req.params.id);
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reviews/upload', upload.single('file'), async (req, res) => {
    const { project_id, created_by, title, review_limit, review_policy } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const fullOriginalPath = path.join(uploadsDir, file.filename);
    const compressedFilename = `comp-${file.filename}`;
    const fullCompressedPath = path.join(uploadsDir, compressedFilename);
    const compressedUrl = `/uploads/${compressedFilename}`;

    try {
        console.log('[Upload] Processing:', file.filename);

        // 1. Process & Compress PDF
        const originalBuffer = fs.readFileSync(fullOriginalPath);
        const originalSize = originalBuffer.length;

        let pdfDoc;
        try {
            pdfDoc = await PDFDocument.load(originalBuffer);
            // pdf-lib doesn't have a "compress" method, but saving it with useObjectStreams
            // and other optimizations usually reduces size significantly compared to unoptimized outputs
            const compressedBuffer = await pdfDoc.save({
                useObjectStreams: true,
                addDefaultFont: false,
                updateFieldAppearances: false
            });
            fs.writeFileSync(fullCompressedPath, compressedBuffer);
        } catch (err) {
            console.error('[Upload] Compression failed:', err.message);
            if (fs.existsSync(fullOriginalPath)) fs.unlinkSync(fullOriginalPath);
            return res.status(500).json({ error: 'Failed to process PDF: ' + err.message });
        }

        const compressedSize = fs.statSync(fullCompressedPath).size;
        const compressionRatio = compressedSize / originalSize;

        // 2. DELETE ORIGINAL IMMEDIATELY
        if (fs.existsSync(fullOriginalPath)) {
            fs.unlinkSync(fullOriginalPath);
            console.log('[Upload] Original deleted:', file.filename);
        }

        // 3. Find/Create Review container (multiple containers per project allowed)
        let review = db.prepare('SELECT * FROM reviews WHERE project_id = ? AND title = ?').get(project_id, title || 'Project Review');
        if (!review) {
            const containerToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const result = db.prepare('INSERT INTO reviews (project_id, title, status, review_limit, review_policy, created_by, token) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                project_id, title || 'Project Review', 'in_review', review_limit || 3, review_policy || 'soft', created_by || 'System', containerToken
            );
            review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
        } else {
            // Strict Revision Credit System Logic
            if (review.revisions_used >= review.review_limit) {
                // If soft mode, we allow it but log it? The user said "Reject Upload New Version with 409 (if strict mode enabled)". 
                // Let's implement strict rejection for now as requested.
                if (review.review_policy === 'strict') {
                    if (fs.existsSync(fullCompressedPath)) fs.unlinkSync(fullCompressedPath);
                    return res.status(409).json({ error: 'Revision limit reached for this container.' });
                }
            }
        }

        // 4. Update Old Versions (is_active = 0, retention_expiry)
        const ninetyDaysOut = new Date();
        ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);

        db.prepare(`
            UPDATE review_versions 
            SET is_active = 0,
            status = 'superseded',
            retention_expires_at = ?
                WHERE review_id = ? AND is_active = 1
                    `).run(ninetyDaysOut.toISOString(), review.id);

        // 5. Insert New Version
        const lastVer = db.prepare('SELECT MAX(version_number) as last FROM review_versions WHERE review_id = ?').get(review.id);
        const nextVer = (lastVer?.last || 0) + 1;
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

        const versionResult = db.prepare(`
            INSERT INTO review_versions(
                        review_id, project_id, file_url, compressed_file_url, version_number,
                        status, token, is_token_active, created_by,
                        original_size_bytes, compressed_size_bytes, compression_ratio,
                        is_active, last_accessed_at
                    ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
            `).run(
            review.id, project_id, compressedUrl, compressedUrl, nextVer,
            'active', token, 1, created_by || 'System',
            originalSize, compressedSize, compressionRatio
        );

        const versionId = versionResult.lastInsertRowid;
        db.prepare('UPDATE reviews SET current_version_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(versionId, review.id);

        logActivity('project', project_id, 'review_version_uploaded', {
            reviewId: review.id,
            version: nextVer,
            compression: `${(compressionRatio * 100).toFixed(1)}% `
        });

        console.log(`[Upload] SUCCESS: ${nextVer} (Ratio: ${(compressionRatio * 100).toFixed(1)
            }%)`);
        res.json({ success: true, version_id: versionId, ratio: compressionRatio });
    } catch (err) {
        console.error('[Upload] Critical error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get comments for a version (internal & public unified)
app.get('/api/public/reviews/versions/:id/comments', (req, res) => {
    try {
        const comments = db.prepare(`
            SELECT * FROM review_comments 
            WHERE version_id = ?
            ORDER BY page_number ASC, created_at ASC
        `).all(req.params.id);
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/public/reviews/versions/:id/comments', (req, res) => {
    const { page_number, x, y, width, height, type, content, author_name, author_email, parent_id } = req.body;
    const versionId = req.params.id;

    try {
        const screenshotUrl = saveBase64Image(req.body.screenshot);

        const result = db.prepare(`
            INSERT INTO review_comments(version_id, page_number, x, y, width, height, type, content, author_name, author_email, parent_id, screenshot_url)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(versionId, page_number, x, y, width || null, height || null, type || 'comment', content, author_name, author_email, parent_id || null, screenshotUrl);

        // REMOVED: Implicit status update to 'changes_requested'
        // We now enforce status changes ONLY through explicit actions.

        const newComment = db.prepare('SELECT * FROM review_comments WHERE id = ?').get(result.lastInsertRowid);

        // Log activity and create notification
        const version = db.prepare(`
            SELECT rv.*, r.project_id, p.name as project_name 
            FROM review_versions rv
            JOIN reviews r ON rv.review_id = r.id
            JOIN projects p ON r.project_id = p.id
            WHERE rv.id = ?
    `).get(versionId);

        logActivity('project', version.project_id, 'review_comment_added', { versionId, author: author_name });

        createNotification(
            'project',
            'Review Comment',
            `${author_name} added feedback on ${version.project_name} (Version ${version.version_number})`,
            `/ review / ${version.token} `
        );

        res.json(newComment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/public/reviews/versions/:id/approve', (req, res) => {
    const { name: author_name, email: author_email } = req.body;
    const versionId = req.params.id;

    try {
        db.prepare(`
            UPDATE review_versions 
            SET status = 'approved',
    approved_at = CURRENT_TIMESTAMP,
    approved_by_name = ?,
    approved_by_email = ?
        WHERE id = ?
            `).run(author_name, author_email, versionId);

        const version = db.prepare(`
            SELECT rv.*, r.project_id, r.id as review_id, p.name as project_name 
            FROM review_versions rv
            JOIN reviews r ON rv.review_id = r.id
            JOIN projects p ON r.project_id = p.id
            WHERE rv.id = ?
    `).get(versionId);

        // Sync parent review status
        db.prepare(`
            UPDATE reviews 
            SET status = 'approved',
    updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
    `).run(version.review_id);

        logActivity('project', version.project_id, 'review_approved', { versionId, approvedBy: author_name });

        createNotification(
            'project',
            'Review Approved',
            `${author_name} approved ${version.project_name} (Version ${version.version_number})`,
            `/ review / ${version.token} `
        );

        createNotification(
            'project',
            'Project Updated',
            `Review for ${version.project_name} has been approved.`,
            `/ projects / ${version.project_id} `
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/public/review/:token/request-changes', (req, res) => {
    const { token } = req.params;
    const { name: author_name, email: author_email } = req.body;

    try {
        const version = db.prepare(`
            SELECT rv.*, r.project_id, r.id as review_id, p.name as project_name, p.review_limit, r.revisions_used, r.review_policy
            FROM review_versions rv
            JOIN reviews r ON rv.review_id = r.id
            JOIN projects p ON r.project_id = p.id
            WHERE rv.token = ?
    `).get(token);

        if (!version) return res.status(404).json({ error: 'Review not found' });

        // Enforce limit server-side
        const limit = version.review_limit ?? 3;
        if (version.revisions_used >= limit) {
            if (version.review_policy === 'strict') {
                return res.status(403).json({ error: 'Revision limit reached. No more changes can be requested.' });
            }
        }

        db.prepare(`
            UPDATE review_versions 
            SET status = 'changes_requested'
            WHERE id = ?
    `).run(version.id);

        db.prepare(`
            UPDATE reviews 
            SET status = 'changes_requested',
    unread_count = unread_count + 1,
    revisions_used = revisions_used + 1,
    updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
    `).run(version.review_id);

        logActivity('project', version.project_id, 'review_feedback', { versionId: version.id, author: author_name });

        createNotification(
            'project',
            'Feedback Received',
            `${author_name} requested changes on ${version.project_name} (Version ${version.version_number})`,
            `/ review / ${version.token} `
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reviews/:id/read', (req, res) => {
    try {
        db.prepare('UPDATE reviews SET unread_count = 0 WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reviews/versions/:id/comments', (req, res) => {
    try {
        const comments = db.prepare('SELECT * FROM review_comments WHERE version_id = ? ORDER BY created_at ASC').all(req.params.id);
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export review version as JSON
app.get('/api/reviews/versions/:id/export', (req, res) => {
    try {
        const comments = db.prepare(`
SELECT * FROM review_comments 
            WHERE version_id = ?
    ORDER BY page_number ASC, created_at ASC
        `).all(req.params.id);
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update review comment
app.put('/api/review-comments/:id', (req, res) => {
    try {
        const { content, is_resolved, resolved_by, resolved_at } = req.body;
        const updates = [];
        const params = [];

        if (content !== undefined) {
            updates.push('content = ?');
            params.push(content);
        }
        if (is_resolved !== undefined) {
            updates.push('is_resolved = ?');
            params.push(is_resolved);
        }
        if (resolved_by !== undefined) {
            updates.push('resolved_by = ?');
            params.push(resolved_by);
        }
        if (resolved_at !== undefined) {
            updates.push('resolved_at = ?');
            params.push(resolved_at);
        }

        if (updates.length > 0) {
            params.push(req.params.id);
            db.prepare(`UPDATE review_comments SET ${updates.join(', ')} WHERE id = ? `).run(...params);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create comment reply
app.post('/api/reviews/versions/:versionId/comments', (req, res) => {
    const { page_number, x, y, width, height, type, content, created_by, parent_id } = req.body;
    const versionId = req.params.versionId; // Changed from req.params.id to req.params.versionId

    try {
        const screenshotUrl = saveBase64Image(req.body.screenshot);

        const result = db.prepare(`
            INSERT INTO review_comments(version_id, page_number, x, y, width, height, type, content, created_by, parent_id, screenshot_url)
VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(versionId, page_number, x, y, width || null, height || null, type || 'comment', content, created_by || 'System', parent_id || null, screenshotUrl);

        const newComment = db.prepare('SELECT * FROM review_comments WHERE id = ?').get(result.lastInsertRowid);
        res.json(newComment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/review-comments/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM review_comments WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.put('/api/reviews/:id/pin', (req, res) => {
    const { pin_code } = req.body;
    try {
        db.prepare('UPDATE reviews SET pin_code = ? WHERE id = ?').run(pin_code || null, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/reviews/comments/:id/resolve', (req, res) => {
    const { resolved_by } = req.body;
    try {
        db.prepare(`
            UPDATE review_comments 
            SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP, resolved_by = ?
    WHERE id = ?
        `).run(resolved_by || 'System', req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reviews/comments/:id/convert-task', (req, res) => {
    try {
        const comment = db.prepare(`
            SELECT rc.*, r.project_id 
            FROM review_comments rc
            JOIN reviews r ON rc.review_id = r.id
            WHERE rc.id = ?
    `).get(req.params.id);

        if (!comment) return res.status(404).json({ error: 'Comment not found' });

        const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM tasks WHERE project_id = ?').get(comment.project_id).max || 0;
        const result = db.prepare(`
            INSERT INTO tasks(project_id, title, description, status, due_date, priority, sort_order)
VALUES(?, ?, ?, ?, ?, ?, ?)
        `).run(
            comment.project_id,
            `Review Task: ${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''} `,
            comment.content,
            'todo',
            null,
            'medium',
            maxOrder + 1
        );

        // Mark comment as resolved when converted to task
        db.prepare('UPDATE review_comments SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP, resolved_by = "System (Task Conversion)" WHERE id = ?').run(req.params.id);

        res.json({ success: true, taskId: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export Review Feedback
app.get('/api/reviews/:id/export', (req, res) => {
    try {
        const reviewId = req.params.id;
        const review = db.prepare(`
            SELECT r.*, p.name as project_name 
            FROM reviews r
            JOIN projects p ON r.project_id = p.id
            WHERE r.id = ?
    `).get(reviewId);

        if (!review) return res.status(404).json({ error: 'Review not found' });

        const comments = db.prepare(`
            SELECT * FROM review_comments 
            WHERE review_id = ?
    ORDER BY created_at ASC
        `).all(reviewId);

        // Build hierarchy
        const commentMap = {};
        const roots = [];

        comments.forEach(c => {
            commentMap[c.id] = { ...c, replies: [] };
        });

        comments.forEach(c => {
            if (c.parent_id && commentMap[c.parent_id]) {
                commentMap[c.parent_id].replies.push(commentMap[c.id]);
            } else {
                roots.push(commentMap[c.id]);
            }
        });

        const exportData = {
            review_info: {
                project_name: review.project_name,
                version: review.version,
                status: review.status,
                created_at: review.created_at,
                approved_at: review.approved_at,
                approved_by: review.approved_by_name
            },
            feedback: roots
        };

        res.json(exportData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TASKS ---
app.post('/api/projects/:id/tasks', (req, res) => {
    const { title, description, status, due_date, priority } = req.body;
    const projectId = req.params.id;
    try {
        const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM tasks WHERE project_id = ?').get(projectId).max || 0;
        const result = db.prepare(`
            INSERT INTO tasks(project_id, title, description, status, due_date, priority, sort_order)
VALUES(?, ?, ?, ?, ?, ?, ?)
    `).run(projectId, title, description || null, status || 'todo', due_date || null, priority || 'medium', maxOrder + 1);
        res.json({ id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tasks/:id', (req, res) => {
    const { title, description, status, due_date, priority, completed } = req.body;
    try {
        db.prepare(`
            UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ?, priority = ?, completed = ? WHERE id = ?
    `).run(title, description || null, status || 'todo', due_date || null, priority || 'medium', completed ? 1 : 0, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tasks/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id/tasks/reorder', (req, res) => {
    const { taskIds } = req.body;
    try {
        const updateOrder = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ?');
        db.transaction(() => {
            taskIds.forEach((id, index) => updateOrder.run(index, id));
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DASHBOARD ---
app.get('/api/dashboard/stats', (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

        // Debug Logging Helper
        const logDebug = (msg, data) => {
            console.log(`[Dashboard Stats Debug] ${msg}:`, JSON.stringify(data, null, 2));
        };

        // Basic stats
        const draftCount = db.prepare("SELECT COUNT(*) as count FROM offers WHERE status = 'draft' AND archived_at IS NULL AND deleted_at IS NULL").get().count;
        const pendingCount = db.prepare("SELECT COUNT(*) as count FROM offers WHERE status = 'sent' AND archived_at IS NULL AND deleted_at IS NULL").get().count;
        const signedCount = db.prepare("SELECT COUNT(*) as count FROM offers WHERE status = 'signed' AND archived_at IS NULL AND deleted_at IS NULL").get().count;

        // Financials
        const totalOpenValue = db.prepare("SELECT SUM(total) as sum FROM offers WHERE status IN ('draft', 'sent') AND archived_at IS NULL AND deleted_at IS NULL").get().sum || 0;
        const forecastPending = db.prepare("SELECT SUM(total) as sum FROM offers WHERE status = 'sent' AND archived_at IS NULL AND deleted_at IS NULL").get().sum || 0;

        // Profit estimates
        const signedCost = db.prepare(`
            SELECT SUM(oi.quantity * COALESCE(s.cost_price, 0)) as cost
            FROM offer_items oi
            JOIN offers o ON oi.offer_id = o.id
            LEFT JOIN services s ON oi.service_id = s.id
            WHERE o.status = 'signed' AND o.archived_at IS NULL AND o.deleted_at IS NULL
    `).get().cost || 0;
        const signedRevenue = db.prepare("SELECT SUM(subtotal) as sum FROM offers WHERE status = 'signed' AND archived_at IS NULL AND deleted_at IS NULL").get().sum || 0;
        const profitEstimate = signedRevenue - signedCost;

        // Monthly data for chart (last 6 months)
        const monthlyPerformance = db.prepare(`
            SELECT strftime('%Y-%m', COALESCE(signed_at, created_at)) as month, SUM(total) as total, COUNT(*) as count
            FROM offers
            WHERE status = 'signed' AND archived_at IS NULL AND deleted_at IS NULL
            GROUP BY month
            ORDER BY month DESC
            LIMIT 6
    `).all().map(row => ({
            ...row,
            month: row.month || 'Unknown'
        })).reverse();

        // Month specific metrics
        const signedThisMonthCount = db.prepare("SELECT COUNT(*) as count FROM offers WHERE status = 'signed' AND COALESCE(signed_at, created_at) >= ? AND archived_at IS NULL AND deleted_at IS NULL").get(startOfMonth).count;
        const revenueThisMonth = db.prepare("SELECT SUM(total) as sum FROM offers WHERE status = 'signed' AND COALESCE(signed_at, created_at) >= ? AND archived_at IS NULL AND deleted_at IS NULL").get(startOfMonth).sum || 0;

        const projectsInProgress = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'in_progress' AND archived_at IS NULL AND deleted_at IS NULL").get().count;
        const overdueProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status != 'done' AND deadline < date('now') AND archived_at IS NULL AND deleted_at IS NULL").get().count;
        const avgOfferValueMonth = db.prepare("SELECT AVG(total) as avg FROM offers WHERE created_at >= ? AND archived_at IS NULL AND deleted_at IS NULL").get(startOfMonth).avg || 0;

        // Avg Monthly Income
        const firstSignedDate = db.prepare("SELECT MIN(COALESCE(signed_at, created_at)) as date FROM offers WHERE status = 'signed' AND archived_at IS NULL AND deleted_at IS NULL").get().date;
        let monthsActive = 1;
        if (firstSignedDate) {
            const start = new Date(firstSignedDate);
            const today = new Date();
            monthsActive = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth()) + 1;
            if (monthsActive < 1) monthsActive = 1;
        }
        const avgMonthlyIncome = signedRevenue / monthsActive;

        const expiringOffers = db.prepare(`
            SELECT o.id, o.offer_name, c.company_name, o.due_date, o.total
            FROM offers o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.status = 'sent' 
            AND o.due_date IS NOT NULL
            AND o.due_date <= date('now', '+7 days')
            AND o.archived_at IS NULL AND o.deleted_at IS NULL
            ORDER BY o.due_date ASC
            LIMIT 5
    `).all();
        const expiringSoonCount = expiringOffers.length;

        // Top categories
        const topCategories = db.prepare(`
            SELECT COALESCE(s.category, 'Other') as category, SUM(oi.total_price) as revenue
            FROM offer_items oi
            JOIN offers o ON oi.offer_id = o.id
            LEFT JOIN services s ON oi.service_id = s.id
            WHERE o.status = 'signed' AND o.archived_at IS NULL AND o.deleted_at IS NULL
            GROUP BY COALESCE(s.category, 'Other')
            ORDER BY revenue DESC
            LIMIT 5
    `).all();

        // Lead time
        const avgLeadTimeRaw = db.prepare(`
            SELECT AVG(julianday(COALESCE(signed_at, updated_at)) - julianday(created_at)) as avg_days
            FROM offers
            WHERE status = 'signed' AND archived_at IS NULL AND deleted_at IS NULL
    `).get().avg_days;
        const avgLeadTime = avgLeadTimeRaw || 0;

        // Old drafts
        const oldDraftsCount = db.prepare(`
            SELECT COUNT(*) as count FROM offers
            WHERE status = 'draft' AND created_at <= date('now', '-3 days') AND archived_at IS NULL AND deleted_at IS NULL
    `).get().count;

        // Top clients
        const topClients = db.prepare(`
            SELECT c.company_name, SUM(o.total) as revenue
            FROM offers o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.status = 'signed' AND COALESCE(o.signed_at, o.created_at) >= ? AND o.archived_at IS NULL AND o.deleted_at IS NULL
            GROUP BY c.id
            ORDER BY revenue DESC
            LIMIT 5
    `).all(startOfYear);

        const recentActivity = db.prepare('SELECT * FROM global_activities ORDER BY created_at DESC LIMIT 10').all().map(a => ({
            ...a,
            metadata: JSON.parse(a.metadata || '{}')
        }));

        // Project stats
        const activeProjectCount = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status IN ('todo', 'in_progress', 'feedback') AND archived_at IS NULL AND deleted_at IS NULL").get().count;
        const overdueProjectCount = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status IN ('todo', 'in_progress', 'feedback') AND deadline IS NOT NULL AND deadline < date('now') AND archived_at IS NULL AND deleted_at IS NULL").get().count;
        const projectsByStatus = db.prepare("SELECT status, COUNT(*) as count FROM projects WHERE archived_at IS NULL AND deleted_at IS NULL GROUP BY status").all();

        const reminderStats = checkReminders();

        // 1. Month-over-Month Revenue Growth
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const lastMonthEnd = startOfMonth;

        const currentMonthRevenue = db.prepare("SELECT SUM(total) as total FROM offers WHERE status = 'signed' AND COALESCE(signed_at, created_at) >= ? AND archived_at IS NULL AND deleted_at IS NULL").get(startOfMonth).total || 0;
        const lastMonthRevenue = db.prepare("SELECT SUM(total) as total FROM offers WHERE status = 'signed' AND COALESCE(signed_at, created_at) >= ? AND COALESCE(signed_at, created_at) < ? AND archived_at IS NULL AND deleted_at IS NULL").get(lastMonthStart, lastMonthEnd).total || 0;

        let momGrowth = 0;
        if (lastMonthRevenue > 0) {
            momGrowth = ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
        } else if (currentMonthRevenue > 0) {
            momGrowth = 100; // 100% growth if started from 0
        }

        // 2. Win Rate (Last 90 Days)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const winRateStats = db.prepare(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'signed' THEN 1 ELSE 0 END) as signed
            FROM offers 
            WHERE status IN ('signed', 'declined')
            AND (COALESCE(signed_at, updated_at) >= ?)
            AND archived_at IS NULL AND deleted_at IS NULL
    `).get(ninetyDaysAgo.toISOString());

        const winRate = winRateStats.total > 0 ? Math.round((winRateStats.signed / winRateStats.total) * 100) : 0;

        // 3. Average Deal Size
        const avgDealSize = db.prepare("SELECT AVG(total) as avg FROM offers WHERE status = 'signed' AND archived_at IS NULL AND deleted_at IS NULL").get().avg || 0;

        // --- REFINED ANALYTICS ---

        // Top Services by Revenue
        // Rule: Group by service_id AND item_name as fallback
        const topServicesByRevenue = db.prepare(`
            SELECT 
                COALESCE(s.name_de, oi.item_name, 'Unknown Service') as name, 
                SUM(oi.total_price) as revenue
            FROM offer_items oi
            JOIN offers o ON oi.offer_id = o.id
            LEFT JOIN services s ON oi.service_id = s.id
            WHERE o.status = 'signed' AND o.archived_at IS NULL AND o.deleted_at IS NULL
            GROUP BY name
            ORDER BY revenue DESC
            LIMIT 5
        `).all();

        // Top Services by Count
        // Rule: Use SUM(quantity) as requested
        const topServicesByCount = db.prepare(`
            SELECT 
                COALESCE(s.name_de, oi.item_name, 'Unknown Service') as name, 
                SUM(oi.quantity) as count
            FROM offer_items oi
            JOIN offers o ON oi.offer_id = o.id
            LEFT JOIN services s ON oi.service_id = s.id
            WHERE o.status = 'signed' AND o.archived_at IS NULL AND o.deleted_at IS NULL
            GROUP BY name
            ORDER BY count DESC
            LIMIT 5
        `).all();

        // Total Signed Services Count (for KPI)
        // Rule: Count of all service line items in signed offers
        const totalSignedServicesCount = db.prepare(`
            SELECT COUNT(*) as count
            FROM offer_items oi
            JOIN offers o ON oi.offer_id = o.id
            WHERE o.status = 'signed' AND o.archived_at IS NULL AND o.deleted_at IS NULL
        `).get().count;

        // Debug Logging for Validation
        if (signedCount > 0) {
            logDebug('Signed Offers Found', { signedCount });
            logDebug('Top Services by Revenue', topServicesByRevenue);
            logDebug('Top Services by Count', topServicesByCount);

            if (topServicesByRevenue.length === 0) {
                console.warn('[Dashboard Warning] Signed offers exist but no service items were found for analytics.');
            }
        } else {
            logDebug('No Signed Offers Found', {});
        }

        res.json({
            summary: { draftCount, pendingCount, signedCount, winRate, avgDealSize, totalSignedServicesCount },
            financials: { totalOpenValue, forecastPending, profitEstimate, signedRevenue, momGrowth },
            performance: { monthlyPerformance, avgOfferValueMonth, signedThisMonthCount, avgMonthlyIncome, revenueThisMonth },
            alerts: { expiringSoonCount, oldDraftsCount, expiringOffers },
            analytics: { topCategories, topClients, recentActivity, topServicesByRevenue, topServicesByCount },
            projects: { activeProjectCount, overdueProjectCount, projectsByStatus }
        });
    } catch (err) {
        console.error('[API] Dashboard Stats Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- PACKAGES ---
app.get('/api/packages', (req, res) => {
    try {
        const packages = db.prepare('SELECT * FROM packages WHERE deleted_at IS NULL').all();
        const items = db.prepare('SELECT * FROM package_items').all();
        const allServices = db.prepare('SELECT id, name_de, name_fr, price FROM services').all();
        const allVariants = db.prepare('SELECT id, service_id, name, name_de, name_fr, price FROM service_variants').all();

        const packagesWithItems = packages.map(p => {
            const packageItems = items.filter(it => it.package_id === p.id).map(it => {
                const service = allServices.find(s => s.id === it.service_id);
                const variant = it.variant_name ? allVariants.find(v => v.service_id === it.service_id && (v.name === it.variant_name || v.name_de === it.variant_name)) : null;

                const basePrice = variant ? variant.price : (service ? service.price : 0);
                const discountedItemPrice = basePrice * (1 - (it.discount_percent || 0) / 100);

                return {
                    ...it,
                    service_name: service ? service.name_de : 'Unknown',
                    price: basePrice,
                    discounted_price: discountedItemPrice
                };
            });

            const originalTotal = packageItems.reduce((sum, it) => sum + it.price, 0);
            const itemsTotalAfterItemDiscounts = packageItems.reduce((sum, it) => sum + it.discounted_price, 0);

            let finalTotal = itemsTotalAfterItemDiscounts;
            if (p.discount_type === 'percent') {
                finalTotal = itemsTotalAfterItemDiscounts * (1 - (p.discount_value || 0) / 100);
            } else if (p.discount_type === 'fixed') {
                finalTotal = Math.max(0, itemsTotalAfterItemDiscounts - (p.discount_value || 0));
            }

            return {
                ...p,
                items: packageItems,
                original_total: originalTotal,
                final_total: finalTotal,
                discount_amount: originalTotal - finalTotal
            };
        });

        res.json(packagesWithItems);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PRINT PARAMETERS ---
app.get('/api/print-parameters', (req, res) => {
    try {
        const { key } = req.query;
        let query = 'SELECT * FROM print_parameters WHERE active = 1';
        const params = [];
        if (key) {
            query += ' AND spec_key = ?';
            params.push(key);
        }
        query += ' ORDER BY sort_order ASC, value ASC';
        const paramsList = db.prepare(query).all(...params);
        res.json(paramsList);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/print-parameters', (req, res) => {
    const { spec_key, value, sort_order } = req.body;
    try {
        const result = db.prepare(`
            INSERT INTO print_parameters (spec_key, value, sort_order)
            VALUES (?, ?, ?)
        `).run(spec_key, value, sort_order || 0);
        res.json({ id: result.lastInsertRowid, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/print-parameters/:id', (req, res) => {
    const { id } = req.params;
    const { spec_key, value, sort_order, active } = req.body;
    try {
        db.prepare(`
            UPDATE print_parameters 
            SET spec_key = ?, value = ?, sort_order = ?, active = ?
            WHERE id = ?
        `).run(spec_key, value, sort_order, active !== undefined ? active : 1, id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/print-parameters/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM print_parameters WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PRINT PRODUCTS ---
app.get('/api/print-products', (req, res) => {
    try {
        const { search, status, show_deleted } = req.query;
        let query = 'SELECT * FROM print_products WHERE 1=1';
        const params = [];

        if (show_deleted !== 'true') {
            query += ' AND deleted_at IS NULL';
        }

        if (status === 'active') {
            query += ' AND active = 1';
        } else if (status === 'inactive') {
            query += ' AND active = 0';
        }

        if (search) {
            query += ' AND (name LIKE ? OR category LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const products = db.prepare(query).all(...params);

        const fullProducts = products.map(p => {
            // Parse JSON fields
            const allowed_specs = p.allowed_specs_json ? JSON.parse(p.allowed_specs_json) : {};
            const default_specs = p.default_specs_json ? JSON.parse(p.default_specs_json) : {};

            // Legacy support (still return optionSets if they exist)
            const optionSets = db.prepare('SELECT * FROM print_product_option_sets WHERE print_product_id = ? AND active = 1').all(p.id)
                .map(os => {
                    const values = db.prepare('SELECT * FROM print_product_option_values WHERE option_set_id = ?').all(os.id);
                    return { ...os, values };
                });

            if (optionSets.length === 0) {
                // Return a template if no option sets exist
                optionSets.push({
                    id: -1,
                    print_product_id: p.id,
                    name: 'Standard',
                    is_default: 1,
                    active: 1,
                    values: Object.entries(default_specs).map(([k, v]) => ({ option_key: k, value: v }))
                });
            }

            return { ...p, default_specs, optionSets };
        });

        res.json(fullProducts);
    } catch (err) {
        console.error('Get print products error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/print-products/:id', (req, res) => {
    try {
        const { id } = req.params;
        const product = db.prepare('SELECT * FROM print_products WHERE id = ?').get(id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const allowed_specs = product.allowed_specs_json ? JSON.parse(product.allowed_specs_json) : {};
        const default_specs = product.default_specs_json ? JSON.parse(product.default_specs_json) : {};

        const optionSets = db.prepare('SELECT * FROM print_product_option_sets WHERE print_product_id = ?').all(id)
            .map(os => {
                const values = db.prepare('SELECT * FROM print_product_option_values WHERE option_set_id = ?').all(os.id);
                return { ...os, values };
            });

        if (optionSets.length === 0) {
            optionSets.push({
                id: -1,
                print_product_id: parseInt(id),
                name: 'Standard',
                is_default: 1,
                active: 1,
                values: Object.entries(default_specs).map(([k, v]) => ({ option_key: k, value: v }))
            });
        }

        res.json({ ...product, allowed_specs, default_specs, optionSets });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/print-products', (req, res) => {
    const { name, category, description, unit_label, active, default_specs, allowed_specs } = req.body;

    try {
        const productRes = db.prepare(`
            INSERT INTO print_products (name, category, description, unit_label, active, default_specs_json, allowed_specs_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            name,
            category || null,
            description || null,
            unit_label || 'pcs',
            active !== undefined ? active : 1,
            default_specs ? JSON.stringify(default_specs) : null,
            allowed_specs ? JSON.stringify(allowed_specs) : null
        );

        res.json({ id: productRes.lastInsertRowid, success: true });
    } catch (err) {
        console.error('Create print product error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/print-products/:id', (req, res) => {
    const { id } = req.params;
    const { name, category, description, unit_label, active, default_specs, allowed_specs } = req.body;

    try {
        db.prepare(`
            UPDATE print_products 
            SET name = ?, category = ?, description = ?, unit_label = ?, active = ?, default_specs_json = ?, allowed_specs_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            name,
            category || null,
            description || null,
            unit_label || 'pcs',
            active !== undefined ? active : 1,
            default_specs ? JSON.stringify(default_specs) : null,
            allowed_specs ? JSON.stringify(allowed_specs) : null,
            id
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Update print product error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/print-products/:id', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('UPDATE print_products SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/print-products/:id/restore', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('UPDATE print_products SET deleted_at = NULL WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- FILE UPLOADS ---
// (Already defined above)

app.post('/api/packages', (req, res) => {
    console.log('POST /api/packages payload:', req.body);
    const { name, description, items, discount_type, discount_value } = req.body;
    try {
        const transaction = db.transaction(() => {
            const result = db.prepare(`
                INSERT INTO packages(name, description, discount_type, discount_value)
VALUES(?, ?, ?, ?)
            `).run(name, description || '', discount_type || 'percent', discount_value || 0);

            const packageId = result.lastInsertRowid;

            if (items && Array.isArray(items)) {
                const insertItem = db.prepare('INSERT INTO package_items (package_id, service_id, variant_name, discount_percent) VALUES (?, ?, ?, ?)');
                for (const item of items) {
                    if (typeof item === 'object') {
                        insertItem.run(packageId, item.service_id, item.variant_name || null, item.discount_percent || 0);
                    } else {
                        insertItem.run(packageId, item, null, 0);
                    }
                }
            }
            return packageId;
        });

        const id = transaction();
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/packages/:id', (req, res) => {
    const { name, description, items, discount_type, discount_value } = req.body;
    const packageId = req.params.id;
    try {
        db.transaction(() => {
            db.prepare('UPDATE packages SET name = ?, description = ?, discount_type = ?, discount_value = ? WHERE id = ?')
                .run(name, description || '', discount_type || 'percent', discount_value || 0, packageId);
            db.prepare('DELETE FROM package_items WHERE package_id = ?').run(packageId);

            if (items && Array.isArray(items)) {
                const insertItem = db.prepare('INSERT INTO package_items (package_id, service_id, variant_name, discount_percent) VALUES (?, ?, ?, ?)');
                for (const item of items) {
                    if (typeof item === 'object') {
                        insertItem.run(packageId, item.service_id, item.variant_name || null, item.discount_percent || 0);
                    } else {
                        insertItem.run(packageId, item, null, 0);
                    }
                }
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/packages/:id', (req, res) => {
    try {
        db.prepare('UPDATE packages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ARCHIVING ---
app.post('/api/:resource/:id/archive', (req, res) => {
    const { resource, id } = req.params;
    const validResources = ['offers', 'projects', 'customers', 'services', 'packages'];
    if (!validResources.includes(resource)) return res.status(400).json({ error: 'Invalid resource' });

    try {
        db.transaction(() => {
            db.prepare(`UPDATE ${resource} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? `).run(id);

            if (resource === 'customers') {
                // Cascading Archive: Customer -> Projects -> Offers
                db.prepare(`UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE customer_id = ? `).run(id);
                db.prepare(`UPDATE offers SET deleted_at = CURRENT_TIMESTAMP WHERE customer_id = ? `).run(id);
            }

            logActivity(resource.slice(0, -1), id, 'archived', {});
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// REMOVED REDUNDANT RESTORE ENDPOINT

app.get('/api/archive', (req, res) => {
    try {
        const customers = db.prepare("SELECT 'customers' as type, id, company_name as name, archived_at as date FROM customers WHERE archived_at IS NOT NULL AND deleted_at IS NULL").all();
        const offers = db.prepare("SELECT 'offers' as type, id, offer_name as name, archived_at as date FROM offers WHERE archived_at IS NOT NULL AND deleted_at IS NULL").all();
        const projects = db.prepare("SELECT 'projects' as type, id, name, archived_at as date FROM projects WHERE archived_at IS NOT NULL AND deleted_at IS NULL").all();
        const services = db.prepare("SELECT 'services' as type, id, name_de as name, archived_at as date FROM services WHERE archived_at IS NOT NULL AND deleted_at IS NULL").all();

        const combined = [...customers, ...offers, ...projects, ...services]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(combined);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUDIT ---
app.get('/api/audit/checks', (req, res) => {
    try {
        const issues = [];

        // Offers without linked project
        const offersNoProject = db.prepare(`
            SELECT o.id, o.offer_name, o.status 
            FROM offers o 
            LEFT JOIN projects p ON o.id = p.offer_id 
            WHERE o.status = 'signed' AND p.id IS NULL AND o.archived_at IS NULL
    `).all();
        offersNoProject.forEach(o => issues.push({
            type: 'offer',
            id: o.id,
            title: o.offer_name,
            description: 'Signed offer has no linked project',
            severity: 'high',
            offerId: o.id
        }));

        // Projects without customer
        const projectsNoCustomer = db.prepare(`
            SELECT id, name FROM projects WHERE customer_id IS NULL AND archived_at IS NULL
    `).all();
        projectsNoCustomer.forEach(p => issues.push({
            type: 'project',
            id: p.id,
            title: p.name,
            description: 'Project is missing a customer link',
            severity: 'high',
            projectId: p.id
        }));

        // Offers marked signed but missing signature data
        const signedNoSignature = db.prepare(`
            SELECT id, offer_name FROM offers 
            WHERE status = 'signed' AND signature_data IS NULL AND archived_at IS NULL
    `).all();

        signedNoSignature.forEach(o => issues.push({
            type: 'offer',
            id: o.id,
            title: o.offer_name,
            description: 'Offer is signed but missing signature data',
            severity: 'medium',
            offerId: o.id
        }));

        // Stale Drafts (> 30 days)
        const staleDrafts = db.prepare(`
            SELECT id, offer_name FROM offers 
            WHERE status = 'draft' 
            AND date(updated_at) < date('now', '-30 days')
            AND archived_at IS NULL
    `).all();
        staleDrafts.forEach(o => issues.push({
            type: 'offer',
            id: o.id,
            title: o.offer_name,
            description: 'Draft has been inactive for over 30 days',
            severity: 'low',
            offerId: o.id
        }));

        // Active Projects without Offer
        const projectsNoOffer = db.prepare(`
            SELECT id, name FROM projects 
            WHERE status IN('todo', 'in_progress') 
            AND offer_id IS NULL 
            AND archived_at IS NULL
        `).all();
        projectsNoOffer.forEach(p => issues.push({
            type: 'project',
            id: p.id,
            title: p.name,
            description: 'Active project has no linked financial offer',
            severity: 'medium',
            projectId: p.id
        }));

        res.json({ issues });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TRASH BIN & RESTORE ---
app.get('/api/trash', (req, res) => {
    try {
        const customers = db.prepare("SELECT 'customers' as type, id, company_name as name, deleted_at FROM customers WHERE deleted_at IS NOT NULL").all();
        const offers = db.prepare("SELECT 'offers' as type, id, offer_name as name, deleted_at FROM offers WHERE deleted_at IS NOT NULL").all();
        const projects = db.prepare("SELECT 'projects' as type, id, name, deleted_at FROM projects WHERE deleted_at IS NOT NULL").all();
        const services = db.prepare("SELECT 'services' as type, id, name_de as name, deleted_at FROM services WHERE deleted_at IS NOT NULL").all();
        const packages = db.prepare("SELECT 'packages' as type, id, name, deleted_at FROM packages WHERE deleted_at IS NOT NULL").all();
        const reviews = db.prepare("SELECT 'reviews' as type, id, (SELECT title FROM reviews r2 WHERE r2.id = reviews.id) as name, deleted_at FROM reviews WHERE deleted_at IS NOT NULL").all();

        const allTrash = [...customers, ...offers, ...projects, ...services, ...packages, ...reviews]
            .sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

        res.json(allTrash);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/:resource/:id/restore', (req, res) => {
    const { resource, id } = req.params;
    const allowed = ['customers', 'offers', 'projects', 'services', 'packages', 'reviews'];
    if (!allowed.includes(resource)) return res.status(400).json({ error: 'Invalid resource' });

    try {
        db.transaction(() => {
            db.prepare(`UPDATE ${resource} SET deleted_at = NULL WHERE id = ? `).run(id);

            if (resource === 'customers') {
                db.prepare('UPDATE projects SET deleted_at = NULL WHERE customer_id = ?').run(id);
                db.prepare('UPDATE offers SET deleted_at = NULL WHERE customer_id = ?').run(id);
                db.prepare('UPDATE reviews SET deleted_at = NULL WHERE project_id IN (SELECT id FROM projects WHERE customer_id = ?)').run(id);
            }
            if (resource === 'projects') {
                db.prepare('UPDATE reviews SET deleted_at = NULL WHERE project_id = ?').run(id);
            }
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/:resource/:id/permanent', (req, res) => {
    const { resource, id } = req.params;
    const allowed = ['customers', 'offers', 'projects', 'services', 'packages', 'reviews'];
    if (!allowed.includes(resource)) return res.status(400).json({ error: 'Invalid resource' });

    try {
        const trans = db.transaction(() => {
            // Cleanup references to avoid FK constraints
            if (resource === 'offers') {
                db.prepare('UPDATE projects SET offer_id = NULL WHERE offer_id = ?').run(id);
            }
            if (resource === 'customers') {
                db.prepare('UPDATE offers SET customer_id = NULL WHERE customer_id = ?').run(id);
                db.prepare('UPDATE projects SET customer_id = NULL WHERE customer_id = ?').run(id);
            }
            if (resource === 'services') {
                db.prepare('DELETE FROM offer_items WHERE service_id = ?').run(id);
            }

            db.prepare(`DELETE FROM ${resource} WHERE id = ? `).run(id);
        });
        trans();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/trash/empty', (req, res) => {
    try {
        // Must be outside transaction
        db.pragma('foreign_keys = OFF');

        try {
            const trans = db.transaction(() => {
                // 1. Precise Cleanup of known references
                db.prepare('UPDATE projects SET offer_id = NULL WHERE offer_id IN (SELECT id FROM offers WHERE deleted_at IS NOT NULL)').run();
                db.prepare('UPDATE projects SET customer_id = NULL WHERE customer_id IN (SELECT id FROM customers WHERE deleted_at IS NOT NULL)').run();
                db.prepare('UPDATE offers SET customer_id = NULL WHERE customer_id IN (SELECT id FROM customers WHERE deleted_at IS NOT NULL)').run();
                db.prepare('DELETE FROM offer_items WHERE service_id IN (SELECT id FROM services WHERE deleted_at IS NOT NULL)').run();
                db.prepare('DELETE FROM package_items WHERE service_id IN (SELECT id FROM services WHERE deleted_at IS NOT NULL)').run();
                db.prepare('DELETE FROM package_items WHERE package_id IN (SELECT id FROM packages WHERE deleted_at IS NOT NULL)').run();

                // 2. Repair pre-existing orphans
                db.prepare('UPDATE offers SET customer_id = NULL WHERE customer_id > 0 AND customer_id NOT IN (SELECT id FROM customers)').run();
                db.prepare('UPDATE projects SET customer_id = NULL WHERE customer_id > 0 AND customer_id NOT IN (SELECT id FROM customers)').run();

                // 3. Purge everything in trash
                const tables = ['projects', 'offers', 'customers', 'services', 'packages', 'reviews'];
                for (const table of tables) {
                    db.prepare(`DELETE FROM ${table} WHERE deleted_at IS NOT NULL`).run();
                }
            });
            trans();
        } finally {
            db.pragma('foreign_keys = ON');
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Trash Purge Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/search', (req, res) => {
    const q = req.query.q;
    if (!q) return res.json([]);
    const term = `% ${q}% `;
    try {
        const results = [];
        // Projects
        const projects = db.prepare("SELECT id, name as title, 'project' as type FROM projects WHERE name LIKE ? AND deleted_at IS NULL").all(term);
        // Offers
        const offers = db.prepare("SELECT id, offer_name as title, 'offer' as type FROM offers WHERE offer_name LIKE ? AND deleted_at IS NULL").all(term);
        // Customers
        const customers = db.prepare("SELECT id, company_name as title, 'customer' as type FROM customers WHERE (company_name LIKE ? OR first_name LIKE ? OR last_name LIKE ?) AND deleted_at IS NULL").all(term, term, term);
        // Services
        const services = db.prepare("SELECT id, name_de as title, 'service' as type FROM services WHERE (name_de LIKE ? OR name_fr LIKE ?) AND deleted_at IS NULL").all(term, term);
        // Packages
        const packages = db.prepare("SELECT id, name as title, 'bundle' as type FROM packages WHERE name LIKE ? AND deleted_at IS NULL").all(term);

        res.json([...projects, ...offers, ...customers, ...services, ...packages]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
});

// --- ATTACHMENTS ---
app.get('/api/:entityType/:entityId/attachments', (req, res) => {
    const { entityType, entityId } = req.params;
    try {
        const items = db.prepare('SELECT * FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC').all(entityType, entityId);
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/:entityType/:entityId/attachments', (req, res) => {
    const { entityType, entityId } = req.params;
    const { fileName, filePath, fileSize, fileType } = req.body;
    try {
        const result = db.prepare(`
            INSERT INTO attachments(entity_type, entity_id, file_name, file_path, file_size, file_type, created_by)
VALUES(?, ?, ?, ?, ?, ?, ?)
    `).run(entityType, entityId, fileName, filePath, fileSize, fileType, 'System');
        res.json({ id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/attachments/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- REVIEWS MANAGEMENT ---
app.post('/api/reviews/:id/request-changes', (req, res) => {
    const { id } = req.params;
    try {
        const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        const limit = review.review_limit ?? 3;
        if (review.revisions_used >= limit) {
            return res.status(409).json({ error: 'Revision limit reached.' });
        }

        // Increment revisions_used and update status
        db.prepare(`
            UPDATE reviews 
            SET revisions_used = revisions_used + 1,
    status = 'changes_requested',
    updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
    `).run(id);

        // Mark current version as 'changes_requested'
        if (review.current_version_id) {
            db.prepare("UPDATE review_versions SET status = 'changes_requested' WHERE id = ?").run(review.current_version_id);
        }

        logActivity('project', review.project_id, 'review_changes_requested', { reviewId: id });
        res.json({ success: true, revisions_used: review.revisions_used + 1 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reviews/:id/approve', (req, res) => {
    const { id } = req.params;
    try {
        const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        db.prepare(`
            UPDATE reviews 
            SET status = 'approved',
    updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
    `).run(id);

        if (review.current_version_id) {
            db.prepare("UPDATE review_versions SET status = 'approved', approved_at = CURRENT_TIMESTAMP WHERE id = ?").run(review.current_version_id);
        }

        logActivity('project', review.project_id, 'review_approved', { reviewId: id });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PUBLIC REVIEWS ---
app.get('/api/public/review/:token', (req, res) => {
    const { token } = req.params;
    try {
        const version = db.prepare(`
            SELECT rv.*, r.title as review_title, p.name as project_name
            FROM review_versions rv
            JOIN reviews r ON rv.review_id = r.id
            JOIN projects p ON r.project_id = p.id
            WHERE rv.token = ? AND rv.is_token_active = 1
    `).get(token);

        if (!version) {
            return res.status(404).json({ error: 'Review not found or link expired.' });
        }

        res.json(version);
    } catch (err) {
        console.error('[Public Review ERROR]', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/public/reviews/versions/:id/comments', (req, res) => {
    try {
        const comments = db.prepare('SELECT * FROM review_comments WHERE version_id = ? AND is_resolved = 0 ORDER BY created_at ASC').all(req.params.id);
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RETENTION POLICY (Auto Cleanup) ---
// Deactivate public tokens for reviews older than 30 days that are approved
function runRetentionPolicy() {
    console.log('[Retention] Running cleanup...');
    try {
        const result = db.prepare(`
            UPDATE review_versions 
            SET is_token_active = 0 
            WHERE status = 'approved' 
            AND created_at < datetime('now', '-30 days')
            AND is_token_active = 1
    `).run();
        console.log(`[Retention] Deactivated ${result.changes} expired public links.`);
    } catch (err) {
        console.error('[Retention] Cleanup failed:', err);
    }
}

// --- RETENTION & CLEANUP JOB ---
function runRetentionCleanup() {
    console.log('[Background] Running retention cleanup...');
    try {
        const now = new Date().toISOString();
        const expiredVersions = db.prepare(`
SELECT * FROM review_versions 
            WHERE status != 'file_deleted' 
            AND is_active = 0 
            AND is_pinned = 0 
            AND retention_expires_at < ?
    `).all(now);

        let freedBytes = 0;
        expiredVersions.forEach(ver => {
            const fullPath = path.join(__dirname, '..', ver.file_url);
            try {
                if (fs.existsSync(fullPath)) {
                    const stats = fs.statSync(fullPath);
                    fs.unlinkSync(fullPath);
                    freedBytes += stats.size;
                }
                db.prepare("UPDATE review_versions SET file_url = NULL, compressed_file_url = NULL, status = 'file_deleted', file_deleted = 1 WHERE id = ?").run(ver.id);
                console.log(`[Retention] Deleted expired version: ${ver.id} `);
            } catch (err) {
                console.error(`[Retention] Failed to delete file for version ${ver.id}: `, err.message);
            }
        });

        if (freedBytes > 0) {
            console.log(`[Retention] Cleanup complete.Freed ${(freedBytes / 1024 / 1024).toFixed(2)} MB`);
        }
    } catch (err) {
        console.error('[Background] Retention cleanup failed:', err);
    }
}

// Run daily
setInterval(runRetentionCleanup, 24 * 60 * 60 * 1000);
// Also run on startup after 5s
setTimeout(runRetentionCleanup, 5000);

// --- ADMIN & STORAGE STATS ---
app.get('/api/admin/storage-stats', (req, res) => {
    try {
        const stats = db.prepare(`
SELECT
SUM(compressed_size_bytes) as total_compressed,
    SUM(original_size_bytes) as total_original,
    COUNT(*) as total_versions,
    SUM(CASE WHEN file_deleted = 1 THEN 1 ELSE 0 END) as deleted_count
            FROM review_versions
        `).get();

        res.json({
            total_review_storage_bytes: stats.total_compressed || 0,
            original_potential_bytes: stats.total_original || 0,
            total_versions: stats.total_versions || 0,
            total_versions_deleted: stats.deleted_count || 0,
            compression_savings: ((1 - (stats.total_compressed / stats.total_original)) * 100).toFixed(1) + '%'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update access tracking in retrieval routes
function trackAccess(versionId) {
    try {
        db.prepare('UPDATE review_versions SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?').run(versionId);
    } catch (err) {
        console.error('Failed to track access:', err);
    }
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);

    // Initial reminder check
    setTimeout(checkReminders, 5000);

    // Daily reminder check (every 24 hours)
    setInterval(checkReminders, 24 * 60 * 60 * 1000);

    // Initial retention check
    setTimeout(runRetentionPolicy, 10000);
    // Daily retention check
    setInterval(runRetentionPolicy, 24 * 60 * 60 * 1000);
});
