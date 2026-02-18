import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { useI18n } from '../../i18n/I18nContext';

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isDestructive = false }) => {

    const footer = (
        <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="font-bold text-[var(--text-muted)]">
                {cancelText || 'Cancel'}
            </Button>
            <Button
                variant="primary"
                className={`font-bold px-6 ${isDestructive ? 'bg-[var(--danger)] hover:bg-[var(--danger)]/90 border-none' : ''}`}
                onClick={() => {
                    onConfirm();
                    onClose();
                }}
            >
                {confirmText || 'Confirm'}
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title || 'Confirm Action'}
            footer={footer}
            maxWidth="450px"
        >
            <p className="text-[14px] text-[var(--text-secondary)] font-medium leading-relaxed">
                {message || 'Are you sure you want to proceed?'}
            </p>
        </Modal>
    );
};

export default ConfirmationDialog;
