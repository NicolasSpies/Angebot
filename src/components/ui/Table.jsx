import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const Table = ({ headers, children, className = '', ...props }) => {
    return (
        <div className={`w-full overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] ${className}`} {...props}>
            <table className="w-full border-collapse text-left">
                <thead className="bg-[var(--bg-app)]">
                    <tr>
                        {headers.map((h, i) => {
                            const isObject = typeof h === 'object' && h !== null;
                            const label = isObject ? h.label : h;
                            const isSortable = isObject && h.onClick;
                            const isCurrentSort = isObject && h.sortField === h.currentSort;

                            return (
                                <th
                                    key={i}
                                    onClick={isSortable ? h.onClick : undefined}
                                    className={`px-6 py-4 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider border-b border-[var(--border-subtle)] ${isSortable ? 'cursor-pointer hover:bg-[var(--border-subtle)]/50 transition-colors' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        {label}
                                        {isSortable && isCurrentSort && (
                                            h.sortDir === 'asc' ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />
                                        )}
                                    </div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                    {children}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
