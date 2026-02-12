import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

const DropdownMenu = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAction = (action) => {
        setIsOpen(false);
        action.onClick();
    };

    return (
        <div className="dropdown-container" ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    transition: 'background 0.2s'
                }}
                className="dropdown-trigger"
            >
                <MoreVertical size={20} />
            </button>

            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        zIndex: 50,
                        minWidth: '160px',
                        overflow: 'hidden',
                        marginTop: '0.25rem'
                    }}
                >
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            onClick={() => handleAction(action)}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.75rem 1rem',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: index < actions.length - 1 ? '1px solid #f1f5f9' : 'none',
                                cursor: 'pointer',
                                color: action.isDestructive ? 'var(--destructive)' : 'var(--text)',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                transition: 'background 0.1s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DropdownMenu;
