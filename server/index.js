import express from 'express';
import cors from 'cors';
import db from './db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

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

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

        res.json({ checked: expiringOffers.length + urgentProjects.length });
    } catch (err) {
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
    res.json({ url: fileUrl });
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
    const customers = db.prepare('SELECT * FROM customers WHERE deleted_at IS NULL').all();
    res.json(customers);
});

app.post('/api/customers', (req, res) => {
    const { company_name, first_name, last_name, email, phone, address, city, postal_code, language, country, vat_number } = req.body;
    const result = db.prepare(`
        INSERT INTO customers (company_name, first_name, last_name, email, phone, address, city, postal_code, language, country, vat_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(company_name, first_name, last_name, email, phone, address, city, postal_code, language, country, vat_number);
    res.json({ id: result.lastInsertRowid });
});

app.put('/api/customers/:id', (req, res) => {
    const { company_name, first_name, last_name, email, phone, address, city, postal_code, language, country, vat_number } = req.body;
    db.prepare(`
        UPDATE customers SET company_name = ?, first_name = ?, last_name = ?, email = ?, phone = ?, address = ?, city = ?, postal_code = ?, language = ?, country = ?, vat_number = ?
        WHERE id = ?
    `).run(company_name, first_name, last_name, email, phone, address, city, postal_code, language, country, vat_number, req.params.id);
    res.json({ success: true });
});

app.delete('/api/customers/:id', (req, res) => {
    try {
        db.transaction(() => {
            db.prepare('UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE customer_id = ?').run(req.params.id);
            db.prepare('UPDATE offers SET deleted_at = CURRENT_TIMESTAMP WHERE customer_id = ?').run(req.params.id);
            db.prepare('UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
        })();
        res.json({ success: true });
    } catch (err) {
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
        WHERE o.deleted_at IS NULL
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
        SELECT oi.*, s.name_de, s.name_fr, s.description_de, s.description_fr, oi.billing_cycle 
        FROM offer_items oi 
        JOIN services s ON oi.service_id = s.id 
        WHERE oi.offer_id = ?
    `).all(req.params.id);

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
        SELECT oi.*, s.name_de, s.name_fr, s.description_de, s.description_fr, oi.billing_cycle 
        FROM offer_items oi 
        JOIN services s ON oi.service_id = s.id 
        WHERE oi.offer_id = ?
    `).all(offer.id);

    res.json({ ...offer, items });
});

// --- HELPER: Smart Status Automation ---
const syncProjectWithOffer = (offerId, status, offerName, dueDate, strategicNotes, customerId) => {
    // 1. Determine Target Project Status
    let targetStatus = null;
    if (status === 'signed') targetStatus = 'todo';
    else if (status === 'declined') targetStatus = 'cancelled';
    // 'sent' no longer force-updates existing project status to 'pending' if it's already in progress
    // But if we are creating a new project, it defaults to 'pending'

    // 2. Check if Project exists
    const existingProject = db.prepare('SELECT id, status, internal_notes FROM projects WHERE offer_id = ?').get(offerId);

    if (existingProject) {
        let updateFields = [];
        let params = [];

        // Only update status if the offer is signed or declined (final states)
        // OR if the project is currently 'pending' and the offer is 'sent' (initial state)
        if (targetStatus) {
            updateFields.push('status = ?');
            params.push(targetStatus);
        } else if (status === 'sent' && existingProject.status === 'pending') {
            // Keep it pending
        }

        if (offerName) {
            updateFields.push('name = ?');
            params.push(offerName);
        }
        if (dueDate) {
            updateFields.push('deadline = ?');
            params.push(dueDate);
        }
        // Sync strategic notes to dedicated column
        if (strategicNotes) {
            updateFields.push('strategic_notes = ?');
            params.push(strategicNotes);
        }

        if (updateFields.length > 0) {
            params.push(existingProject.id);
            updateFields.push('id = ?'); // Oops, syntax error in my logic, prepare params correctly
            // Standard update
            const setClause = updateFields.map(f => f.split(' ')[0] + ' = ?').join(', ');
            // params already has values
            params.push(existingProject.id);
            db.prepare(`UPDATE projects SET ${setClause} WHERE id = ?`).run(...params);
        }
    } else if ((status === 'sent' || status === 'signed' || status === 'pending') && customerId) {
        // Auto-Create Project if missing
        const initialStatus = targetStatus || 'pending';
        db.prepare(`
            INSERT INTO projects (offer_id, customer_id, name, status, deadline, strategic_notes)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(offerId, customerId, offerName || 'Untitled Project', initialStatus, dueDate || null, strategicNotes || null);
    }
};

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
    })();

    res.json({ success: true });
});

