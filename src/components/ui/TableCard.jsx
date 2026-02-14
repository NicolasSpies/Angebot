import React from 'react';
import Card from './Card';

const TableCard = ({ title, action, children, className = '' }) => {
    return (
        <Card padding="0" className={`border-[var(--border)] shadow-sm overflow-hidden ${className}`}>
            <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] flex justify-between items-center">
                <h3 className="text-[13px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
                    {title}
                </h3>
                {action && (
                    <div className="flex items-center gap-2">
                        {action}
                    </div>
                )}
            </div>
            <div className="p-0">
                {children}
            </div>
        </Card>
    );
};

export default TableCard;
