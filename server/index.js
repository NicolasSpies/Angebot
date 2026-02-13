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

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|svg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .svg format allowed!'));
    }
});

app.post('/api/upload', upload.single('logo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
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
    const services = db.prepare('SELECT * FROM services').all();
    const variants = db.prepare('SELECT * FROM service_variants').all();

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
        db.prepare('DELETE FROM service_variants WHERE service_id = ?').run(serviceId);
        db.prepare('DELETE FROM services WHERE id = ?').run(serviceId);
        res.json({ success: true });
    } catch (err) {
        if (err.message.includes('FOREIGN KEY constraint failed')) {
            // Soft delete if used in offers
            db.prepare('UPDATE services SET active = 0 WHERE id = ?').run(serviceId);
            res.json({ success: true, message: 'Service set to inactive (used in offers)' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// --- CUSTOMERS ---
app.get('/api/customers', (req, res) => {
    const customers = db.prepare('SELECT * FROM customers').all();
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
    // Manually cascade delete offers (and their items via DB constraint or manually)
    // First get all offer IDs for this customer to delete their items if needed, 
    // but better to just delete offers and rely on logic or manual cleanup.
    // SQLite FK cascade might not be on by default unless PRAGMA foreign_keys = ON is set.
    // We'll do manual cleanup to be safe.

    const offers = db.prepare('SELECT id FROM offers WHERE customer_id = ?').all(req.params.id);
    const deleteOfferItems = db.prepare('DELETE FROM offer_items WHERE offer_id = ?');
    const deleteOffer = db.prepare('DELETE FROM offers WHERE id = ?');

    db.transaction(() => {
        for (const offer of offers) {
            db.prepare('DELETE FROM offer_events WHERE offer_id = ?').run(offer.id);
            deleteOfferItems.run(offer.id);
            deleteOffer.run(offer.id);
        }
        db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    })();

    res.json({ success: true });
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

        const stats = {
            totalRevenue: offers.filter(o => o.status === 'signed').reduce((acc, curr) => acc + curr.total, 0),
            totalOffers: offers.length,
            signedCount: offers.filter(o => o.status === 'signed').length,
            pendingCount: offers.filter(o => o.status === 'sent').length,
            declinedCount: offers.filter(o => o.status === 'declined').length,
            draftCount: offers.filter(o => o.status === 'draft').length,
            expiredCount: 0, // Placeholder
            avgOfferValue: offers.length > 0 ? (offers.reduce((acc, curr) => acc + curr.total, 0) / offers.length) : 0,
            lastActivity: offers.length > 0 ? offers[0].updated_at : null
        };

        res.json({ customer, offers, stats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- OFFERS ---
app.get('/api/offers', (req, res) => {
    const offers = db.prepare(`
        SELECT o.*, c.company_name as customer_name 
        FROM offers o 
        JOIN customers c ON o.customer_id = c.id
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
        JOIN customers c ON o.customer_id = c.id 
        WHERE o.id = ?
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

app.post('/api/offers/public/:token/decline', (req, res) => {
    const { token } = req.params;
    const { comment } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const offer = db.prepare('SELECT id FROM offers WHERE token = ?').get(token);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    db.transaction(() => {
        db.prepare("UPDATE offers SET status = 'declined', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(offer.id);
        db.prepare("INSERT INTO offer_events (offer_id, event_type, comment, ip_address) VALUES (?, 'declined', ?, ?)").run(offer.id, comment, ip);
        // Sync project status
        db.prepare("UPDATE projects SET status = 'cancelled' WHERE offer_id = ?").run(offer.id);
    })();

    res.json({ success: true });
});

app.post('/api/offers/public/:token/sign', (req, res) => {
    const { token } = req.params;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const offer = db.prepare('SELECT id FROM offers WHERE token = ?').get(token);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    db.transaction(() => {
        db.prepare("UPDATE offers SET status = 'signed', signed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(offer.id);
        db.prepare("INSERT INTO offer_events (offer_id, event_type, ip_address) VALUES (?, 'signed', ?)").run(offer.id, ip);
        // Sync project status
        db.prepare("UPDATE projects SET status = 'todo' WHERE offer_id = ?").run(offer.id);
    })();

    res.json({ success: true });
});

app.post('/api/offers', (req, res) => {
    const { customer_id, offer_name, language, status, subtotal, vat, total, items, due_date, internal_notes, linked_project_id } = req.body;

    const transaction = db.transaction(() => {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const offerResult = db.prepare(`
            INSERT INTO offers (customer_id, offer_name, language, status, subtotal, vat, total, token, due_date, internal_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(customer_id, offer_name, language, status || 'draft', subtotal, vat, total, token, due_date, internal_notes || null);

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
            // Link to EXISTING project and update it
            const projectStatus = status === 'signed' ? 'todo' : 'pending';
            db.prepare(`
                UPDATE projects 
                SET offer_id = ?, status = ?, name = COALESCE(?, name), deadline = COALESCE(?, deadline), internal_notes = COALESCE(?, internal_notes)
                WHERE id = ?
            `).run(offerId, projectStatus, offer_name, due_date || null, internal_notes || null, linked_project_id);
        } else {
            // Auto-create NEW Pending Project (Synced with Offer)
            const projectStatus = status === 'signed' ? 'todo' : 'pending';
            db.prepare(`
                INSERT INTO projects (offer_id, customer_id, name, status, deadline, internal_notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(offerId, customer_id, offer_name || 'Untitled Project', projectStatus, due_date || null, internal_notes || null);
        }

        return offerId;
    });

    try {
        const id = transaction();
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/offers/:id/duplicate', (req, res) => {
    const originalId = req.params.id;
    const original = db.prepare('SELECT * FROM offers WHERE id = ?').get(originalId);
    if (!original) return res.status(404).json({ error: 'Original offer not found' });

    const items = db.prepare('SELECT * FROM offer_items WHERE offer_id = ?').all(originalId);

    const transaction = db.transaction(() => {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const newOffer = db.prepare(`
            INSERT INTO offers (customer_id, language, status, subtotal, vat, total, token)
            VALUES (?, ?, 'draft', ?, ?, ?, ?)
        `).run(original.customer_id, original.language, original.subtotal, original.vat, original.total, token);

        const newId = newOffer.lastInsertRowid;
        const insertItem = db.prepare(`
            INSERT INTO offer_items (offer_id, service_id, quantity, unit_price, total_price, billing_cycle)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        for (const item of items) {
            insertItem.run(newId, item.service_id, item.quantity, item.unit_price, item.total_price, item.billing_cycle || 'one_time');
        }
        return newId;
    });

    try {
        const newId = transaction();
        res.json({ success: true, id: newId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/offers/:id', (req, res) => {
    const offerId = req.params.id;

    const transaction = db.transaction(() => {
        db.prepare('DELETE FROM offer_items WHERE offer_id = ?').run(offerId);
        db.prepare('DELETE FROM offers WHERE id = ?').run(offerId);
    });

    try {
        transaction();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/offers/:id', (req, res) => {
    const { customer_id, offer_name, language, status, subtotal, vat, total, items, due_date, internal_notes } = req.body;
    const offerId = req.params.id;

    const transaction = db.transaction(() => {
        db.prepare(`
            UPDATE offers SET 
                customer_id = ?, offer_name = ?, language = ?, status = ?, 
                subtotal = ?, vat = ?, total = ?, due_date = ?, internal_notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(customer_id, offer_name, language, status, subtotal, vat, total, due_date, internal_notes || null, offerId);

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

        // Sync project name/deadline if exists
        db.prepare(`UPDATE projects SET name = ?, deadline = ? WHERE offer_id = ?`).run(offer_name, due_date || null, offerId);
    });

    // Check if we need to create a project (if status is sent/signed and no project exists)
    if (status === 'sent' || status === 'signed' || status === 'pending') {
        const existingProject = db.prepare('SELECT id FROM projects WHERE offer_id = ?').get(offerId);
        if (!existingProject) {
            const projectStatus = status === 'signed' ? 'todo' : 'pending';
            db.prepare(`
                INSERT INTO projects (offer_id, customer_id, name, status, deadline, internal_notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(offerId, customer_id, offer_name || 'Untitled Project', projectStatus, due_date || null, internal_notes || null);
        }
    }

    try {
        transaction();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



app.post('/api/offers/:id/send', (req, res) => {
    db.prepare(`
        UPDATE offers SET status = 'sent', sent_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `).run(req.params.id);

    // Auto-create project if not exists
    const offerId = req.params.id;
    const existingProject = db.prepare('SELECT id FROM projects WHERE offer_id = ?').get(offerId);
    if (!existingProject) {
        const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerId);
        if (offer) {
            db.prepare(`
                INSERT INTO projects (offer_id, customer_id, name, status, deadline, internal_notes)
                VALUES (?, ?, ?, 'pending', ?, ?)
            `).run(offer.id, offer.customer_id, offer.offer_name || 'Untitled Project', offer.due_date || null, offer.internal_notes || null);
        }
    }
    res.json({ success: true });
});

// Manual status update endpoint
app.put('/api/offers/:id/status', (req, res) => {
    const { status } = req.body;
    const offerId = req.params.id;

    // Update offer status
    db.prepare('UPDATE offers SET status = ? WHERE id = ?').run(status, offerId);

    // If status is 'sent', update sent_at if null
    if (status === 'sent') {
        db.prepare("UPDATE offers SET sent_at = COALESCE(sent_at, CURRENT_TIMESTAMP) WHERE id = ?").run(offerId);
    }
    // If status is 'signed', update signed_at if null
    if (status === 'signed') {
        db.prepare("UPDATE offers SET signed_at = COALESCE(signed_at, CURRENT_TIMESTAMP) WHERE id = ?").run(offerId);
    }

    // Sync Project Logic
    if (status === 'sent' || status === 'signed' || status === 'pending') {
        const existingProject = db.prepare('SELECT id FROM projects WHERE offer_id = ?').get(offerId);
        if (!existingProject) {
            const offer = db.prepare('SELECT * FROM offers WHERE id = ?').get(offerId);
            if (offer) {
                const projectStatus = status === 'signed' ? 'todo' : 'pending';
                db.prepare(`
                    INSERT INTO projects (offer_id, customer_id, name, status, deadline, internal_notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(offer.id, offer.customer_id, offer.offer_name || 'Untitled Project', projectStatus, offer.due_date || null, offer.internal_notes || null);
            }
        } else if (status === 'signed') {
            // If project exists but offer becomes signed, ensure project is active
            db.prepare("UPDATE projects SET status = 'todo' WHERE id = ? AND status = 'pending'").run(existingProject.id);
        }
    } else if (status === 'declined') {
        // If declined, cancel project
        db.prepare("UPDATE projects SET status = 'cancelled' WHERE offer_id = ?").run(offerId);
    }

    res.json({ success: true });
});

// --- PROJECTS ---
app.post('/api/projects', (req, res) => {
    const { name, customer_id, deadline, status, internal_notes } = req.body;
    try {
        const result = db.prepare(`
            INSERT INTO projects (customer_id, name, status, deadline, internal_notes)
            VALUES (?, ?, ?, ?, ?)
        `).run(customer_id || null, name || 'New Project', status || 'todo', deadline || null, internal_notes || null);
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
            WHERE p.id = ?
        `).get(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order ASC, created_at ASC').all(req.params.id);
        res.json({ ...project, tasks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/projects/:id', (req, res) => {
    const { name, status, deadline, internal_notes, customer_id, offer_id } = req.body;
    try {
        db.prepare(`
            UPDATE projects SET name = ?, status = ?, deadline = ?, internal_notes = ?, customer_id = ?, offer_id = ? WHERE id = ?
        `).run(name, status, deadline || null, internal_notes || null, customer_id || null, offer_id || null, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', (req, res) => {
    try {
        db.transaction(() => {
            db.prepare('DELETE FROM tasks WHERE project_id = ?').run(req.params.id);
            db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
        })();
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
        const packages = db.prepare('SELECT * FROM packages').all();
        const items = db.prepare('SELECT * FROM package_items').all();

        const packagesWithItems = packages.map(p => ({
            ...p,
            items: items.filter(it => it.package_id === p.id).map(it => it.service_id)
        }));

        res.json(packagesWithItems);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/packages', (req, res) => {
    const { name, description, items } = req.body;
    try {
        const transaction = db.transaction(() => {
            const result = db.prepare(`
                INSERT INTO packages (name, description)
                VALUES (?, ?)
            `).run(name, description || '');

            const packageId = result.lastInsertRowid;

            if (items && Array.isArray(items)) {
                const insertItem = db.prepare('INSERT INTO package_items (package_id, service_id) VALUES (?, ?)');
                for (const serviceId of items) {
                    insertItem.run(packageId, serviceId);
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
    const { name, description, items } = req.body;
    const packageId = req.params.id;
    try {
        db.transaction(() => {
            db.prepare('UPDATE packages SET name = ?, description = ? WHERE id = ?').run(name, description || '', packageId);
            db.prepare('DELETE FROM package_items WHERE package_id = ?').run(packageId);

            if (items && Array.isArray(items)) {
                const insertItem = db.prepare('INSERT INTO package_items (package_id, service_id) VALUES (?, ?)');
                for (const serviceId of items) {
                    insertItem.run(packageId, serviceId);
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
        db.transaction(() => {
            db.prepare('DELETE FROM package_items WHERE package_id = ?').run(req.params.id);
            db.prepare('DELETE FROM packages WHERE id = ?').run(req.params.id);
        })();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