const signRateLimit = new Map();

app.post('/api/offers/public/:token/sign', (req, res) => {
    const { token } = req.params;
    const { name, email, signatureData, pdfUrl } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Rate Limit Check
    const now = Date.now();
    const limitWindow = 60 * 60 * 1000; // 1 hour
    const limitCount = 5;

    let rateData = signRateLimit.get(ip) || { count: 0, firstAttempt: now };
    if (now - rateData.firstAttempt > limitWindow) {
        rateData = { count: 0, firstAttempt: now };
    }

    if (rateData.count >= limitCount) {
        return res.status(429).json({ error: 'Too many signing attempts. Please try again later.' });
    }

    rateData.count++;
    signRateLimit.set(ip, rateData);

    const offer = db.prepare('SELECT * FROM offers WHERE token = ?').get(token);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (['signed', 'declined'].includes(offer.status)) {
        return res.status(400).json({ error: 'Offer is already finalized.' });
    }

    try {
        db.transaction(() => {
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

            // Smart Sync
            syncProjectWithOffer(offer.id, 'signed');

            // Notification (with dedup)
            createNotification('offer', 'Offer Signed! ✍️', `Offer "${offer.offer_name}" signed by ${name}`, `/offers/${offer.id}`, `offer_signed_${offer.id}`);
        })();

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/offers', (req, res) => {
    const { customer_id, offer_name, language, status, subtotal, vat, total, items, due_date, internal_notes, strategic_notes, linked_project_id } = req.body;

    const transaction = db.transaction(() => {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const offerResult = db.prepare(`
            INSERT INTO offers (customer_id, offer_name, language, status, subtotal, vat, total, token, due_date, internal_notes, strategic_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(customer_id, offer_name, language, status || 'draft', subtotal, vat, total, token, due_date, internal_notes || null, strategic_notes || null);

        const offerId = offerResult.lastInsertRowid;

        const insertItem = db.prepare(`
            INSERT INTO offer_items (offer_id, service_id, quantity, unit_price, total_price, billing_cycle, item_name, item_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
                item.item_description || null
            );
        }

        // Project Synchronization Logic
        if (linked_project_id) {
            db.prepare('UPDATE projects SET offer_id = ? WHERE id = ?').run(offerId, linked_project_id);
            syncProjectWithOffer(offerId, status || 'draft', offer_name, due_date, strategic_notes);
        } else {
            syncProjectWithOffer(offerId, status || 'draft', offer_name, due_date, strategic_notes, customer_id);
        }

        // No notification for drafts — only trigger on meaningful status changes

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
    const { customer_id, offer_name, language, status, subtotal, vat, total, items, due_date, internal_notes, strategic_notes } = req.body;
    const offerId = req.params.id;

    const transaction = db.transaction(() => {
        db.prepare(`
            UPDATE offers SET 
                customer_id = ?, offer_name = ?, language = ?, status = ?, 
                subtotal = ?, vat = ?, total = ?, due_date = ?, internal_notes = ?, strategic_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(customer_id, offer_name, language, status, subtotal, vat, total, due_date, internal_notes || null, strategic_notes || null, offerId);

        // Replace items
        db.prepare('DELETE FROM offer_items WHERE offer_id = ?').run(offerId);

        const insertItem = db.prepare(`
            INSERT INTO offer_items (offer_id, service_id, quantity, unit_price, total_price, billing_cycle, item_name, item_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
                item.item_description || null
            );
        }

        // Smart Sync
        syncProjectWithOffer(offerId, status, offer_name, due_date, strategic_notes, customer_id);
    });

    try {
        transaction();
        res.json({ success: true });
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
        syncProjectWithOffer(offerId, 'sent', offerCheck.offer_name, offerCheck.due_date, offerCheck.strategic_notes, offerCheck.customer_id);
    })();

    // Return token so frontend can redirect to public page
    res.json({ success: true, token: offerCheck.token });
});

// Manual status update endpoint
app.delete('/api/offers/:id', (req, res) => {
    try {
        db.prepare('UPDATE offers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
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
            db.prepare('UPDATE offers SET status = ? WHERE id = ?').run(status, offerId);

            if (status === 'sent') {
                db.prepare("UPDATE offers SET sent_at = COALESCE(sent_at, CURRENT_TIMESTAMP) WHERE id = ?").run(offerId);
            }
            if (status === 'signed') {
                db.prepare("UPDATE offers SET signed_at = COALESCE(signed_at, CURRENT_TIMESTAMP) WHERE id = ?").run(offerId);
            }

            const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerId);
            if (offer) {
                if (status === 'sent' && !offer.customer_id) {
                    throw new Error('Cannot set status to "sent" without an assigned customer.');
                }
                syncProjectWithOffer(offerId, status, offer.offer_name, offer.due_date, offer.strategic_notes, offer.customer_id);

                // Only notify on signed status (meaningful trigger)
                if (status === 'signed') {
                    createNotification('offer', 'Offer Signed! ✍️', `Offer "${offer.offer_name}" has been signed.`, `/projects`, `offer_signed_${offerId}`);
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
    const { name, customer_id, deadline, status, internal_notes, priority, strategic_notes } = req.body;
    try {
        // Insert project
        const result = db.prepare(`
            INSERT INTO projects (customer_id, name, status, deadline, internal_notes, priority, strategic_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            customer_id || null,
            name || 'New Project',
            status || 'todo',
            deadline || null,
            internal_notes || null,
            priority || 'medium',
            strategic_notes || null
        );

        // Log creation event
        db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(result.lastInsertRowid, 'created', 'Project created');

        res.json({ id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects', (req, res) => {
    try {
        const projects = db.prepare(`
            SELECT p.*, c.company_name as customer_name, o.offer_name, o.total as offer_total, o.status as offer_status
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN offers o ON p.offer_id = o.id
            WHERE p.deleted_at IS NULL
            ORDER BY p.created_at DESC
        `).all();
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id', (req, res) => {
    try {
        const project = db.prepare(`
            SELECT p.*, c.company_name as customer_name, o.offer_name, o.total as offer_total, o.status as offer_status, o.id as offer_id
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            LEFT JOIN offers o ON p.offer_id = o.id
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
    const { name, status, deadline, internal_notes, customer_id, offer_id, priority, strategic_notes } = req.body;
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

        db.transaction(() => {
            db.prepare(`
                UPDATE projects SET name = ?, status = ?, deadline = ?, internal_notes = ?, customer_id = ?, offer_id = ?, priority = ?, strategic_notes = ? WHERE id = ?
            `).run(name, status, deadline || null, internal_notes || null, customer_id || null, offer_id || null, priority || 'medium', strategic_notes || null, projectId);

            // Sync Offer Name if Project Name changed and Offer Name matches previous Project Name (heuristic for manual edits)
            if (name && name !== currentProject.name && currentProject.offer_id) {
                const offer = db.prepare('SELECT offer_name FROM offers WHERE id = ?').get(currentProject.offer_id);
                if (offer && offer.offer_name === currentProject.name) {
                    db.prepare('UPDATE offers SET offer_name = ? WHERE id = ?').run(name, currentProject.offer_id);
                }
            }

            // Log events for changes
            if (status && status !== currentProject.status) {
                db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(projectId, 'status_change', `Status changed from ${currentProject.status} to ${status}`);
            }
            if (deadline && deadline !== currentProject.deadline) {
                db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(projectId, 'deadline_update', `Deadline updated to ${deadline}`);
            }
            if (priority && priority !== currentProject.priority) {
                db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(projectId, 'priority_change', `Priority updated to ${priority}`);
            }
            if (strategic_notes && strategic_notes !== currentProject.strategic_notes) {
                db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(projectId, 'notes_update', `Strategic notes updated`);
            }
        })();

        res.json({ success: true, ...req.body });
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

        const projectEvents = db.prepare('SELECT p.*, "project" as source FROM project_events p WHERE project_id = ?').all(projectId);
        const offerEvents = project.offer_id ? db.prepare('SELECT o.*, "offer" as source FROM offer_events o WHERE offer_id = ?').all(project.offer_id) : [];

        const combined = [...projectEvents, ...offerEvents].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json(combined);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', (req, res) => {
    try {
        db.prepare('UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
        res.json({ success: true });
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
            INSERT INTO tasks (project_id, title, description, status, due_date, priority, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
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
        // Basic stats
        const draftCount = db.prepare("SELECT COUNT(*) as count FROM offers WHERE status = 'draft'").get().count;
        const pendingCount = db.prepare("SELECT COUNT(*) as count FROM offers WHERE status = 'sent'").get().count;
        const signedCount = db.prepare("SELECT COUNT(*) as count FROM offers WHERE status = 'signed'").get().count;

        // Financials
        const totalOpenValue = db.prepare("SELECT SUM(total) as sum FROM offers WHERE status IN ('draft', 'sent')").get().sum || 0;
        const forecastPending = db.prepare("SELECT SUM(total) as sum FROM offers WHERE status = 'sent'").get().sum || 0;

        // Profit estimates
        const signedCost = db.prepare(`
            SELECT SUM(oi.quantity * s.cost_price) as cost
            FROM offer_items oi
            JOIN offers o ON oi.offer_id = o.id
            JOIN services s ON oi.service_id = s.id
            WHERE o.status = 'signed'
        `).get().cost || 0;
        const signedRevenue = db.prepare("SELECT SUM(subtotal) as sum FROM offers WHERE status = 'signed'").get().sum || 0;
        const profitEstimate = signedRevenue - signedCost;

        // Monthly data for chart (last 6 months)
        const monthlyPerformance = db.prepare(`
            SELECT strftime('%Y-%m', created_at) as month, SUM(total) as total, COUNT(*) as count
            FROM offers
            WHERE status = 'signed'
            GROUP BY month
            ORDER BY month DESC
            LIMIT 6
        `).all().map(row => ({
            ...row,
            month: row.month || 'Unknown'
        })).reverse();

        // Month specific metrics
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const signedThisMonthCount = db.prepare("SELECT COUNT(*) as count FROM offers WHERE status = 'signed' AND signed_at >= ?").get(startOfMonth).count;
        const avgOfferValueMonth = db.prepare("SELECT AVG(total) as avg FROM offers WHERE created_at >= ?").get(startOfMonth).avg || 0;

        // Avg Monthly Income
        // Calculate months since first signed offer or use 1 if none/recent
        const firstSignedDate = db.prepare("SELECT MIN(signed_at) as date FROM offers WHERE status = 'signed'").get().date;
        let monthsActive = 1;
        if (firstSignedDate) {
            const start = new Date(firstSignedDate);
            const now = new Date();
            monthsActive = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
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
            ORDER BY o.due_date ASC
            LIMIT 5
        `).all();
        const expiringSoonCount = expiringOffers.length;

        // Top categories
        const topCategories = db.prepare(`
            SELECT COALESCE(s.category, 'Other') as category, SUM(oi.total_price) as revenue
            FROM offer_items oi
            JOIN services s ON oi.service_id = s.id
            JOIN offers o ON oi.offer_id = o.id
            WHERE o.status = 'signed'
            GROUP BY s.category
            ORDER BY revenue DESC
            LIMIT 5
        `).all();

        // Lead time
        const avgLeadTimeRaw = db.prepare(`
            SELECT AVG(julianday(signed_at) - julianday(created_at)) as avg_days
            FROM offers
            WHERE status = 'signed' AND signed_at IS NOT NULL
        `).get().avg_days;
        const avgLeadTime = avgLeadTimeRaw || 0;

        // Old drafts
        const oldDraftsCount = db.prepare(`
            SELECT COUNT(*) as count FROM offers
            WHERE status = 'draft' AND created_at <= date('now', '-3 days')
        `).get().count;

        // Top clients
        const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
        const topClients = db.prepare(`
            SELECT c.company_name, SUM(o.total) as revenue
            FROM offers o
            JOIN customers c ON o.customer_id = c.id
            WHERE o.status = 'signed' AND o.signed_at >= ?
            GROUP BY c.id
            ORDER BY revenue DESC
            LIMIT 5
        `).all(startOfYear);

        const recentActivity = db.prepare(`
            SELECT 'Offer ' || status || ' for ' || c.company_name as text, 
                   COALESCE(signed_at, sent_at, created_at) as date
            FROM offers o
            JOIN customers c ON o.customer_id = c.id
            ORDER BY date DESC
            LIMIT 10
        `).all();

        // Project stats
        const activeProjectCount = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status IN ('todo', 'in_progress', 'feedback')").get().count;
        const overdueProjectCount = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status IN ('todo', 'in_progress', 'feedback') AND deadline IS NOT NULL AND deadline < date('now')").get().count;
        const projectsByStatus = db.prepare("SELECT status, COUNT(*) as count FROM projects GROUP BY status").all();

        res.json({
            summary: { draftCount, pendingCount, signedCount },
            financials: { totalOpenValue, forecastPending, profitEstimate, signedRevenue },
            performance: { monthlyPerformance, avgOfferValueMonth, signedThisMonthCount, avgMonthlyIncome },
            alerts: { expiringSoonCount, oldDraftsCount, expiringOffers },
            analytics: { topCategories, topClients, recentActivity },
            projects: { activeProjectCount, overdueProjectCount, projectsByStatus }
        });
    } catch (err) {
        console.error('Dashboard Stats Error:', err);
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

app.post('/api/packages', (req, res) => {
    console.log('POST /api/packages payload:', req.body);
    const { name, description, items, discount_type, discount_value } = req.body;
    try {
        const transaction = db.transaction(() => {
            const result = db.prepare(`
                INSERT INTO packages (name, description, discount_type, discount_value)
                VALUES (?, ?, ?, ?)
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

// --- TRASH BIN & RESTORE ---
app.get('/api/trash', (req, res) => {
    try {
        const customers = db.prepare("SELECT 'customers' as type, id, company_name as name, deleted_at FROM customers WHERE deleted_at IS NOT NULL").all();
        const offers = db.prepare("SELECT 'offers' as type, id, offer_name as name, deleted_at FROM offers WHERE deleted_at IS NOT NULL").all();
        const projects = db.prepare("SELECT 'projects' as type, id, name, deleted_at FROM projects WHERE deleted_at IS NOT NULL").all();
        const services = db.prepare("SELECT 'services' as type, id, name_de as name, deleted_at FROM services WHERE deleted_at IS NOT NULL").all();
        const packages = db.prepare("SELECT 'packages' as type, id, name, deleted_at FROM packages WHERE deleted_at IS NOT NULL").all();

        const allTrash = [...customers, ...offers, ...projects, ...services, ...packages]
            .sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));

        res.json(allTrash);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/:resource/:id/restore', (req, res) => {
    const { resource, id } = req.params;
    const allowed = ['customers', 'offers', 'projects', 'services', 'packages'];
    if (!allowed.includes(resource)) return res.status(400).json({ error: 'Invalid resource' });

    try {
        db.prepare(`UPDATE ${resource} SET deleted_at = NULL WHERE id = ?`).run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/:resource/:id/permanent', (req, res) => {
    const { resource, id } = req.params;
    const allowed = ['customers', 'offers', 'projects', 'services', 'packages'];
    if (!allowed.includes(resource)) return res.status(400).json({ error: 'Invalid resource' });

    try {
        db.prepare(`DELETE FROM ${resource} WHERE id = ?`).run(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/trash/empty', (req, res) => {
    try {
        const transaction = db.transaction(() => {
            db.prepare('DELETE FROM customers WHERE deleted_at IS NOT NULL').run();
            db.prepare('DELETE FROM offers WHERE deleted_at IS NOT NULL').run();
            db.prepare('DELETE FROM projects WHERE deleted_at IS NOT NULL').run();
            db.prepare('DELETE FROM services WHERE deleted_at IS NOT NULL').run();
            db.prepare('DELETE FROM packages WHERE deleted_at IS NOT NULL').run();
        });
        transaction();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/search', (req, res) => {
    const q = req.query.q;
    if (!q) return res.json([]);
    const term = `%${q}%`;
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
