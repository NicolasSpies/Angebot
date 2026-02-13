import React from 'react';

const Card = ({ children, className = '', padding, noBorder = false, ...props }) => {
    return (
        <div
            className={`card ${className}`}
            style={{
                padding: padding || '1.5rem',
                border: noBorder ? 'none' : undefined,
                boxShadow: noBorder ? 'none' : 'var(--shadow-md)',
                borderRadius: 'var(--radius-lg)',
                ...props.style
            }}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
