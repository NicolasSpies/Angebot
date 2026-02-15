import React, { useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { dataService } from '../../data/dataService';
import Select from '../ui/Select';

const ServiceForm = ({ initialData, onSave, onCancel }) => {
    const { t } = useI18n();
    const [settings, setSettings] = useState(null);
    const [formData, setFormData] = useState(initialData || {
        category: '', // Will be set after settings load if empty
        name_de: '',
        name_fr: '',
        description_de: '',
        description_fr: '',
        price: 0,
        unit_type: 'flat',
        billing_cycle: 'one_time',
        active: true,
        default_selected: false,
        variants: []
    });

    React.useEffect(() => {
        dataService.getSettings().then(data => {
            setSettings(data);
            if (!initialData && data) {
                const categories = data.work_categories ? JSON.parse(data.work_categories) : ['Web Development'];
                setFormData(prev => ({ ...prev, category: categories[0] }));
            }
        });
    }, [initialData]);

    React.useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                // Ensure no null values for controlled inputs
                name_de: initialData.name_de || '',
                name_fr: initialData.name_fr || '',
                description_de: initialData.description_de || '',
                description_fr: initialData.description_fr || '',
                category: initialData.category || 'Web Development',
                unit_type: initialData.unit_type || 'flat',
                variants: initialData.variants || []
            });
        } else {
            // Reset form when adding new, keeping category from settings if available
            setFormData(prev => ({
                category: prev.category || 'Web Development',
                name_de: '',
                name_fr: '',
                description_de: '',
                description_fr: '',
                price: 0,
                unit_type: 'flat',
                billing_cycle: 'one_time',
                active: true,
                default_selected: false,
                variants: []
            }));
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
            };

            // Auto-set price if switching to hourly and price is 0
            if (name === 'unit_type' && value === 'hourly' && newData.price === 0 && settings?.default_hourly_rate) {
                newData.price = settings.default_hourly_rate;
            }

            return newData;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const categories = settings?.work_categories ? JSON.parse(settings.work_categories) : ['Web Development', 'Design', 'Marketing', 'Hosting'];

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Select
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                options={categories.map(cat => ({ value: cat, label: cat }))}
            />

            <div className="grid grid-2">
                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Name (DE)</label>
                    <input name="name_de" value={formData.name_de || ''} onChange={handleChange} style={{ width: '100%' }} required />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Name (FR)</label>
                    <input name="name_fr" value={formData.name_fr || ''} onChange={handleChange} style={{ width: '100%' }} required />
                </div>
            </div>

            <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Description (DE)</label>
                <textarea name="description_de" value={formData.description_de || ''} onChange={handleChange} style={{ width: '100%', height: '60px' }} />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Description (FR)</label>
                <textarea name="description_fr" value={formData.description_fr || ''} onChange={handleChange} style={{ width: '100%', height: '60px' }} />
            </div>

            <div className="grid grid-3">
                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Price (€)</label>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} style={{ width: '100%' }} required />
                </div>
                <Select
                    label="Unit"
                    name="unit_type"
                    value={formData.unit_type}
                    onChange={handleChange}
                    options={[
                        { value: 'flat', label: 'Flat Fee' },
                        { value: 'hourly', label: 'Hourly' }
                    ]}
                />
                <Select
                    label="Billing Cycle"
                    name="billing_cycle"
                    value={formData.billing_cycle || 'one_time'}
                    onChange={handleChange}
                    options={[
                        { value: 'one_time', label: 'One-time' },
                        { value: 'yearly', label: 'Yearly' }
                    ]}
                />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Service Variants</h3>
                    <button
                        type="button"
                        className="btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                        onClick={() => {
                            setFormData(prev => ({
                                ...prev,
                                variants: [
                                    ...(prev.variants || []),
                                    {
                                        name: '',
                                        name_de: '',
                                        name_fr: '',
                                        description: '',
                                        price: 0,
                                        billing_cycle: 'one_time',
                                        is_default: false,
                                        active: true
                                    }
                                ]
                            }));
                        }}
                    >
                        + Add Variant
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(formData.variants || []).map((variant, index) => (
                        <div key={index} style={{
                            background: '#f8fafc',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem',
                            position: 'relative'
                        }}>
                            <button
                                type="button"
                                style={{
                                    position: 'absolute',
                                    top: '0.5rem',
                                    right: '0.5rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ef4444',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem'
                                }}
                                onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        variants: prev.variants.filter((_, i) => i !== index)
                                    }));
                                }}
                            >
                                ×
                            </button>

                            <div className="grid grid-2" style={{ marginBottom: '0.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Name (Internal)</label>
                                    <input
                                        value={variant.name || ''}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setFormData(prev => {
                                                const newVariants = [...prev.variants];
                                                newVariants[index] = { ...newVariants[index], name: val };
                                                return { ...prev, variants: newVariants };
                                            });
                                        }}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Price (€)</label>
                                    <input
                                        type="number"
                                        value={variant.price || 0}
                                        onChange={e => {
                                            const val = parseFloat(e.target.value) || 0;
                                            setFormData(prev => {
                                                const newVariants = [...prev.variants];
                                                newVariants[index] = { ...newVariants[index], price: val };
                                                return { ...prev, variants: newVariants };
                                            });
                                        }}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-2" style={{ marginBottom: '0.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Name (DE)</label>
                                    <input
                                        value={variant.name_de || ''}
                                        placeholder="Optional (defaults to Name)"
                                        onChange={e => {
                                            const val = e.target.value;
                                            setFormData(prev => {
                                                const newVariants = [...prev.variants];
                                                newVariants[index] = { ...newVariants[index], name_de: val };
                                                return { ...prev, variants: newVariants };
                                            });
                                        }}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <Select
                                    label="Billing Cycle"
                                    value={variant.billing_cycle || 'one_time'}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setFormData(prev => {
                                            const newVariants = [...prev.variants];
                                            newVariants[index] = { ...newVariants[index], billing_cycle: val };
                                            return { ...prev, variants: newVariants };
                                        });
                                    }}
                                    options={[
                                        { value: 'one_time', label: 'One-time' },
                                        { value: 'yearly', label: 'Yearly' },
                                        { value: 'monthly', label: 'Monthly' }
                                    ]}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!variant.is_default}
                                        onChange={e => {
                                            const checked = e.target.checked;
                                            setFormData(prev => {
                                                const newVariants = prev.variants.map((v, i) => ({
                                                    ...v,
                                                    is_default: i === index ? checked : (checked ? false : v.is_default) // Only one default
                                                }));
                                                return { ...prev, variants: newVariants };
                                            });
                                        }}
                                    />
                                    Default
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={variant.active !== false}
                                        onChange={e => {
                                            const checked = e.target.checked;
                                            setFormData(prev => {
                                                const newVariants = [...prev.variants];
                                                newVariants[index] = { ...newVariants[index], active: checked };
                                                return { ...prev, variants: newVariants };
                                            });
                                        }}
                                    />
                                    Active
                                </label>
                            </div>
                        </div>
                    ))}
                    {(formData.variants || []).length === 0 && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No variants added. Standard price will be used.</p>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
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
                <button type="button" onClick={onCancel} className="btn-secondary">
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
