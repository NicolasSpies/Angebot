/**
 * Simple structured logger for the application.
 * In development, it logs to the console with formatting.
 * In production, it could be extended to send logs to a monitoring service.
 */

const isDev = import.meta.env.DEV;

const COLORS = {
    INFO: '#3b82f6', // blue
    WARN: '#f59e0b', // amber
    ERROR: '#ef4444', // red
    SUCCESS: '#10b981', // green
    ROUTE: '#8b5cf6', // violet
    DATA: '#ec4899', // pink
};

const logger = {
    _log(level, category, message, data) {
        if (!isDev && level !== 'ERROR') return;

        const timestamp = new Date().toISOString();
        const color = COLORS[category] || COLORS[level] || '#64748b';

        const prefix = `%c[${timestamp}] [${level}] [${category}]`;
        const style = `color: white; background: ${color}; padding: 2px 5px; border-radius: 3px; font-weight: bold;`;

        if (data) {
            console.groupCollapsed(prefix, style, message);
            console.log('Data:', data);
            console.groupEnd();
        } else {
            console.log(prefix, style, message);
        }
    },

    info(category, message, data) {
        this._log('INFO', category, message, data);
    },

    warn(category, message, data) {
        this._log('WARN', category, message, data);
    },

    error(category, message, data) {
        this._log('ERROR', category, message, data);
    },

    success(category, message, data) {
        this._log('SUCCESS', category, message, data);
    },

    route(message, data) {
        this._log('INFO', 'ROUTE', message, data);
    },

    data(message, data) {
        this._log('INFO', 'DATA', message, data);
    }
};

// Also attach to window for access in ErrorBoundary
if (typeof window !== 'undefined') {
    window.appLogger = logger;
}

export default logger;
