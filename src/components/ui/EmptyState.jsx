import React from 'react';
import { Box } from 'lucide-react';

const EmptyState = ({ icon: Icon = Box, title, description, action }) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-app)] flex items-center justify-center mb-6">
                <Icon size={28} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-[var(--text-main)] font-bold text-[16px] mb-2">{title}</h3>
            <p className="text-[var(--text-secondary)] text-[14px] max-w-sm mb-8 leading-relaxed">{description || 'No items found.'}</p>
            {action && (
                <div>
                    {action}
                </div>
            )}
        </div>
    );
};

export default EmptyState;
