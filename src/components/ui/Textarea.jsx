import React from 'react';

const Textarea = ({ label, id, className = '', containerStyle = {}, ...props }) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div style={{ marginBottom: '1.25rem', ...containerStyle }}>
            {label && <label htmlFor={textareaId} className="form-label">{label}</label>}
            <textarea
                id={textareaId}
                className={className}
                style={{ width: '100%', minHeight: '100px', ...props.style }}
                {...props}
            />
        </div>
    );
};

export default Textarea;
