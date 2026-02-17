            if (offer) {
                if (status === 'sent' && !offer.customer_id) {
                    throw new Error('Cannot set status to "sent" without an assigned customer.');
                }
                syncProjectWithOffer(offerId, status, offer.offer_name, null, offer.strategic_notes, offer.customer_id); // Pass null for dueDate

                // Only notify on signed status (meaningful trigger)
                if (status === 'signed') {
                    createNotification('offer', 'Offer Signed! ✍️', `Offer "${offer.offer_name}" has been signed.`, '/projects', `offer_signed_${offerId}`);
                }

                if (offer.status !== status) {
                    logActivity('offer', offerId, 'status_change', { oldStatus: offer.status, newStatus: status });
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
                WHERE r1.id IN (SELECT MAX(id) FROM reviews GROUP BY project_id)
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
            LEFT JOIN reviews r ON p.id = r.project_id
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

        db.transaction(() => {
            db.prepare(`
                UPDATE projects SET name = ?, status = ?, deadline = ?, internal_notes = ?, customer_id = ?, offer_id = ?, priority = ?, strategic_notes = ?, review_limit = ?, updated_by = ? WHERE id = ?
            `).run(name, status, deadline || null, internal_notes || null, customer_id || null, offer_id || null, priority || 'medium', strategic_notes || null, review_limit === undefined ? currentProject.review_limit : (review_limit === '' ? null : review_limit), 'System', projectId);

            // Sync Offer Name if Project Name changed and Offer Name matches previous Project Name (heuristic for manual edits)
            if (name && name !== currentProject.name && currentProject.offer_id) {
                const offer = db.prepare('SELECT offer_name FROM offers WHERE id = ?').get(currentProject.offer_id);
                if (offer && offer.offer_name === currentProject.name) {
                    db.prepare('UPDATE offers SET offer_name = ? WHERE id = ?').run(name, currentProject.offer_id);
                }
            }

            // Log events for changes
            if (status && status !== currentProject.status) {
                db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(projectId, 'status_change', `Status changed from ${currentProject.status} to ${status} `);
            }
            if (deadline && deadline !== currentProject.deadline) {
                db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(projectId, 'deadline_update', `Deadline updated to ${deadline} `);
            }
            if (priority && priority !== currentProject.priority) {
                db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(projectId, 'priority_change', `Priority updated to ${priority} `);
            }
            if (strategic_notes && strategic_notes !== currentProject.strategic_notes) {
                db.prepare('INSERT INTO project_events (project_id, event_type, comment) VALUES (?, ?, ?)').run(projectId, 'notes_update', `Strategic notes updated`);
            }

            // Sync limit to reviews table
            if (review_limit !== undefined) {
                db.prepare('UPDATE reviews SET review_limit = ? WHERE project_id = ?').run(
                    review_limit === '' ? null : review_limit,
                    projectId
                );
            }

            // General Update Log
            logActivity('project', projectId, 'updated', {
                status: status !== currentProject.status ? status : undefined,
                deadline: deadline !== currentProject.deadline ? deadline : undefined,
                priority: priority !== currentProject.priority ? priority : undefined,
                renamed: name !== currentProject.name
            });
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
        db.prepare('UPDATE projects SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
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
            SELECT r.*, p.name as project_name, rv.status as current_status, rv.version_number, rv.token
            FROM reviews r
            JOIN projects p ON r.project_id = p.id
            LEFT JOIN review_versions rv ON r.current_version_id = rv.id
            WHERE p.deleted_at IS NULL
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

        res.json({ ...container, ...version, isCurrent, allVersions, containerId: container.id, versionId: version.id });
    } catch (err) {
        console.error('[API] /api/review-by-token failed:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reviews/:id/action', (req, res) => {
    const { action, firstName, lastName, email, versionId } = req.body;
    const reviewId = req.params.id;

    try {
        const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        const version = db.prepare('SELECT * FROM review_versions WHERE id = ?').get(versionId);
        if (!version) return res.status(404).json({ error: 'Version not found' });

        // Revision limit check for request-changes
        if (action === 'request-changes') {
            if (review.revisions_used >= review.review_limit) {
                return res.status(409).json({ error: 'Revision limit reached for this container.' });
            }
        }

        // Update status logic
        const newStatus = action === 'approve' ? 'approved' : 'changes_requested';
        console.log(`[ReviewAction] Processing ${action} for review ${reviewId}, version ${versionId}`);
        console.log(`[ReviewAction] Identity: ${firstName} ${lastName} (${email})`);

        try {
            db.transaction(() => {
                console.log('[ReviewAction] Starting transaction...');
                // 1. Store identity action INSIDE transaction
                db.prepare(`
                    INSERT INTO review_actions (review_id, version_id, action_type, first_name, last_name, email)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(reviewId, versionId, action, firstName || null, lastName || null, email || null);
                console.log('[ReviewAction] Action inserted.');

                // 2. Update Version Status
                db.prepare('UPDATE review_versions SET status = ? WHERE id = ?').run(newStatus, versionId);
                console.log('[ReviewAction] Version status updated.');

                // 3. Update Container Status and Revision Count if necessary
                if (action === 'request-changes') {
                    console.log('[ReviewAction] Handling request-changes revision logic...');
                    const alreadyRequested = db.prepare('SELECT COUNT(*) as count FROM review_actions WHERE version_id = ? AND action_type = "request-changes"').get(versionId).count;
                    console.log(`[ReviewAction] Already requested count: ${alreadyRequested}`);

                    if (alreadyRequested <= 1) {
                        console.log('[ReviewAction] First request: incrementing revision count.');
                        db.prepare('UPDATE reviews SET revisions_used = revisions_used + 1, status = "changes_requested", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(reviewId);
                    } else {
                        console.log('[ReviewAction] Not first request: updating status only.');
                        db.prepare('UPDATE reviews SET status = "changes_requested", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(reviewId);
                    }
                } else {
                    console.log('[ReviewAction] Handling approval logic...');
                    db.prepare('UPDATE reviews SET status = "approved", updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(reviewId);
                }
            })();
            console.log('[ReviewAction] Transaction committed successfully.');
        } catch (txErr) {
            console.error('[ReviewAction] Transaction failed:', txErr);
            throw txErr;
        }

        // Create notification
        const clientName = `${firstName} ${lastName}`.trim() || email;
        const msg = `${clientName} (${email}) ${action === 'approve' ? 'approved' : 'requested changes for'} "${review.title}" v${version.version_number}.`;

        db.prepare('INSERT INTO notifications (type, title, message, link) VALUES (?, ?, ?, ?)').run(
            'review_action',
            action === 'approve' ? 'Review Approved' : 'Changes Requested',
            msg,
            `/projects/${review.project_id}`
        );

        res.json({ success: true, status: newStatus });
    } catch (err) {
        console.error('[API] /api/reviews/:id/action failed:', err);
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

        trackAccess(version.id);
        const isCurrent = version.id === version.current_version_id;

        res.json({ ...version, isCurrent });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects/:id/reviews', (req, res) => {
    try {
        const reviews = db.prepare(`
            SELECT r.*, rv.status as current_status, rv.version_number, rv.token, rv.is_token_active
            FROM reviews r
            LEFT JOIN review_versions rv ON r.current_version_id = rv.id
            WHERE r.project_id = ?
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
        // Basic stats
        const draftCount = db.prepare("SELECT COUNT(*) as count FROM offers WHERE status = 'draft' AND archived_at IS NULL AND deleted_at IS NULL").get().count;
        const pendingCount = db.prepare("SELECT COUNT(*) as count FROM offers WHERE status = 'sent' AND archived_at IS NULL AND deleted_at IS NULL").get().count;
        const signedCount = db.prepare("SELECT COUNT(*) as count FROM offers WHERE status = 'signed' AND archived_at IS NULL AND deleted_at IS NULL").get().count;

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
        const signedThisMonthCount = db.prepare("SELECT COUNT(*) as count FROM offers WHERE status = 'signed' AND signed_at >= ? AND archived_at IS NULL").get(startOfMonth).count;
        const revenueThisMonth = db.prepare("SELECT SUM(total) as sum FROM offers WHERE status = 'signed' AND signed_at >= ? AND archived_at IS NULL").get(startOfMonth).sum || 0;
        const projectsInProgress = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'in_progress' AND archived_at IS NULL").get().count;
