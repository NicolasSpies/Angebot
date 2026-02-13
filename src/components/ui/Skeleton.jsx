import React from 'react';

const Skeleton = ({ className = '', style = {}, ...props }) => {
    return (
        <div
            className={`animate-pulse bg-secondary-light rounded ${className}`}
            style={{
                ...style,
                backgroundColor: 'var(--secondary-light)', // Fallback if class not found
                opacity: 0.7
            }}
            {...props}
        />
    );
};

export default Skeleton;
