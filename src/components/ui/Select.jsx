import React from 'react';

const Select = ({ label, options, error, className = '', ...props }) => {
    return (
        <div className={`form-group ${className}`} style={{ marginBottom: '1.25rem' }}>
            {label && <label className="form-label">{label}</label>}
            <select
                {...props}
                className={error ? 'border-danger' : ''}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && <p className="text-danger" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</p>}
        </div>
    );
};

export default Select;
