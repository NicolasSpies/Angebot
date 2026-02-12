const STORAGE_KEY = 'angebot_audit_log';

export const auditService = {
    getLogs: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'),

    log: (action, entityId, details, user) => {
        const logs = auditService.getLogs();
        const entry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            action, // 'CREATE', 'UPDATE', 'DELETE', 'DUPLICATE', 'EXPORT'
            entityId,
            details,
            user: user?.name || 'Unknown System User'
        };
        logs.unshift(entry); // Newest first
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 100))); // Keep last 100
        console.log('Audit Log:', entry);
    }
};
