import React from 'react';
import { Clock } from 'lucide-react';

const DueStatusIndicator = ({ dueDate }) => {
    if (!dueDate) return <span className="text-[var(--text-muted)] font-normal opacity-50">—</span>;

    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let colorClass = 'text-[var(--success-text)]';

    if (diffDays < 0) {
        colorClass = 'text-[var(--danger-text)]';
    } else if (diffDays <= 3) {
        colorClass = 'text-[var(--warning-text)]';
    }

    let label = `${diffDays} days left`;
    if (diffDays === 0) label = "Due today";
    if (diffDays === 1) label = "Tomorrow";
    if (diffDays < 0) label = `${Math.abs(diffDays)} days overdue`;

    return (
        <div className={`flex items-center gap-[var(--space-1)] text-[12px] font-bold whitespace-nowrap ${colorClass}`}>
            {diffDays < 0 && <Clock size={12} />}
            <span>{label}</span>
        </div>
    );
};

export default DueStatusIndicator;
