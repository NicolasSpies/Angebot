import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = '600px' }) => {
    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 flex items-center justify-center p-4 backdrop-blur-sm bg-[var(--text-main)]/20 z-[var(--z-modal)]"
            onClick={onClose}
        >
            <div
                className="bg-[var(--bg-surface)] rounded-[var(--radius-xl)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-[var(--border-subtle)]"
                style={{
                    width: '100%',
                    maxWidth: maxWidth,
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-white">
                    <div>
                        <h3 className="text-[20px] font-bold text-[var(--text-main)] tracking-tight">{title}</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-8 h-8 p-0 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] transition-all">
                        <X size={20} />
                    </Button>
                </div>

                {/* Content */}
                <div className="px-8 py-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-8 py-5 border-t border-[var(--border-subtle)] flex justify-end gap-3 bg-[var(--bg-app)]/30">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
