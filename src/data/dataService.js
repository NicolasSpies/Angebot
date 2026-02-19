import logger from '../utils/logger';
const API_URL = '/api';

const _cache = {
    settings: null,
    dashboardStats: null,
    offers: null,
    customers: null,
    projects: null,
    lastFetch: {}
};

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
    getOffers: async (forceRefresh = false) => {
        if (!forceRefresh && _cache.offers) {
            // Background refresh
            fetch(`${API_URL}/offers`)
                .then(res => handleResponse(res, 'getOffers'))
                .then(data => { _cache.offers = data; })
                .catch(() => { });
            return _cache.offers;
        }
        try {
            const res = await fetch(`${API_URL}/offers`);
            const data = await handleResponse(res, 'getOffers');
            _cache.offers = data;
            return data;
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
    getCustomers: async (forceRefresh = false) => {
        if (!forceRefresh && _cache.customers) {
            fetch(`${API_URL}/customers`)
                .then(res => handleResponse(res, 'getCustomers'))
                .then(data => { _cache.customers = data; })
                .catch(() => { });
            return _cache.customers;
        }
        try {
            const res = await fetch(`${API_URL}/customers`);
            const data = await handleResponse(res, 'getCustomers');
            _cache.customers = data;
            return data;
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

    getBundles: async () => {
        try {
            const res = await fetch(`${API_URL}/bundles`);
            return await handleResponse(res, 'getBundles');
        } catch (err) {
            logger.error('DATA', 'getBundles failed', err);
            throw err;
        }
    },

    saveBundle: async (bundle) => {
        try {
            const method = bundle.id ? 'PUT' : 'POST';
            const url = bundle.id ? `${API_URL}/bundles/${bundle.id}` : `${API_URL}/bundles`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bundle)
            });
            return await handleResponse(res, 'saveBundle');
        } catch (err) {
            logger.error('DATA', 'saveBundle failed', err);
            throw err;
        }
    },

    deleteBundle: async (id) => {
        try {
            const res = await fetch(`${API_URL}/bundles/${id}`, { method: 'DELETE' });
            return await handleResponse(res, 'deleteBundle');
        } catch (err) {
            logger.error('DATA', 'deleteBundle failed', { id, err });
            throw err;
        }
    },

    getPrintProducts: async (params = {}) => {
        try {
            const query = new URLSearchParams(params).toString();
            const res = await fetch(`${API_URL}/print-products${query ? '?' + query : ''}`);
            return await handleResponse(res, 'getPrintProducts');
        } catch (err) {
            logger.error('DATA', 'getPrintProducts failed', err);
            throw err;
        }
    },

    savePrintProduct: async (product) => {
        try {
            const method = product.id ? 'PUT' : 'POST';
            const url = product.id ? `${API_URL}/print-products/${product.id}` : `${API_URL}/print-products`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(product)
            });
            return await handleResponse(res, 'savePrintProduct');
        } catch (err) {
            logger.error('DATA', 'savePrintProduct failed', err);
            throw err;
        }
    },

    deletePrintProduct: async (id) => {
        try {
            const res = await fetch(`${API_URL}/print-products/${id}`, { method: 'DELETE' });
            return await handleResponse(res, 'deletePrintProduct');
        } catch (err) {
            logger.error('DATA', 'deletePrintProduct failed', { id, err });
            throw err;
        }
    },

    // --- PROJECTS ---
    getProjects: async (forceRefresh = false) => {
        if (!forceRefresh && _cache.projects) {
            fetch(`${API_URL}/projects`)
                .then(res => handleResponse(res, 'getProjects'))
                .then(data => { _cache.projects = data; })
                .catch(() => { });
            return _cache.projects;
        }
        try {
            const res = await fetch(`${API_URL}/projects`);
            const data = await handleResponse(res, 'getProjects');
            _cache.projects = data;
            return data;
        } catch (err) {
            logger.error('DATA', 'getProjects failed', err);
            throw err;
        }
    },

    clearCache: (key) => {
        if (key) _cache[key] = null;
        else {
            _cache.offers = null;
            _cache.customers = null;
            _cache.projects = null;
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

    addProjectTrackingLink: async (projectId, link) => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/tracking-links`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(link)
            });
            return await handleResponse(res, 'addProjectTrackingLink');
        } catch (err) {
            logger.error('DATA', 'addProjectTrackingLink failed', { projectId, err });
            throw err;
        }
    },

    deleteProjectTrackingLink: async (id) => {
        try {
            const res = await fetch(`${API_URL}/tracking-links/${id}`, { method: 'DELETE' });
            return await handleResponse(res, 'deleteProjectTrackingLink');
        } catch (err) {
            logger.error('DATA', 'deleteProjectTrackingLink failed', { id, err });
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

    getProjectReviews: async (projectId) => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/reviews`);
            return await handleResponse(res, 'getProjectReviews');
        } catch (err) {
            logger.error('DATA', 'getProjectReviews failed', { projectId, err });
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

    deleteReview: async (id) => {
        try {
            const res = await fetch(`${API_URL}/reviews/${id}`, { method: 'DELETE' });
            return await handleResponse(res, 'deleteReview');
        } catch (err) {
            logger.error('DATA', 'deleteReview failed', { id, err });
            throw err;
        }
    },

    getReviewComments: async (versionId) => {
        try {
            const res = await fetch(`${API_URL}/reviews/versions/${versionId}/comments`);
            return await handleResponse(res, 'getReviewComments');
        } catch (err) {
            logger.error('DATA', 'getReviewComments failed', { versionId, err });
            throw err;
        }
    },

    createReviewComment: async (versionId, commentData) => {
        try {
            const res = await fetch(`${API_URL}/reviews/versions/${versionId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentData)
            });
            return await handleResponse(res, 'createReviewComment');
        } catch (err) {
            logger.error('DATA', 'createReviewComment failed', { versionId, err });
            throw err;
        }
    },

    updateReviewComment: async (id, commentData) => {
        try {
            const res = await fetch(`${API_URL}/review-comments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentData)
            });
            return await handleResponse(res, 'updateReviewComment');
        } catch (err) {
            logger.error('DATA', 'updateReviewComment failed', { id, err });
            throw err;
        }
    },

    deleteReviewComment: async (id) => {
        try {
            const res = await fetch(`${API_URL}/review-comments/${id}`, { method: 'DELETE' });
            return await handleResponse(res, 'deleteReviewComment');
        } catch (err) {
            logger.error('DATA', 'deleteReviewComment failed', { id, err });
            throw err;
        }
    },

    approveReview: async (reviewId, versionId, identity) => {
        try {
            const res = await fetch(`${API_URL}/reviews/${reviewId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve', versionId, ...identity })
            });
            return await handleResponse(res, 'approveReview');
        } catch (err) {
            logger.error('DATA', 'approveReview failed', { reviewId, err });
            throw err;
        }
    },

    requestChanges: async (reviewId, versionId, identity) => {
        try {
            const res = await fetch(`${API_URL}/reviews/${reviewId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'request-changes', versionId, ...identity })
            });
            return await handleResponse(res, 'requestChanges');
        } catch (err) {
            logger.error('DATA', 'requestChanges failed', { reviewId, err });
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

    deletePermanentItem: async (type, id) => {
        try {
            const res = await fetch(`${API_URL}/${type}/${id}/permanent`, { method: 'DELETE' });
            return await handleResponse(res, 'deletePermanentItem');
        } catch (err) {
            logger.error('DATA', 'deletePermanentItem failed', { type, id, err });
            throw err;
        }
    },

    emptyTrash: async () => {
        try {
            const res = await fetch(`${API_URL}/trash/empty`, { method: 'DELETE' });
            return await handleResponse(res, 'emptyTrash');
        } catch (err) {
            logger.error('DATA', 'emptyTrash failed', err);
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

    markNotificationAsRead: async (id) => {
        try {
            const res = await fetch(`${API_URL}/notifications/${id}/read`, {
                method: 'PUT'
            });
            return await handleResponse(res, 'markNotificationAsRead');
        } catch (err) {
            logger.error('DATA', 'markNotificationAsRead failed', err);
            throw err;
        }
    },

    markAllNotificationsRead: async () => {
        try {
            const res = await fetch(`${API_URL}/notifications/read-all`, {
                method: 'PUT'
            });
            return await handleResponse(res, 'markAllNotificationsRead');
        } catch (err) {
            logger.error('DATA', 'markAllNotificationsRead failed', err);
            throw err;
        }
    },

    deleteNotification: async (id) => {
        try {
            const res = await fetch(`${API_URL}/notifications/${id}`, {
                method: 'DELETE'
            });
            return await handleResponse(res, 'deleteNotification');
        } catch (err) {
            logger.error('DATA', 'deleteNotification failed', err);
            throw err;
        }
    },

    clearAllNotifications: async () => {
        try {
            const res = await fetch(`${API_URL}/notifications/clear-all`, {
                method: 'DELETE'
            });
            return await handleResponse(res, 'clearAllNotifications');
        } catch (err) {
            logger.error('DATA', 'clearAllNotifications failed', err);
            throw err;
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
    },

    // Aliases for component compatibility
    getPackages: async () => dataService.getProjects(), // If bundles are projects
    savePackage: async (bundle) => dataService.saveOffer(bundle), // Or whatever bundle logic was
    checkExpiringNotifications: async () => {
        try {
            const res = await fetch(`${API_URL}/notifications/check-expiring`);
            return await handleResponse(res, 'checkExpiringNotifications');
        } catch (err) {
            logger.error('DATA', 'checkExpiringNotifications failed', err);
            return { checked: 0 };
        }
    },

    // --- SUPPORT ---
    getSupportPackages: async () => {
        try {
            const res = await fetch(`${API_URL}/support/packages`);
            return await handleResponse(res, 'getSupportPackages');
        } catch (err) {
            logger.error('DATA', 'getSupportPackages failed', err);
            throw err;
        }
    },

    saveSupportPackage: async (pkg) => {
        try {
            const method = pkg.id ? 'PUT' : 'POST';
            const url = pkg.id ? `${API_URL}/support/packages/${pkg.id}` : `${API_URL}/support/packages`;
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pkg)
            });
            return await handleResponse(res, 'saveSupportPackage');
        } catch (err) {
            logger.error('DATA', 'saveSupportPackage failed', err);
            throw err;
        }
    },

    trashSupportPackage: async (id) => {
        try {
            const res = await fetch(`${API_URL}/support/accounts/${id}/trash`, { method: 'POST' });
            return await handleResponse(res, 'trashSupportPackage');
        } catch (err) {
            logger.error('DATA', 'trashSupportPackage failed', err);
            throw err;
        }
    },

    restoreSupportPackage: async (id) => {
        try {
            const res = await fetch(`${API_URL}/support/accounts/${id}/restore`, { method: 'POST' });
            return await handleResponse(res, 'restoreSupportPackage');
        } catch (err) {
            logger.error('DATA', 'restoreSupportPackage failed', err);
            throw err;
        }
    },

    deleteSupportPackage: async (id) => {
        try {
            const res = await fetch(`${API_URL}/support/accounts/${id}`, { method: 'DELETE' });
            return await handleResponse(res, 'deleteSupportPackage');
        } catch (err) {
            logger.error('DATA', 'deleteSupportPackage failed', err);
            throw err;
        }
    },

    getSupportAccounts: async () => {
        try {
            const res = await fetch(`${API_URL}/support/accounts`);
            return await handleResponse(res, 'getSupportAccounts');
        } catch (err) {
            logger.error('DATA', 'getSupportAccounts failed', err);
            throw err;
        }
    },

    assignSupportPackage: async (customerId, packageId) => {
        try {
            const res = await fetch(`${API_URL}/support/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: customerId, package_id: packageId })
            });
            return await handleResponse(res, 'assignSupportPackage');
        } catch (err) {
            logger.error('DATA', 'assignSupportPackage failed', err);
            throw err;
        }
    },

    getSupportTimeEntries: async (accountId) => {
        try {
            const res = await fetch(`${API_URL}/support/accounts/${accountId}/time-entries`);
            return await handleResponse(res, 'getSupportTimeEntries');
        } catch (err) {
            logger.error('DATA', 'getSupportTimeEntries failed', err);
            throw err;
        }
    },

    updateSupportTimeEntry: async (id, data) => {
        try {
            const res = await fetch(`${API_URL}/support/time-entries/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await handleResponse(res, 'updateSupportTimeEntry');
        } catch (err) {
            logger.error('DATA', 'updateSupportTimeEntry failed', err);
            throw err;
        }
    },

    deleteSupportTimeEntry: async (id) => {
        try {
            const res = await fetch(`${API_URL}/support/time-entries/${id}`, {
                method: 'DELETE'
            });
            return await handleResponse(res, 'deleteSupportTimeEntry');
        } catch (err) {
            logger.error('DATA', 'deleteSupportTimeEntry failed', err);
            throw err;
        }
    },

    getActiveTimer: async () => {
        try {
            const res = await fetch(`${API_URL}/support/timer/active`);
            return await handleResponse(res, 'getActiveTimer');
        } catch (err) {
            logger.error('DATA', 'getActiveTimer failed', err);
            return null;
        }
    },

    startTimer: async (data) => {
        try {
            const res = await fetch(`${API_URL}/support/timer/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await handleResponse(res, 'startTimer');
        } catch (err) {
            logger.error('DATA', 'startTimer failed', err);
            throw err;
        }
    },

    stopTimer: async (description) => {
        try {
            const res = await fetch(`${API_URL}/support/timer/stop`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description })
            });
            return await handleResponse(res, 'stopTimer');
        } catch (err) {
            logger.error('DATA', 'stopTimer failed', err);
            throw err;
        }
    },

    getCustomerSupport: async (customerId) => {
        try {
            const res = await fetch(`${API_URL}/customers/${customerId}/support`);
            return await handleResponse(res, 'getCustomerSupport');
        } catch (err) {
            logger.error('DATA', 'getCustomerSupport failed', { customerId, err });
            throw err;
        }
    },

    logSupportHours: async (customerId, data) => {
        try {
            const res = await fetch(`${API_URL}/customers/${customerId}/support/hours`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await handleResponse(res, 'logSupportHours');
        } catch (err) {
            logger.error('DATA', 'logSupportHours failed', { customerId, err });
            throw err;
        }
    },

    getSupportBilling: async () => {
        try {
            const res = await fetch(`${API_URL}/support/billing`);
            return await handleResponse(res, 'getSupportBilling');
        } catch (err) {
            logger.error('DATA', 'getSupportBilling failed', err);
            throw err;
        }
    },

    markSupportAsBilled: async (customerId, billingPeriod) => {
        try {
            const res = await fetch(`${API_URL}/support/billing/mark-billed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId, billingPeriod })
            });
            return await handleResponse(res, 'markSupportAsBilled');
        } catch (err) {
            logger.error('DATA', 'markSupportAsBilled failed', err);
            throw err;
        }
    },
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

