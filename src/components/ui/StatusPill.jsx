import React from 'react';

import { getStatusColor } from '../../utils/statusColors';

const StatusPill = ({ status, label }) => {
    const config = getStatusColor(status);
    const displayText = label || config.label;

    return (
        <div className="flex flex-col items-start gap-1">
            <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap gap-1.5 border"
                style={{
                    backgroundColor: config.bg,
                    color: config.text,
                    borderColor: config.bg
                }}
            >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.dot }} />
                {displayText.toUpperCase()}
            </span>
            {config.waitingOn && (
                <span className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">
                    Wait on: {config.waitingOn}
                </span>
            )}
        </div>
    );
};

export default StatusPill;
