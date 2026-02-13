import React from 'react';

const Input = ({ label, error, className = '', containerStyle = {}, ...props }) => {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`} style={containerStyle}>
            {label && (
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1 select-none">
                    {label}
                </label>
            )}
            <input
                {...props}
                className={`w-full px-3 py-2.5 text-[14px] font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition-all placeholder:text-[var(--text-muted)] hover:border-[var(--border-medium)] ${error ? '!border-[var(--danger)] !focus:ring-[var(--danger)]/10' : ''}`}
            />
            {error && <p className="text-[var(--danger)] text-[11px] font-medium mt-1 ml-1">{error}</p>}
        </div>
    );
};

export default Input;
