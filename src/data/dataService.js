import logger from '../utils/logger';

const API_URL = '/api';

const handleResponse = async (response, context) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('DATA', `API Error: ${context}`, {
            status: response.status,
            statusText: response.statusText,
            error: errorData
        });
        throw new Error(errorData.message || `API request failed: ${context}`);
    }
    const data = await response.json();
    logger.data(`API Success: ${context}`, { data });
    return data;
};

export const dataService = {
    // --- SETTINGS ---
    getSettings: async () => {
        try {
            const res = await fetch(`${API_URL}/settings`);
            return await handleResponse(res, 'getSettings');
        } catch (err) {
            logger.error('DATA', 'getSettings failed', err);
            throw err;
        }
    },

    saveSettings: async (settings) => {
        try {
            const res = await fetch(`${API_URL}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            return await handleResponse(res, 'saveSettings');
        } catch (err) {
            logger.error('DATA', 'saveSettings failed', err);
            throw err;
        }
    },

    getDashboardStats: async () => {
        try {
            const res = await fetch(`${API_URL}/dashboard/stats`);
            return await handleResponse(res, 'getDashboardStats');
        } catch (err) {
            logger.error('DATA', 'getDashboardStats failed', err);
            throw err;
        }
    },

    getAuditChecks: async () => {
        try {
            const res = await fetch(`${API_URL}/audit/checks`);
            return await handleResponse(res, 'getAuditChecks');
        } catch (err) {
            logger.error('DATA', 'getAuditChecks failed', err);
            throw err;
        }
    },

    repairLinks: async () => {
        try {
            const res = await fetch(`${API_URL}/audit/repair`, { method: 'POST' });
            return await handleResponse(res, 'repairLinks');
        } catch (err) {
            logger.error('DATA', 'repairLinks failed', err);
            // Non-blocking for now
            return { success: false };
        }
    },

    getCustomerDashboard: async (id) => {
        try {
            const res = await fetch(`${API_URL}/customers/${id}/dashboard`);
            return await handleResponse(res, 'getCustomerDashboard');
        } catch (err) {
            logger.error('DATA', 'getCustomerDashboard failed', { id, err });
            throw err;
        }
    },

    // --- OFFERS ---
    getOffers: async () => {
        try {
            const res = await fetch(`${API_URL}/offers`);
            return await handleResponse(res, 'getOffers');
        } catch (err) {
            logger.error('DATA', 'getOffers failed', err);
            throw err;
        }
    },

    getOfferById: async (id) => { // Unified naming if needed, but keeping original or adding both
        try {
            const res = await fetch(`${API_URL}/offers/${id}`);
            return await handleResponse(res, 'getOfferById');
        } catch (err) {
            logger.error('DATA', 'getOfferById failed', { id, err });
            throw err;
        }
    },

    getOffer: async (id) => dataService.getOfferById(id), // Alias for backward compatibility

    getOfferByToken: async (token) => {
        try {
            const res = await fetch(`${API_URL}/offers/public/${token}`);
            return await handleResponse(res, 'getOfferByToken');
        } catch (err) {
            logger.error('DATA', 'getOfferByToken failed', { token, err });
            throw err;
        }
    },

    saveOffer: async (offer) => {
        try {
            const res = await fetch(`${API_URL}/offers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(offer)
            });
            return await handleResponse(res, 'saveOffer');
        } catch (err) {
            logger.error('DATA', 'saveOffer failed', err);
            throw err;
        }
    },

    updateOffer: async (id, offer) => {
        try {
            const res = await fetch(`${API_URL}/offers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(offer)
            });
            return await handleResponse(res, 'updateOffer');
        } catch (err) {
            logger.error('DATA', 'updateOffer failed', { id, err });
            throw err;
        }
    },

    updateOfferStatus: async (id, status) => {
        try {
            const res = await fetch(`${API_URL}/offers/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            return await handleResponse(res, 'updateOfferStatus');
        } catch (err) {
            logger.error('DATA', 'updateOfferStatus failed', { id, status, err });
            throw err;
        }
    },

    deleteOffer: async (id) => {
        try {
            const res = await fetch(`${API_URL}/offers/${id}`, { method: 'DELETE' });
            return await handleResponse(res, 'deleteOffer');
        } catch (err) {
            logger.error('DATA', 'deleteOffer failed', { id, err });
            throw err;
        }
    },

    duplicateOffer: async (id) => {
        try {
            const res = await fetch(`${API_URL}/offers/${id}/duplicate`, { method: 'POST' });
            return await handleResponse(res, 'duplicateOffer');
        } catch (err) {
            logger.error('DATA', 'duplicateOffer failed', { id, err });
            throw err;
        }
    },

    // --- CUSTOMERS ---
    getCustomers: async () => {
        try {
            const res = await fetch(`${API_URL}/customers`);
            return await handleResponse(res, 'getCustomers');
        } catch (err) {
            logger.error('DATA', 'getCustomers failed', err);
            throw err;
        }
    },

    saveCustomer: async (customer) => {
        try {
            const method = customer.id ? 'PUT' : 'POST';
            const url = customer.id ? `${API_URL}/customers/${customer.id}` : `${API_URL}/customers`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customer)
            });
            return await handleResponse(res, 'saveCustomer');
        } catch (err) {
            logger.error('DATA', 'saveCustomer failed', err);
            throw err;
        }
    },

    deleteCustomer: async (id) => {
        try {
            const res = await fetch(`${API_URL}/customers/${id}`, { method: 'DELETE' });
            return await handleResponse(res, 'deleteCustomer');
        } catch (err) {
            logger.error('DATA', 'deleteCustomer failed', { id, err });
            throw err;
        }
    },

    // --- SERVICES ---
    getServices: async () => {
        try {
            const res = await fetch(`${API_URL}/services`);
            return await handleResponse(res, 'getServices');
        } catch (err) {
            logger.error('DATA', 'getServices failed', err);
            throw err;
        }
    },

    saveService: async (service) => {
        try {
            const method = service.id ? 'PUT' : 'POST';
            const url = service.id ? `${API_URL}/services/${service.id}` : `${API_URL}/services`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(service)
            });
            return await handleResponse(res, 'saveService');
        } catch (err) {
            logger.error('DATA', 'saveService failed', err);
            throw err;
        }
    },

    deleteService: async (id) => {
        try {
            const res = await fetch(`${API_URL}/services/${id}`, { method: 'DELETE' });
            return await handleResponse(res, 'deleteService');
        } catch (err) {
            logger.error('DATA', 'deleteService failed', { id, err });
            throw err;
        }
    },

    // --- PROJECTS ---
    getProjects: async () => {
        try {
            const res = await fetch(`${API_URL}/projects`);
            return await handleResponse(res, 'getProjects');
        } catch (err) {
            logger.error('DATA', 'getProjects failed', err);
            throw err;
        }
    },

    getProject: async (id) => {
        try {
            const res = await fetch(`${API_URL}/projects/${id}`);
            return await handleResponse(res, 'getProject');
        } catch (err) {
            logger.error('DATA', 'getProject failed', { id, err });
            throw err;
        }
    },

    createProject: async (project) => {
        try {
            const res = await fetch(`${API_URL}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(project)
            });
            return await handleResponse(res, 'createProject');
        } catch (err) {
            logger.error('DATA', 'createProject failed', err);
            throw err;
        }
    },

    updateProject: async (id, data) => {
        try {
            const res = await fetch(`${API_URL}/projects/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await handleResponse(res, 'updateProject');
        } catch (err) {
            logger.error('DATA', 'updateProject failed', { id, err });
            throw err;
        }
    },

    deleteProject: async (id) => {
        try {
            const res = await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
            return await handleResponse(res, 'deleteProject');
        } catch (err) {
            logger.error('DATA', 'deleteProject failed', { id, err });
            throw err;
        }
    },

    // --- TASKS ---
    createTask: async (projectId, task) => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            return await handleResponse(res, 'createTask');
        } catch (err) {
            logger.error('DATA', 'createTask failed', { projectId, err });
            throw err;
        }
    },

    updateTask: async (id, task) => {
        try {
            const res = await fetch(`${API_URL}/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });
            return await handleResponse(res, 'updateTask');
        } catch (err) {
            logger.error('DATA', 'updateTask failed', { id, err });
            throw err;
        }
    },

    deleteTask: async (id) => {
        try {
            const res = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE' });
            return await handleResponse(res, 'deleteTask');
        } catch (err) {
            logger.error('DATA', 'deleteTask failed', { id, err });
            throw err;
        }
    },

    // --- REVIEWS ---
    getReviews: async () => {
        try {
            const res = await fetch(`${API_URL}/reviews`);
            return await handleResponse(res, 'getReviews');
        } catch (err) {
            logger.error('DATA', 'getReviews failed', err);
            throw err;
        }
    },

    getReviewByToken: async (token, versionId = null) => {
        try {
            let url = `${API_URL}/review-by-token/${token}`;
            if (versionId) url += `?v=${versionId}`;
            const res = await fetch(url);
            return await handleResponse(res, 'getReviewByToken');
        } catch (err) {
            logger.error('DATA', 'getReviewByToken failed', { token, err });
            throw err;
        }
    },

    uploadReview: async (projectId, file, title = null, limit = null, policy = null) => {
        try {
            const formData = new FormData();
            formData.append('project_id', projectId);
            formData.append('file', file);
            if (title) formData.append('title', title);
            if (limit) formData.append('review_limit', limit);
            if (policy) formData.append('review_policy', policy);
            formData.append('created_by', 'Designer');

            const res = await fetch(`${API_URL}/reviews/upload`, {
                method: 'POST',
                body: formData
            });
            return await handleResponse(res, 'uploadReview');
        } catch (err) {
            logger.error('DATA', 'uploadReview failed', { projectId, err });
            throw err;
        }
    },

    // --- PRINT PRODUCTS ---
    getPrintProducts: async (params = {}) => {
        try {
            const query = new URLSearchParams(params).toString();
            const res = await fetch(`${API_URL}/print-products?${query}`);
            return await handleResponse(res, 'getPrintProducts');
        } catch (err) {
            logger.error('DATA', 'getPrintProducts failed', err);
            throw err;
        }
    },

    getPrintParameters: async (key = null) => {
        try {
            let url = `${API_URL}/print-parameters`;
            if (key) url += `?key=${key}`;
            const res = await fetch(url);
            return await handleResponse(res, 'getPrintParameters');
        } catch (err) {
            logger.error('DATA', 'getPrintParameters failed', err);
            throw err;
        }
    },

    // --- ACTIONS ---
    sendOffer: async (id) => {
        try {
            const res = await fetch(`${API_URL}/offers/${id}/send`, { method: 'POST' });
            const data = await handleResponse(res, 'sendOffer');
            await dataService.syncProjectWithOffer(id, { status: 'sent' });
            return data;
        } catch (err) {
            logger.error('DATA', 'sendOffer failed', { id, err });
            throw err;
        }
    },

    signOffer: async (token, data) => {
        try {
            const res = await fetch(`${API_URL}/offers/public/${token}/sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await handleResponse(res, 'signOffer');
        } catch (err) {
            logger.error('DATA', 'signOffer failed', { token, err });
            throw err;
        }
    },

    declineOffer: async (token, reason) => {
        try {
            const res = await fetch(`${API_URL}/offers/public/${token}/decline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: reason })
            });
            return await handleResponse(res, 'declineOffer');
        } catch (err) {
            logger.error('DATA', 'declineOffer failed', { token, err });
            throw err;
        }
    },

    // --- TRASH ---
    getTrash: async () => {
        try {
            const res = await fetch(`${API_URL}/trash`);
            return await handleResponse(res, 'getTrash');
        } catch (err) {
            logger.error('DATA', 'getTrash failed', err);
            throw err;
        }
    },

    restoreItem: async (type, id) => {
        try {
            const res = await fetch(`${API_URL}/${type}/${id}/restore`, { method: 'POST' });
            return await handleResponse(res, 'restoreItem');
        } catch (err) {
            logger.error('DATA', 'restoreItem failed', { type, id, err });
            throw err;
        }
    },

    // Notifications
    getNotifications: async () => {
        try {
            const res = await fetch(`${API_URL}/notifications`);
            return await handleResponse(res, 'getNotifications');
        } catch (err) {
            logger.error('DATA', 'getNotifications failed', err);
            return []; // Fail gracefully for notifications
        }
    },

    // Sync Helpers
    findProjectByOfferId: async (offerId) => {
        try {
            const projects = await dataService.getProjects();
            const idToMatch = Number(offerId);
            return projects.find(p => p.offer_id === idToMatch) || null;
        } catch (err) {
            logger.warn('WIZARD', 'findProjectByOfferId failed', { offerId, err });
            return null;
        }
    },

    syncProjectWithOffer: async (offerId, offerData) => {
        try {
            const project = await dataService.findProjectByOfferId(offerId);
            if (!project) return;

            const updates = {};
            let shouldUpdate = false;

            if (offerData.status) {
                if (offerData.status === 'sent' && project.status !== 'pending' && project.status !== 'active') {
                    updates.status = 'pending';
                    shouldUpdate = true;
                } else if (offerData.status === 'signed' && project.status !== 'todo' && project.status !== 'active') {
                    updates.status = 'todo';
                    shouldUpdate = true;
                } else if (offerData.status === 'declined' && project.status !== 'cancelled') {
                    updates.status = 'feedback';
                    shouldUpdate = true;
                }
            }

            if (offerData.strategic_notes !== undefined && offerData.strategic_notes !== project.strategic_notes) {
                updates.strategic_notes = offerData.strategic_notes;
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                logger.info('SYNC', 'Syncing Project with Offer', { projectId: project.id, updates });
                await dataService.updateProject(project.id, updates);
            }
        } catch (err) {
            logger.error('SYNC', 'Project sync failed', { offerId, err });
        }
    },

    // Portal
    getPortalData: async (customerId) => {
        try {
            const res = await fetch(`${API_URL}/portal/data/${customerId}`);
            return await handleResponse(res, 'getPortalData');
        } catch (err) {
            logger.error('DATA', 'getPortalData failed', { customerId, err });
            throw err;
        }
    }
};

const originalUpdateOfferStatus = dataService.updateOfferStatus;
dataService.updateOfferStatus = async (id, status) => {
    console.log(`[dataService] Updating Offer Status ${id} -> ${status}`);
    const res = await originalUpdateOfferStatus(id, status);
    await dataService.syncProjectWithOffer(id, { status });
    return res;
};

const originalSignOffer = dataService.signOffer;
dataService.signOffer = async (token, data) => {
    return await originalSignOffer(token, data);
};

const originalDeclineOffer = dataService.declineOffer;
dataService.declineOffer = async (token, reason) => {
    return await originalDeclineOffer(token, reason);
};

const originalSendOffer = dataService.sendOffer;
dataService.sendOffer = async (id) => {
    const res = await originalSendOffer(id);
    await dataService.syncProjectWithOffer(id, { status: 'sent' });
    return res;
};

