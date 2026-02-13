import React from 'react';

const ProgressBar = ({ value, max = 100, variant = 'primary', showLabel = false, height = '8px', className = '' }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const getColor = () => {
        switch (variant) {
            case 'success': return 'var(--success)';
            case 'warning': return 'var(--warning)';
            case 'danger': return 'var(--danger)';
            case 'info': return 'var(--info)';
            default: return 'var(--primary)';
        }
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div style={{ flex: 1, background: 'var(--border)', borderRadius: '999px', height, overflow: 'hidden' }}>
                <div
                    style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: getColor(),
                        transition: 'width 0.5s ease-out',
                        borderRadius: '999px'
                    }}
                />
            </div>
            {showLabel && (
                <span className="text-xs text-muted font-bold" style={{ minWidth: '35px', textAlign: 'right' }}>
                    {Math.round(percentage)}%
                </span>
            )}
        </div>
    );
};

export default ProgressBar;
