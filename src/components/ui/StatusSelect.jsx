import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import StatusPill from './StatusPill';
import { ChevronDown } from 'lucide-react';
import { getStatusColor } from '../../utils/statusColors';

const StatusSelect = ({ value, onChange, options, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    // Close on scroll/resize/click-outside (Copied from DropdownMenu pattern)
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

    const toggleMenu = () => setIsOpen(!isOpen);

    const handleSelect = (newValue) => {
        onChange(newValue);
        setIsOpen(false);
    };

    // Get current config for styling trigger hover
    const currentConfig = getStatusColor(value);

    return (
        <>
            <div
                ref={triggerRef}
                onClick={toggleMenu}
                className={`inline-flex items-center cursor-pointer group hover:opacity-80 transition-opacity ${className}`}
            >
                <StatusPill status={value} />
                <ChevronDown size={14} className="ml-1 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
            </div>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[var(--z-popover)] bg-[var(--bg-surface)] border border-[var(--border-medium)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] min-w-[160px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1.5 space-y-1"
                    style={{
                        top: triggerRef.current ? triggerRef.current.getBoundingClientRect().bottom + 8 : 0,
                        left: triggerRef.current ? triggerRef.current.getBoundingClientRect().left : 0
                    }}
                >
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelect(opt.value);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] transition-colors text-left ${value === opt.value ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-app)]'}`}
                        >
                            <StatusPill status={opt.value} label={opt.label} />
                            {value === opt.value && (
                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-main)] ml-2" />
                            )}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
};

export default StatusSelect;
