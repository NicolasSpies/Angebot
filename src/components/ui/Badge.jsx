import React from 'react';
import { getStatusColor } from '../../utils/statusColors';

const Badge = ({ children, variant = 'neutral', className = '', showDot = true, ...props }) => {
    const baseCls = 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap transition-colors';

    // If status is provided, derive colors from centralized map
    if (props.status) {
        const statusConfig = getStatusColor(props.status);
        return (
            <span
                className={`${baseCls} ${className}`}
                style={{
                    backgroundColor: statusConfig.bg,
                    color: statusConfig.text,
                    borderColor: statusConfig.bg
                }}
                {...props}
            >
                {showDot && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusConfig.dot }} />}
                {children || (statusConfig.label || props.status).toUpperCase()}
            </span>
        );
    }

    const variants = {
        primary: 'bg-[var(--primary)] text-white border-transparent',
        success: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/20',
        warning: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning)]/20',
        danger: 'bg-[var(--danger-bg)] text-[var(--danger)] border-[var(--danger)]/20',
        neutral: 'bg-[var(--bg-app)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
    };

    return (
        <span
            className={`${baseCls} ${variants[variant] || variants.neutral} ${className}`}
            {...props}
        >
            {showDot && <span className={`w-1.5 h-1.5 rounded-full ${variant === 'primary' ? 'bg-white' : 'bg-current'}`} />}
            {children}
        </span>
    );
};

export default Badge;
