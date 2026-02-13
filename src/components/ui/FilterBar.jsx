import React from 'react';
import { Search, X } from 'lucide-react';
import Button from './Button';

const FilterBar = ({
    onSearch,
    searchValue,
    searchPlaceholder = "Search...",
    filters = [],
    onFilterChange,
    className = ""
}) => {
    const primaryFilter = filters[0];

    return (
        <div className={`mb-[var(--space-8)] flex flex-wrap items-center justify-between gap-[var(--space-4)] ${className}`}>
            <div className="flex items-center gap-[var(--space-2)]">
                {primaryFilter && primaryFilter.options.map((option) => {
                    const isActive = primaryFilter.value === option.value;
                    return (
                        <button
                            key={option.value}
                            onClick={() => onFilterChange(primaryFilter.key, option.value)}
                            className={`px-3 py-1.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-all border ${isActive
                                ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-[var(--shadow-sm)]'
                                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:text-[var(--text-main)]'
                                }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>

            <div className="relative w-full max-w-[320px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchValue}
                    onChange={(e) => onSearch(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 bg-white border border-[var(--border-subtle)] hover:border-[var(--border-medium)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] text-[14px] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all placeholder:text-[var(--text-muted)]"
                />
                {searchValue && (
                    <button
                        onClick={() => onSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default FilterBar;
