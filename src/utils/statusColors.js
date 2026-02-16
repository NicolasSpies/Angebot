export const STATUS_COLORS = {
    // Projects
    pending: { label: 'Pending', bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF' }, // Cool Gray
    todo: { label: 'To Do', bg: '#F8FAFC', text: '#334155', dot: '#64748B' }, // Slate
    in_progress: { label: 'In Progress', bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' }, // Orange
    feedback: { label: 'Feedback', bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' }, // Blue
    done: { label: 'Done', bg: '#ECFDF5', text: '#047857', dot: '#10B981' }, // Emerald
    cancelled: { label: 'Cancelled', bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' }, // Red

    // Offers
    draft: { label: 'Draft', bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF' },
    sent: { label: 'Sent', bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
    signed: { label: 'Signed', bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
    declined: { label: 'Declined', bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' },

    // Reviews
    // Reviews
    in_review: { label: 'In Review', bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6', waitingOn: 'Client' },
    changes_requested: { label: 'Changes Requested', bg: '#FFF7ED', text: '#C2410C', dot: '#F97316', waitingOn: 'Designer' },
    approved: { label: 'Approved', bg: '#ECFDF5', text: '#047857', dot: '#10B981' },
    draft: { label: 'Draft', bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF', waitingOn: 'Designer' }
};

export const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.pending;
