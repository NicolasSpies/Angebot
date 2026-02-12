import React, { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import ConfirmationDialog from '../ui/ConfirmationDialog';

const CustomerForm = ({ customer, onSave, onDelete, onCancel }) => {
    const { t } = useI18n();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState(customer || {
        company_name: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: '',
        language: 'de',
        country: 'BE',
        vat_number: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Company Information */}
            <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Company Information</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>{t('customer.company_name')}</label>
                        <input
                            style={{ width: '100%' }}
                            name="company_name"
                            value={formData.company_name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>{t('customer.vat_number')}</label>
                        <input
                            style={{ width: '100%' }}
                            name="vat_number"
                            value={formData.vat_number}
                            onChange={handleChange}
                        />
                    </div>
                </div>
            </div>

            {/* Contact Person */}
            <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Contact Person</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="grid grid-2">
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>First Name</label>
                            <input
                                style={{ width: '100%' }}
                                name="first_name"
                                value={formData.first_name || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Last Name</label>
                            <input
                                style={{ width: '100%' }}
                                name="last_name"
                                value={formData.last_name || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="grid grid-2">
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Email</label>
                            <input
                                type="email"
                                style={{ width: '100%' }}
                                name="email"
                                value={formData.email || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Phone</label>
                            <input
                                type="tel"
                                style={{ width: '100%' }}
                                name="phone"
                                value={formData.phone || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Address */}
            <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Address</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Street Address</label>
                        <input
                            style={{ width: '100%' }}
                            name="address"
                            value={formData.address || ''}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="grid grid-2">
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>City</label>
                            <input
                                style={{ width: '100%' }}
                                name="city"
                                value={formData.city || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Postal Code</label>
                            <input
                                style={{ width: '100%' }}
                                name="postal_code"
                                value={formData.postal_code || ''}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                    <div className="grid grid-2">
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>{t('customer.country')}</label>
                            <select name="country" value={formData.country} onChange={handleChange} style={{ width: '100%' }}>
                                <option value="BE">Belgium</option>
                                <option value="DE">Germany</option>
                                <option value="FR">France</option>
                                <option value="LU">Luxembourg</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>{t('offer.language')}</label>
                            <select name="language" value={formData.language} onChange={handleChange} style={{ width: '100%' }}>
                                <option value="de">Deutsch</option>
                                <option value="fr">Français</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'space-between' }}>
                {customer && onDelete && (
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="btn-danger"
                        style={{
                            background: 'transparent',
                            color: 'var(--danger)',
                            border: '1px solid var(--danger)',
                            padding: '0.6rem 1.25rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer'
                        }}
                    >
                        {t('common.delete')}
                    </button>
                )}
                <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
                    <button type="button" onClick={onCancel} className="btn-secondary">
                        {t('common.cancel')}
                    </button>
                    <button type="submit" className="btn-primary">
                        {t('common.save')}
                    </button>
                </div>
            </div>

            <ConfirmationDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => {
                    if (customer && customer.id) {
                        onDelete(customer.id);
                        onCancel(); // Close the modal after delete
                    }
                }}
                title={t('common.delete') + ' Customer'}
                message="Are you sure you want to delete this customer? All associated offers will also be deleted. This action cannot be undone."
                confirmText={t('common.delete')}
                isDestructive={true}
            />
        </form>
    );
};

export default CustomerForm;
