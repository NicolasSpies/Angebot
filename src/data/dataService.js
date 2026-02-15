const API_URL = '/api';

export const dataService = {
    // --- SETTINGS ---
    getSettings: async () => {
        const res = await fetch(`${API_URL}/settings`);
        return res.json();
    },

    saveSettings: async (settings) => {
        const res = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        return res.json();
    },

    getDashboardStats: async () => {
        const res = await fetch(`${API_URL}/dashboard/stats`);
        return res.json();
    },
    getCustomerDashboard: async (id) => {
        const res = await fetch(`${API_URL}/customers/${id}/dashboard`);
        return res.json();
    },
    declineOffer: async (token, comment) => {
        const res = await fetch(`${API_URL}/offers/public/${token}/decline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment })
        });
        return res.json();
    },
    duplicateOffer: async (id) => {
        const res = await fetch(`${API_URL}/offers/${id}/duplicate`, { method: 'POST' });
        return res.json();
    },

    // --- OFFERS ---
    getOffers: async () => {
        const res = await fetch(`${API_URL}/offers`);
        return res.json();
    },

    getOffer: async (id) => {
        const res = await fetch(`${API_URL}/offers/${id}`);
        return res.json();
    },

    getOfferByToken: async (token) => {
        const res = await fetch(`${API_URL}/offers/public/${token}`);
        return res.json();
    },

    saveOffer: async (offer) => {
        const res = await fetch(`${API_URL}/offers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(offer)
        });
        return res.json();
    },

    updateOffer: async (id, offer) => {
        const res = await fetch(`${API_URL}/offers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(offer)
        });
        return res.json();
    },

    updateOfferStatus: async (id, status) => {
        const res = await fetch(`${API_URL}/offers/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        return res.json();
    },

    deleteOffer: async (id) => {
        const res = await fetch(`${API_URL}/offers/${id}`, { method: 'DELETE' });
        return res.json();
    },

    // --- CUSTOMERS ---
    getCustomers: async () => {
        const res = await fetch(`${API_URL}/customers`);
        return res.json();
    },

    saveCustomer: async (customer) => {
        const method = customer.id ? 'PUT' : 'POST';
        const url = customer.id ? `${API_URL}/customers/${customer.id}` : `${API_URL}/customers`;
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customer)
        });
        return res.json();
    },

    deleteCustomer: async (id) => {
        const res = await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE' });
        return res.json();
    },

    // --- SERVICES ---
    getServices: async () => {
        const res = await fetch(`${API_URL}/services`);
        return res.json();
    },

    saveService: async (service) => {
        const method = service.id ? 'PUT' : 'POST';
        const url = service.id ? `${API_URL}/services/${service.id}` : `${API_URL}/services`;
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(service)
        });
        return res.json();
    },

    deleteService: async (id) => {
        const res = await fetch(`${API_URL}/services/${id}`, { method: 'DELETE' });
        return res.json();
    },

    sendOffer: async (id) => {
        const res = await fetch(`${API_URL}/offers/${id}/send`, { method: 'POST' });
        return res.json();
    },

    signOffer: async (token, data) => {
        const res = await fetch(`${API_URL}/offers/public/${token}/sign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    declineOffer: async (token, reason) => {
        const res = await fetch(`${API_URL}/offers/public/${token}/decline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: reason })
        });
        return res.json();
    },

    // --- PROJECTS ---
    getProjects: async () => {
        const res = await fetch(`${API_URL}/projects`);
        return res.json();
    },

    getProject: async (id) => {
        const res = await fetch(`${API_URL}/projects/${id}`);
        return res.json();
    },

    createProject: async (project) => {
        const res = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(project)
        });
        return res.json();
    },

    updateProject: async (id, data) => {
        const res = await fetch(`${API_URL}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    deleteProject: async (id) => {
        const res = await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
        return res.json();
    },

    getProjectActivity: async (id) => {
        const res = await fetch(`${API_URL}/projects/${id}/activity`);
        return res.json();
    },

    // --- TASKS ---
    createTask: async (projectId, task) => {
        const res = await fetch(`${API_URL}/projects/${projectId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        return res.json();
    },

    updateTask: async (id, task) => {
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task)
        });
        return res.json();
    },

    deleteTask: async (id) => {
        const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
        return res.json();
    },

    reorderTasks: async (projectId, taskIds) => {
        const res = await fetch(`${API_URL}/projects/${projectId}/tasks/reorder`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskIds })
        });
        return res.json();
    },

    // --- PACKAGES ---
    getPackages: async () => {
        const res = await fetch(`${API_URL}/packages`);
        return res.json();
    },

    savePackage: async (pkg) => {
        const method = pkg.id ? 'PUT' : 'POST';
        const url = pkg.id ? `${API_URL}/packages/${pkg.id}` : `${API_URL}/packages`;
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pkg)
        });
        return res.json();
    },

    deletePackage: async (id) => {
        const res = await fetch(`${API_URL}/packages/${id}`, { method: 'DELETE' });
        return res.json();
    },

    // --- TRASH ---
    getTrash: async () => {
        const res = await fetch(`${API_URL}/trash`);
        return res.json();
    },
    restoreItem: async (type, id) => {
        const res = await fetch(`${API_URL}/${type}/${id}/restore`, { method: 'POST' });
        return res.json();
    },
    deletePermanentItem: async (type, id) => {
        const res = await fetch(`${API_URL}/${type}/${id}/permanent`, { method: 'DELETE' });
        return res.json();
    },
    emptyTrash: async () => {
        const res = await fetch(`${API_URL}/trash/empty`, { method: 'DELETE' });
        return res.json();
    },
    search: async (query) => {
        const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
        return res.json();
    },
    getNotifications: async () => {
        const res = await fetch(`${API_URL}/notifications`);
        return res.json();
    },
    markNotificationAsRead: async (id) => {
        const res = await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
        return res.json();
    },
    markAllNotificationsRead: async () => {
        const res = await fetch(`${API_URL}/notifications/read-all`, { method: 'PUT' });
        return res.json();
    },
    checkExpiringNotifications: async () => {
        try {
            const res = await fetch(`${API_URL}/notifications/check-expiring`);
            return res.json();
        } catch (err) {
            console.error('Check expiring failed:', err);
            return { checked: 0 };
        }
    },
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        return res.json();
    },

    // --- ACTIVITY LOG ---
    getActivities: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const res = await fetch(`${API_URL}/activities?${query}`);
        return res.json();
    },

    logActivity: async (data) => {
        const res = await fetch(`${API_URL}/activities`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    // --- INTEGRATION & SYNC HELPERS ---

    // Helper to find project by offer ID
    findProjectByOfferId: async (offerId) => {
        const projects = await dataService.getProjects();
        return projects.find(p => p.offer_id === parseInt(offerId) || p.offer_id === String(offerId));
    },

    logProjectActivity: async (projectId, eventType, comment) => {
        console.log(`[Activity] Project ${projectId}: ${eventType} - ${comment}`);
        // In a real app, we would POST to /api/projects/:id/events
    },

    // Centralized Sync: Offer -> Project
    syncProjectWithOffer: async (offerId, offerData) => {
        try {
            const project = await dataService.findProjectByOfferId(offerId);
            if (!project) return;

            const updates = {};
            let shouldUpdate = false;

            // 1. Status Sync (Offer Status -> Project Status)
            // Rules: Sent -> Pending, Signed -> To Do, Declined -> Cancelled/Feedback
            if (offerData.status) {
                if (offerData.status === 'sent' && project.status !== 'pending' && project.status !== 'active') {
                    updates.status = 'pending';
                    shouldUpdate = true;
                } else if (offerData.status === 'signed' && project.status !== 'todo' && project.status !== 'active') {
                    updates.status = 'todo';
                    shouldUpdate = true;
                    // Also set activeOfferId if not set? It's already linked via offer_id
                } else if (offerData.status === 'declined' && project.status !== 'cancelled') {
                    updates.status = 'feedback'; // Soft cancel
                    shouldUpdate = true;
                }
            }

            // 2. Data Sync: Strategic Notes (Offer -> Project)
            // "Keep them synchronized if offer is still the activeOfferId"
            if (offerData.strategic_notes !== undefined && offerData.strategic_notes !== project.strategic_notes) {
                updates.strategic_notes = offerData.strategic_notes;
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                console.log('[Sync] Updating Project:', project.id, updates);
                // Call original updateProject to avoid infinite loop if we wrap it
                await originalUpdateProject(project.id, updates);

                if (updates.status) {
                    await dataService.logProjectActivity(project.id, 'status_change', `Status auto-updated to ${updates.status} (Offer ${offerData.status})`);
                }
            }
        } catch (err) {
            console.error('[Sync] Project sync failed:', err);
        }
    },

    // Centralized Sync: Project -> Offer
    syncOfferWithProject: async (projectId, projectData) => {
        try {
            const project = await dataService.getProject(projectId);
            if (!project || !project.offer_id) return;

            // Data Sync: Strategic Notes (Project -> Offer)
            if (projectData.strategic_notes !== undefined) {
                const offer = await dataService.getOffer(project.offer_id);
                if (offer && offer.strategic_notes !== projectData.strategic_notes) {
                    console.log('[Sync] Updating Offer:', offer.id, { strategic_notes: projectData.strategic_notes });
                    // Call original updateOffer to avoid loop
                    await originalUpdateOffer(offer.id, { strategic_notes: projectData.strategic_notes });
                }
            }
        } catch (err) {
            console.error('[Sync] Offer sync failed:', err);
        }
    },

    createOfferFromProject: async (project) => {
        // 1. Create Offer with project data
        const newOffer = {
            status: 'draft',
            offer_name: `Offer: ${project.name}`,
            customer_id: project.customer_id,
            strategic_notes: project.strategic_notes || project.internal_notes, // Prefer strategic
            items: [],
            created_at: new Date().toISOString()
        };

        // Use originalSaveOffer to avoid side-effects during creation if needed, 
        // but saveOffer isn't wrapped yet.
        const createdOffer = await dataService.saveOffer(newOffer);

        // 2. Link to Project
        // We use originalUpdateProject to avoid triggering sync back immediately, though safe.
        // But we WANT to set offer_id.
        await originalUpdateProject(project.id, { offer_id: createdOffer.id });

        return createdOffer;
    }
};

// --- WRAPPERS FOR SYNC ---

// Project Updates
const originalUpdateProject = dataService.updateProject;
dataService.updateProject = async (id, data) => {
    const res = await originalUpdateProject(id, data);
    // Sync Project -> Offer (e.g. Notes)
    await dataService.syncOfferWithProject(id, data);
    return res;
};

// Offer Updates
const originalUpdateOffer = dataService.updateOffer;
dataService.updateOffer = async (id, data) => {
    const res = await originalUpdateOffer(id, data);
    // Sync Offer -> Project (Status, Notes)
    await dataService.syncProjectWithOffer(id, data);
    return res;
};

const originalUpdateOfferStatus = dataService.updateOfferStatus;
dataService.updateOfferStatus = async (id, status) => {
    const res = await originalUpdateOfferStatus(id, status);
    await dataService.syncProjectWithOffer(id, { status });
    return res;
};

const originalSignOffer = dataService.signOffer;
dataService.signOffer = async (token, data) => {
    const res = await originalSignOffer(token, data);
    // Need offer ID. If res has it (it should), use it.
    // If not, we might need to fetch by token logic (already have helper)
    let offerId = res.id;
    if (!offerId && token) {
        // Try to get offer by token to find ID
        try {
            const offer = await dataService.getOfferByToken(token);
            if (offer) offerId = offer.id;
        } catch (e) { /* ignore */ }
    }

    if (offerId) {
        await dataService.syncProjectWithOffer(offerId, { status: 'signed' });
    }
    return res;
};

const originalDeclineOffer = dataService.declineOffer;
dataService.declineOffer = async (token, reason) => {
    const res = await originalDeclineOffer(token, reason);
    let offerId = res.id;
    if (!offerId && token) {
        try {
            const offer = await dataService.getOfferByToken(token);
            if (offer) offerId = offer.id;
        } catch (e) { /* ignore */ }
    }

    if (offerId) {
        await dataService.syncProjectWithOffer(offerId, { status: 'declined' });
    }
    return res;
};

const originalSendOffer = dataService.sendOffer;
dataService.sendOffer = async (id) => {
    const res = await originalSendOffer(id);
    await dataService.syncProjectWithOffer(id, { status: 'sent' });
    return res;
};

