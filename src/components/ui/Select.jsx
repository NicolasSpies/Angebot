import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

const Select = ({ label, options = [], value, onChange, error, className = '', containerStyle = {}, triggerStyle = {}, placeholder = 'Select option...', ...props }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleScroll = () => { if (isOpen) setIsOpen(false); };
        const handleResize = () => { if (isOpen) setIsOpen(false); };
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                triggerRef.current && !triggerRef.current.contains(event.target) &&
                menuRef.current && !menuRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < options.length) {
                    onChange({ target: { value: options[activeIndex].value, name: props.name } });
                    setIsOpen(false);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
            default:
                break;
        }
    };

    useEffect(() => {
        if (isOpen) {
            const initialIndex = options.findIndex(opt => opt.value === value);
            setActiveIndex(initialIndex >= 0 ? initialIndex : 0);
        }
    }, [isOpen, options, value]);

    return (
        <div className={`flex flex-col gap-1.5 ${className}`} style={containerStyle}>
            {label && (
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1 select-none">
                    {label}
                </label>
            )}
            <div className="relative">
                <div
                    ref={triggerRef}
                    tabIndex={0}
                    onClick={() => setIsOpen(!isOpen)}
                    onKeyDown={handleKeyDown}
                    style={triggerStyle}
                    className={`w-full h-[42px] px-3 flex items-center justify-between text-[14px] font-medium bg-[var(--bg-surface)] border rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] outline-none transition-all cursor-pointer select-none
                        ${isOpen ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10' : 'border-[var(--border-subtle)] hover:border-[var(--border-medium)]'}
                        ${error ? '!border-[var(--danger)] focus:ring-[var(--danger)]/10' : ''}
                        ${props.disabled ? 'opacity-50 cursor-not-allowed bg-[var(--bg-app)]' : ''}
                    `}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        {selectedOption?.color && (
                            <div
                                className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                                style={{ backgroundColor: selectedOption.color }}
                            />
                        )}
                        <span className={`truncate ${selectedOption ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                    </div>
                    <ChevronDown
                        size={16}
                        className={`text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>

                {isOpen && !props.disabled && createPortal(
                    <div
                        ref={menuRef}
                        className="fixed z-[var(--z-popover)] bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1.5 space-y-0.5"
                        style={{
                            top: triggerRef.current ? triggerRef.current.getBoundingClientRect().bottom + 4 : 0,
                            left: triggerRef.current ? triggerRef.current.getBoundingClientRect().left : 0,
                            width: triggerRef.current ? triggerRef.current.getBoundingClientRect().width : 'auto',
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}
                    >
                        {options.map((opt, index) => (
                            <div
                                key={opt.value}
                                onClick={() => {
                                    onChange({ target: { value: opt.value, name: props.name } });
                                    setIsOpen(false);
                                }}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={`px-3 py-2 text-[14px] font-medium rounded-[var(--radius-md)] cursor-pointer transition-colors
                                    ${value === opt.value ? 'bg-[var(--primary)] text-white' : index === activeIndex ? 'bg-[var(--bg-app)] text-[var(--text-main)]' : 'text-[var(--text-main)]'}
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    {opt.color && (
                                        <div
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: opt.color }}
                                        />
                                    )}
                                    <span>{opt.label}</span>
                                </div>
                            </div>
                        ))}
                        {options.length === 0 && (
                            <div className="px-3 py-4 text-[13px] text-[var(--text-muted)] text-center">
                                No options available
                            </div>
                        )}
                    </div>,
                    document.body
                )}
            </div>
            {error && <p className="text-[var(--danger)] text-[11px] font-medium mt-1 ml-1">{error}</p>}
        </div>
    );
};

export default Select;
