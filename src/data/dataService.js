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
    }
};
