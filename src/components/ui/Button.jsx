import React from 'react';

const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
    let baseCls = 'inline-flex items-center justify-center font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 active:scale-[0.98] ';

    const variants = {
        primary: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] shadow-[var(--shadow-sm)] border border-transparent ',
        secondary: 'bg-white text-[var(--text-main)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-app)] shadow-[var(--shadow-sm)] ',
        danger: 'bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90 shadow-[var(--shadow-sm)] border border-transparent ',
        ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)] border border-transparent ',
        icon: 'p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)] '
    };

    const sizes = {
        xs: 'text-[12px] h-7 px-2.5 ',
        sm: 'text-[13px] h-9 px-3 ',
        md: 'text-[14px] h-10 px-4 ',
        lg: 'text-[15px] h-12 px-6 '
    };

    const cls = baseCls + (variants[variant] || variants.primary) + (variant !== 'icon' ? (sizes[size] || sizes.md) : '') + className;

    return (
        <button className={cls} {...props}>
            {children}
        </button>
    );
};

export { Button };
export default Button;
