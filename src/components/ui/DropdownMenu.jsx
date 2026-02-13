import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

const DropdownMenu = ({ actions, trigger }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            if (isOpen) setIsOpen(false); // Close on scroll for simplicity
        };
        const handleResize = () => {
            if (isOpen) setIsOpen(false);
        };

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

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const toggleMenu = () => {
        if (!isOpen) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Default to opening bottom-left relative to trigger
            setPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX - 120 + rect.width // aligning right edge roughly
            });
        }
        setIsOpen(!isOpen);
    };

    const handleAction = (action) => {
        if (!action.disabled) {
            setIsOpen(false);
            if (action.onClick) action.onClick();
        }
    };

    return (
        <>
            <div
                ref={triggerRef}
                onClick={toggleMenu}
                className="inline-block cursor-pointer relative"
            >
                {trigger ? (
                    trigger
                ) : (
                    <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-app)] text-[var(--text-muted)] transition-colors">
                        <MoreVertical size={18} />
                    </button>
                )}
            </div>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-[var(--z-popover)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] min-w-[180px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        top: triggerRef.current ? triggerRef.current.getBoundingClientRect().bottom + 8 : 0,
                        left: triggerRef.current ? Math.min(triggerRef.current.getBoundingClientRect().right - 180, window.innerWidth - 190) : 0
                    }}
                >
                    <div className="py-1">
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                disabled={action.disabled}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAction(action);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors flex items-center gap-2
                                    ${action.isDestructive ? 'text-[var(--danger)] hover:bg-[var(--danger-bg)]' : 'text-[var(--text-main)] hover:bg-[var(--bg-app)]'}
                                    ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                `}
                                title={action.title}
                            >
                                {action.icon && <action.icon size={14} className={action.isDestructive ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'} />}
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default DropdownMenu;
