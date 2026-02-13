import React from 'react';
import { Ghost } from 'lucide-react';

const EmptyState = ({
    icon: Icon = Ghost,
    title = "No items found",
    description = "Get started by creating a new item.",
    action
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                <Icon size={24} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
            {action && (
                <div>
                    {action}
                </div>
            )}
        </div>
    );
};

export default EmptyState;
