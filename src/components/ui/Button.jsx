import React from 'react';

const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
    let cls = 'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed ';

    if (variant === 'primary') cls += 'btn-primary ';
    else if (variant === 'secondary') cls += 'btn-secondary ';
    else if (variant === 'danger') cls += 'bg-danger text-white hover:opacity-90 ';
    else if (variant === 'ghost') cls += 'bg-transparent text-secondary hover:bg-secondary-light ';
    else if (variant === 'icon') cls += 'p-1.5 rounded-md hover:bg-secondary-light flex items-center justify-center text-secondary ';

    if (size === 'sm' && variant !== 'icon') cls += 'text-xs px-2.5 py-1 ';
    else if (size === 'lg' && variant !== 'icon') cls += 'text-base px-5 py-2.5 ';
    else if (size === 'md' && variant !== 'icon') cls += 'text-sm px-3.5 py-1.5 ';

    return (
        <button
            className={`${cls} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
