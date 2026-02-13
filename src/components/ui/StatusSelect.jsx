import React from 'react';
import Select from './Select';
import Badge from './Badge';

const StatusSelect = ({ value, onChange, options, variants = {}, ...props }) => {
    // We render a Select, but we might want to render a custom UI eventually.
    // For now, let's stick to the Select but ensure we pass down the correct styling/logic.
    // Actually, to make it "inline" and look like a badge until clicked, or just a nice colored select?
    // The requirement says "Inline editing, color-coded options".
    // A simple implementation is a styled Select that reflects the current status color.

    const currentVariant = variants[value] || 'neutral';

    // Custom styles to make the select look more like a badge/status indicator
    const customStyle = {
        padding: '0.25rem 0.5rem',
        height: 'auto',
        minHeight: '28px',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        border: '1px solid transparent',
        background: `var(--${currentVariant}-bg, #f1f5f9)`, // Fallback to slate-100
        color: `var(--${currentVariant}-text, #475569)`, // Fallback to slate-600
        cursor: 'pointer',
        ...props.style
    };

    return (
        <Select
            value={value}
            onChange={onChange}
            options={options}
            style={customStyle}
            containerStyle={{ marginBottom: 0 }}
            {...props}
        />
    );
};

export default StatusSelect;
