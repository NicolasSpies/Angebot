import React from 'react';

const DeadlineIndicator = ({ dueDate, createdAt }) => {
    if (!dueDate) return null;

    const calculateTimeStatus = () => {
        const due = new Date(dueDate);
        due.setHours(23, 59, 59, 999);

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const diffTime = due - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const isExpired = diffDays < 0;
        const isUrgent = diffDays <= 3 && !isExpired;

        return { diffDays, isExpired, isUrgent };
    };

    const { diffDays, isExpired, isUrgent } = calculateTimeStatus();

    // Determine colors and text
    let color = '#10b981'; // green-500
    let bgColor = '#d1fae5'; // green-100
    let text = `${diffDays} days remaining`;
    let labelColor = '#047857'; // green-700

    if (isExpired) {
        color = '#ef4444'; // red-500
        bgColor = '#fee2e2'; // red-100
        labelColor = '#b91c1c'; // red-700
        text = `Expired ${Math.abs(diffDays)} days ago`;
    } else if (isUrgent) {
        color = '#f59e0b'; // amber-500
        bgColor = '#fef3c7'; // amber-100
        labelColor = '#b45309'; // amber-700
        text = `${diffDays} days remaining`;
    } else if (diffDays === 0) {
        color = '#f59e0b';
        text = 'Due today';
    }

    // Calculate percentage based on the actual validity window (created_at → due_date)
    // rather than a hardcoded 30-day max
    const due = new Date(dueDate);
    const now = new Date();
    const startDate = createdAt ? new Date(createdAt) : new Date(due.getTime() - 14 * 24 * 60 * 60 * 1000); // fallback: assume 14 days validity
    const totalWindow = Math.max(1, Math.ceil((due - startDate) / (1000 * 60 * 60 * 24)));
    const elapsed = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    const itemsPercent = Math.max(0, Math.min(100, (elapsed / totalWindow) * 100));

    return (
        <div className="no-print" style={{ padding: '1rem', background: bgColor, borderRadius: '8px', border: `1px solid ${color}30`, marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: labelColor, fontSize: '0.9rem' }}>
                    Deadline
                </span>
                <span style={{ fontWeight: 700, color: labelColor, fontSize: '0.9rem' }}>
                    {text}
                </span>
            </div>

            {/* Progress Bar Container */}
            <div style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255,255,255,0.6)',
                borderRadius: '4px',
                overflow: 'hidden'
            }}>
                {/* Progress Fill */}
                <div style={{
                    width: `${itemsPercent}%`,
                    height: '100%',
                    background: color,
                    transition: 'width 0.5s ease'
                }} />
            </div>

            <div style={{ textAlign: 'right', marginTop: '0.25rem', fontSize: '0.75rem', color: labelColor, opacity: 0.8 }}>
                Due: {new Date(dueDate).toLocaleDateString()}
            </div>
        </div>
    );
};

export default DeadlineIndicator;
