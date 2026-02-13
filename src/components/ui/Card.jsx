import React from 'react';

const Card = ({ children, className = '', padding = 'var(--space-6)', noBorder = false, ...props }) => {
    return (
        <div
            className={`bg-[var(--bg-surface)] rounded-[var(--radius-xl)] ${!noBorder ? 'border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]' : ''} ${className}`}
            style={{
                padding,
                ...props.style
            }}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
