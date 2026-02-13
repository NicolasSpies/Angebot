import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { useI18n } from '../../i18n/I18nContext';

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isDestructive = false }) => {
    const { t } = useI18n();

    const footer = (
        <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="font-bold text-[var(--text-muted)]">
                {cancelText || t('common.cancel')}
            </Button>
            <Button
                variant="primary"
                className={`font-bold px-6 ${isDestructive ? 'bg-[var(--danger)] hover:bg-[var(--danger)]/90 border-none' : ''}`}
                onClick={() => {
                    onConfirm();
                    onClose();
                }}
            >
                {confirmText || t('common.confirm')}
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title || t('common.confirm')}
            footer={footer}
            maxWidth="450px"
        >
            <p className="text-[14px] text-[var(--text-secondary)] font-medium leading-relaxed">
                {message || t('common.areYouSure')}
            </p>
        </Modal>
    );
};

export default ConfirmationDialog;
