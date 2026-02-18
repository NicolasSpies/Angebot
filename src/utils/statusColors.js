export const STATUS_COLORS = {
    // Projects
    todo: { label: 'To Do', bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF' },
    in_progress: { label: 'In Progress', bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
    feedback: { label: 'Feedback', bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
    done: { label: 'Done', bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
    cancelled: { label: 'Cancelled', bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' },

    // Offers
    draft: { label: 'Draft', bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF' },
    sent: { label: 'Sent', bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
    signed: { label: 'Signed', bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
    declined: { label: 'Declined', bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' },

    // Reviews
    in_review: { label: 'In Review', bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6', waitingOn: 'Client' },
    changes_requested: { label: 'Changes Requested', bg: '#FFF7ED', text: '#C2410C', dot: '#F97316', waitingOn: 'Designer' },
    approved: { label: 'Approved', bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
    draft_review: { label: 'Draft', bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF', waitingOn: 'Designer' },

    // Customers (Health)
    active: { label: 'Active', bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
    inactive: { label: 'Inactive', bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF' },

    // Portals
    enabled: { label: 'Enabled', bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
    not_enabled: { label: 'Not Enabled', bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF' }
};

export const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.todo;
