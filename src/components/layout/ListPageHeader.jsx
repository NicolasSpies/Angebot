import React from 'react';

const ListPageHeader = ({ title, description, action }) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-[var(--space-4)] mb-[var(--space-8)] fade-in">
            <div>
                <h1 className="text-[28px] font-bold text-[var(--text-main)] tracking-tight leading-tight mb-[var(--space-1)]">
                    {title}
                </h1>
                {description && (
                    <p className="text-[var(--text-secondary)] font-medium text-[15px]">
                        {description}
                    </p>
                )}
            </div>
            {action && (
                <div className="flex-shrink-0">
                    {action}
                </div>
            )}
        </div>
    );
};

export default ListPageHeader;
