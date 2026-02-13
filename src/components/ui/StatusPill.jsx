import React from 'react';

const STATUS_CONFIG = {
    pending: { label: 'Pending', bg: '#FFF7EC', text: '#D97706' }, // Soft Amber
    todo: { label: 'To Do', bg: '#F1F5F9', text: '#475569' }, // Soft Slate
    in_progress: { label: 'In Progress', bg: '#F0F9FF', text: '#0284C7' }, // Soft Sky
    feedback: { label: 'Feedback', bg: '#F5F3FF', text: '#7C3AED' }, // Soft Violet
    done: { label: 'Done', bg: '#ECFDF5', text: '#059669' }, // Soft Emerald
    cancelled: { label: 'Cancelled', bg: '#FEF2F2', text: '#DC2626' }, // Soft Red

    // Offer specific
    draft: { label: 'Draft', bg: '#F3F4F6', text: '#4B5563' },
    sent: { label: 'Sent', bg: '#EFF6FF', text: '#2563EB' },
    signed: { label: 'Signed', bg: '#ECFDF5', text: '#059669' },
    declined: { label: 'Declined', bg: '#FEF2F2', text: '#DC2626' }
};

const StatusPill = ({ status, label }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG['pending'];
    const displayText = label || config.label;

    return (
        <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
            style={{
                backgroundColor: config.bg,
                color: config.text,
                border: '1px solid transparent' // Placeholder for future borders if needed
            }}
        >
            {displayText}
        </span>
    );
};

export default StatusPill;
