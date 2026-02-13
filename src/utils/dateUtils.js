/**
 * Utility functions for date calculations in the Angebot app.
 */

/**
 * Calculates the progress percentage (0-100) based on creation date and due date.
 * @param {string|Date} createdAt - The date the offer was created.
 * @param {string|Date} dueDate - The date the offer is due/expires.
 * @returns {number} Progress percentage from 0 to 100.
 */
export const calculateValidityProgress = (createdAt, dueDate) => {
    if (!createdAt || !dueDate) return 0;

    const start = new Date(createdAt).getTime();
    const end = new Date(dueDate).getTime();
    const now = Date.now();

    if (now <= start) return 0;
    if (now >= end) return 100;

    const total = end - start;
    const elapsed = now - start;

    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
};

/**
 * Formats a date to DD.MM.YYYY.
 * @param {string|Date} date - The date to format.
 * @returns {string} Formatted date string.
 */
export const formatDateDot = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/**
 * Formats a date to the Dash template style (e.g., "MM/DD/YY" or "Month Day, Year").
 * @param {string|Date} date - The date to format.
 * @param {boolean} long - Whether to use long format.
 * @returns {string} Formatted date string.
 */
export const formatDateDash = (date, long = false) => {
    if (!date) return '—';
    const d = new Date(date);
    if (long) {
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
};
