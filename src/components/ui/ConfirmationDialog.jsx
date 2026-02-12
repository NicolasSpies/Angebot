import React from 'react';
import Modal from './Modal';
import { useI18n } from '../../i18n/I18nContext';

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isDestructive = false }) => {
    const { t } = useI18n();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title || t('common.confirm')}>
            <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    {message || t('common.areYouSure')}
                </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                    onClick={onClose}
                    className="btn-secondary"
                >
                    {cancelText || t('common.cancel')}
                </button>
                <button
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                    className="btn-primary"
                    style={{
                        background: isDestructive ? 'var(--danger)' : 'var(--primary)',
                        borderColor: isDestructive ? 'var(--danger)' : 'var(--primary)',
                        color: 'white'
                    }}
                >
                    {confirmText || t('common.confirm')}
                </button>
            </div>
        </Modal>
    );
};

export default ConfirmationDialog;
