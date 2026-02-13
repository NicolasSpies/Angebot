import React from 'react';
import { Search } from 'lucide-react';

const ListPageToolbar = ({ searchProps, filters, actions }) => {
    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-[var(--space-8)] gap-[var(--space-4)] fade-in">
            <div className="flex items-center gap-[var(--space-2)] flex-wrap">
                {/* Filters Area (left) */}
                {filters && filters}
            </div>

            <div className="flex items-center gap-[var(--space-4)]">
                {/* Search Area (right) */}
                {searchProps && (
                    <div className="relative w-full md:w-[280px] group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--primary)] transition-colors pointer-events-none flex items-center">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder={searchProps.placeholder || "Search..."}
                            value={searchProps.value}
                            onChange={(e) => searchProps.onChange(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 bg-white border border-[var(--border-subtle)] hover:border-[var(--border-medium)] focus:border-[var(--primary)] rounded-[var(--radius-md)] text-[14px] font-medium text-[var(--text-main)] shadow-[var(--shadow-sm)] focus:ring-2 focus:ring-[var(--primary)]/10 focus:outline-none transition-all placeholder:text-[var(--text-muted)]"
                        />
                    </div>
                )}

                {/* Actions Area */}
                {actions && (
                    <div className="flex items-center gap-[var(--space-2)]">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListPageToolbar;
