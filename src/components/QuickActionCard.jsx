import React from 'react';
import { Zap } from 'lucide-react';
import Button from './ui/Button';

const QuickActionCard = ({
    title = 'Quick Action',
    description,
    buttonText,
    onAction,
    icon: Icon = Zap
}) => {
    return (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-6 flex flex-col gap-4" style={{ background: '#f5f3ff', border: '1px solid #e0e7ff' }}>
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
                <Icon size={16} />
                <span>{title}</span>
            </div>

            <p className="text-secondary text-sm leading-relaxed">
                {description}
            </p>

            <Button
                variant="primary"
                className="w-full shadow-lg shadow-indigo-500/20"
                onClick={onAction}
            >
                {buttonText}
            </Button>
        </div>
    );
};

export default QuickActionCard;
