import React from 'react';

const Input = ({ label, error, className = '', ...props }) => {
    return (
        <div className={`form-group ${className}`} style={{ marginBottom: '1rem' }}>
            {label && <label className="form-label" style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>{label}</label>}
            <input
                {...props}
                className={error ? 'border-danger' : ''}
                style={{
                    ...props.style
                }}
            />
            {error && <p className="text-danger" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</p>}
        </div>
    );
};

export default Input;
