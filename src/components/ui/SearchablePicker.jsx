import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check } from 'lucide-react';

const SearchablePicker = ({
    options = [],
    value,
    onChange,
    onClose,
    placeholder = "Search...",
    trigger,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const inputRef = useRef(null);

    const filteredOptions = options.filter(opt =>
        (opt.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (opt.subLabel || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
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
        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredOptions[activeIndex]) {
                    onChange(filteredOptions[activeIndex]);
                    setIsOpen(false);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
            default:
                break;
        }
    };

    return (
        <div className={`relative inline-block ${className}`} ref={triggerRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[var(--z-popover)] bg-white border border-[var(--border-medium)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
                    style={{
                        top: triggerRef.current ? triggerRef.current.getBoundingClientRect().bottom + 4 : 0,
                        left: triggerRef.current ? Math.min(triggerRef.current.getBoundingClientRect().left, window.innerWidth - 320) : 0,
                        width: '300px',
                        maxHeight: '400px',
                    }}
                >
                    <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-app)]">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-9 pr-3 py-2 bg-white border border-[var(--border-subtle)] rounded-md text-[13px] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                                placeholder={placeholder}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setActiveIndex(0);
                                }}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, index) => {
                                const isSelected = value === opt.value;
                                const isActive = index === activeIndex;

                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => {
                                            onChange(opt);
                                            setIsOpen(false);
                                        }}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between
                                            ${isActive ? 'bg-[var(--bg-app)]' : ''}
                                            ${isSelected ? '!bg-[var(--primary-light)]/20' : ''}
                                        `}
                                    >
                                        <div className="min-w-0 pr-2">
                                            <div className={`text-[13.5px] font-bold truncate ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-main)]'}`}>
                                                {opt.label}
                                            </div>
                                            {opt.subLabel && (
                                                <div className="text-[11px] text-[var(--text-muted)] font-medium truncate mt-0.5">
                                                    {opt.subLabel}
                                                </div>
                                            )}
                                        </div>
                                        {isSelected && <Check size={14} className="text-[var(--primary)] shrink-0" />}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-8 text-center text-[var(--text-muted)] text-[12px] font-medium italic">
                                No matches found
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SearchablePicker;
