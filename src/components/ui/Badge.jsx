import React from 'react';

const Badge = ({ children, variant = 'neutral', className = '', showDot = true, ...props }) => {
    const variantClass = `badge-${variant}`;

    return (
        <span
            className={`badge ${variantClass} ${className} flex items-center gap-2`}
            {...props}
        >
            {showDot && <span className="badge-dot" />}
            {children}
        </span>
    );
};

export default Badge;
