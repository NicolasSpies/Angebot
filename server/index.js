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
    const { company_name, address, vat_number, logo_url, email, default_currency, default_vat_rules, default_payment_terms } = req.body;
    db.prepare(`
        UPDATE settings SET 
            company_name = ?, address = ?, vat_number = ?, logo_url = ?, 
            email = ?, default_currency = ?, default_vat_rules = ?, default_payment_terms = ? 
        WHERE id = 1
    `).run(company_name, address, vat_number, logo_url, email, default_currency, default_vat_rules, default_payment_terms);
    res.json({ success: true });
});

// --- SERVICES ---
app.get('/api/services', (req, res) => {
    const services = db.prepare('SELECT * FROM services').all();
    res.json(services);
});

app.post('/api/services', (req, res) => {
    const { category, name_de, name_fr, description_de, description_fr, price, unit_type, default_selected } = req.body;
    const result = db.prepare(`
        INSERT INTO services (category, name_de, name_fr, description_de, description_fr, price, unit_type, default_selected)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(category, name_de, name_fr, description_de, description_fr, price, unit_type, default_selected ? 1 : 0);
    res.json({ id: result.lastInsertRowid });
});

app.put('/api/services/:id', (req, res) => {
    const { category, name_de, name_fr, description_de, description_fr, price, unit_type, default_selected, active } = req.body;
    db.prepare(`
        UPDATE services SET 
            category = ?, name_de = ?, name_fr = ?, description_de = ?, description_fr = ?, 
            price = ?, unit_type = ?, default_selected = ?, active = ?
        WHERE id = ?
    `).run(category, name_de, name_fr, description_de, description_fr, price, unit_type, default_selected ? 1 : 0, active ? 1 : 0, req.params.id);
    res.json({ success: true });
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
               c.country as customer_country 
        FROM offers o 
        JOIN customers c ON o.customer_id = c.id 
        WHERE o.id = ?
    `).get(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    const items = db.prepare(`
        SELECT oi.*, s.name_de, s.name_fr, s.description_de, s.description_fr 
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
               c.country as customer_country 
        FROM offers o 
        JOIN customers c ON o.customer_id = c.id 
        WHERE o.token = ?
    `).get(req.params.token);

    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    const items = db.prepare(`
        SELECT oi.*, s.name_de, s.name_fr, s.description_de, s.description_fr 
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
    })();

    res.json({ success: true });
});

app.post('/api/offers', (req, res) => {
    const { customer_id, offer_name, language, status, subtotal, vat, total, items } = req.body;

    const transaction = db.transaction(() => {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const offerResult = db.prepare(`
            INSERT INTO offers (customer_id, offer_name, language, status, subtotal, vat, total, token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(customer_id, offer_name, language, status || 'draft', subtotal, vat, total, token);

        const offerId = offerResult.lastInsertRowid;

        const insertItem = db.prepare(`
            INSERT INTO offer_items (offer_id, service_id, quantity, unit_price, total_price)
            VALUES (?, ?, ?, ?, ?)
        `);

        for (const item of items) {
            insertItem.run(offerId, item.service_id, item.quantity, item.unit_price, item.total_price);
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
            INSERT INTO offer_items (offer_id, service_id, quantity, unit_price, total_price)
            VALUES (?, ?, ?, ?, ?)
        `);

        for (const item of items) {
            insertItem.run(newId, item.service_id, item.quantity, item.unit_price, item.total_price);
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
    const { customer_id, offer_name, language, status, subtotal, vat, total, items } = req.body;
    const offerId = req.params.id;

    const transaction = db.transaction(() => {
        db.prepare(`
            UPDATE offers SET 
                customer_id = ?, offer_name = ?, language = ?, status = ?, 
                subtotal = ?, vat = ?, total = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(customer_id, offer_name, language, status, subtotal, vat, total, offerId);

        // Replace items
        db.prepare('DELETE FROM offer_items WHERE offer_id = ?').run(offerId);

        const insertItem = db.prepare(`
            INSERT INTO offer_items (offer_id, service_id, quantity, unit_price, total_price)
            VALUES (?, ?, ?, ?, ?)
        `);

        for (const item of items) {
            insertItem.run(offerId, item.service_id, item.quantity, item.unit_price, item.total_price);
        }
    });

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
    res.json({ success: true });
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

        const expiringSoonCount = db.prepare(`
            SELECT COUNT(*) as count FROM offers 
            WHERE status = 'sent' 
            AND created_at <= date('now', '-23 days') 
            AND created_at > date('now', '-30 days')
        `).get().count;

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

        res.json({
            summary: { draftCount, pendingCount, signedCount },
            financials: { totalOpenValue, forecastPending, profitEstimate },
            performance: { monthlyPerformance, signedThisMonthCount, avgOfferValueMonth, avgLeadTime },
            alerts: { expiringSoonCount, oldDraftsCount },
            analytics: { topCategories, topClients, recentActivity }
        });
    } catch (err) {
        console.error('Dashboard Stats Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
