import React, { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';

const ServiceForm = ({ service, onSave, onCancel }) => {
    const { t } = useI18n();
    const [formData, setFormData] = useState(service || {
        category: 'Web Development',
        name_de: '',
        name_fr: '',
        description_de: '',
        description_fr: '',
        price: 0,
        unit_type: 'flat',
        active: true,
        default_selected: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Category</label>
                <select name="category" value={formData.category} onChange={handleChange} style={{ width: '100%' }}>
                    <option value="Web Development">Web Development</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Hosting">Hosting</option>
                </select>
            </div>

            <div className="grid grid-2">
                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Name (DE)</label>
                    <input name="name_de" value={formData.name_de} onChange={handleChange} style={{ width: '100%' }} required />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Name (FR)</label>
                    <input name="name_fr" value={formData.name_fr} onChange={handleChange} style={{ width: '100%' }} required />
                </div>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Description (DE)</label>
                <textarea name="description_de" value={formData.description_de} onChange={handleChange} style={{ width: '100%', height: '60px' }} />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Description (FR)</label>
                <textarea name="description_fr" value={formData.description_fr} onChange={handleChange} style={{ width: '100%', height: '60px' }} />
            </div>

            <div className="grid grid-2">
                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Price (€)</label>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} style={{ width: '100%' }} required />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Unit</label>
                    <select name="unit_type" value={formData.unit_type} onChange={handleChange} style={{ width: '100%' }}>
                        <option value="flat">Flat Fee</option>
                        <option value="hourly">Hourly</option>
                        <option value="yearly">Yearly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" name="active" checked={formData.active} onChange={handleChange} />
                    <span>Active</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" name="default_selected" checked={formData.default_selected} onChange={handleChange} />
                    <span>Default Selected</span>
                </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={onCancel} className="btn-secondary" style={{ background: '#e2e8f0', padding: '0.6rem 1.25rem' }}>
                    {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                    {t('common.save')}
                </button>
            </div>
        </form>
    );
};

export default ServiceForm;
