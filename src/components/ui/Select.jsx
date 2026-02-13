import React from 'react';

const Select = ({ label, options, error, className = '', containerStyle = {}, ...props }) => {
    // Ensure value is never null for controlled select
    const selectValue = props.value === null ? '' : props.value;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`} style={containerStyle}>
            {label && (
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1 select-none">
                    {label}
                </label>
            )}
            <div className="relative group">
                <select
                    {...props}
                    value={selectValue}
                    className={`w-full px-3 py-2.5 pr-8 text-[14px] font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition-all cursor-pointer appearance-none ${error ? '!border-[var(--danger)]' : ''}`}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
            </div>
            {error && <p className="text-[var(--danger)] text-[11px] font-medium mt-1 ml-1">{error}</p>}
        </div>
    );
};

export default Select;
