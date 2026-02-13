import React from 'react';
import { X } from 'lucide-react';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = '600px' }) => {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <div
                className="card"
                style={{
                    width: '100%',
                    maxWidth: maxWidth,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '90vh',
                    animation: 'modalSlideIn 0.3s ease-out'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{title}</h3>
                    <Button variant="icon" onClick={onClose} style={{ padding: '4px' }}>
                        <X size={20} />
                    </Button>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div style={{
                        padding: '1.25rem 1.5rem',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '1rem',
                        background: 'var(--bg-main)',
                        borderBottomLeftRadius: 'var(--radius-lg)',
                        borderBottomRightRadius: 'var(--radius-lg)'
                    }}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
