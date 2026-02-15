import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { dataService } from '../../data/dataService';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { Plus, X, Check } from 'lucide-react';

const ServiceForm = ({ initialData, onSave, onCancel }) => {
    const { t } = useI18n();
    const [settings, setSettings] = useState(null);
    const [formData, setFormData] = useState({
        category: '',
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

    useEffect(() => {
        dataService.getSettings().then(data => {
            setSettings(data);
            if (!initialData && data) {
                const categories = data.work_categories ? JSON.parse(data.work_categories) : ['Web Development'];
                setFormData(prev => ({ ...prev, category: categories[0] }));
            }
        });
    }, [initialData]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                name_de: initialData.name_de || '',
                name_fr: initialData.name_fr || '',
                description_de: initialData.description_de || '',
                description_fr: initialData.description_fr || '',
                category: initialData.category || 'Web Development',
                unit_type: initialData.unit_type || 'flat',
                variants: initialData.variants || []
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value)
            };
            if (name === 'unit_type' && value === 'hourly' && newData.price === 0 && settings?.default_hourly_rate) {
                newData.price = settings.default_hourly_rate;
            }
            return newData;
        });
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const addVariant = () => {
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
    };

    const removeVariant = (index) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.filter((_, i) => i !== index)
        }));
    };

    const updateVariant = (index, field, value) => {
        setFormData(prev => {
            const newVariants = [...prev.variants];
            if (field === 'is_default' && value === true) {
                // Ensure only one default
                newVariants.forEach(v => v.is_default = false);
            }
            newVariants[index] = { ...newVariants[index], [field]: value };
            return { ...prev, variants: newVariants };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const categories = settings?.work_categories ? JSON.parse(settings.work_categories) : ['Web Development', 'Design', 'Marketing', 'Hosting'];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <Select
                    label="Category"
                    name="category"
                    value={formData.category}
                    onChange={(e) => handleSelectChange('category', e.target.value)}
                    options={categories.map(cat => ({ value: cat, label: cat }))}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Name (DE)"
                        name="name_de"
                        value={formData.name_de}
                        onChange={handleChange}
                        required
                    />
                    <Input
                        label="Name (FR)"
                        name="name_fr"
                        value={formData.name_fr}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">
                            Description (DE)
                        </label>
                        <textarea
                            name="description_de"
                            value={formData.description_de}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 text-[14px] font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition-all min-h-[80px]"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">
                            Description (FR)
                        </label>
                        <textarea
                            name="description_fr"
                            value={formData.description_fr}
                            onChange={handleChange}
                            className="w-full px-3 py-2.5 text-[14px] font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition-all min-h-[80px]"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <Input
                        label="Price (€)"
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        required
                    />
                    <Select
                        label="Unit"
                        name="unit_type"
                        value={formData.unit_type}
                        onChange={(e) => handleSelectChange('unit_type', e.target.value)}
                        options={[
                            { value: 'flat', label: 'Flat Fee' },
                            { value: 'hourly', label: 'Hourly' }
                        ]}
                    />
                    <Select
                        label="Billing Cycle"
                        name="billing_cycle"
                        value={formData.billing_cycle || 'one_time'}
                        onChange={(e) => handleSelectChange('billing_cycle', e.target.value)}
                        options={[
                            { value: 'one_time', label: 'One-time' },
                            { value: 'yearly', label: 'Yearly' }
                        ]}
                    />
                </div>
            </div>

            <div className="pt-6 border-t border-[var(--border-subtle)]">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[14px] font-bold text-[var(--text-main)] uppercase tracking-wider">Service Variants</h3>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={addVariant}
                        className="h-8"
                    >
                        <Plus size={14} className="mr-1" /> Add Variant
                    </Button>
                </div>

                <div className="space-y-4">
                    {formData.variants.map((variant, index) => (
                        <div key={index} className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-app)] border border-[var(--border-subtle)] relative group">
                            <button
                                type="button"
                                onClick={() => removeVariant(index)}
                                className="absolute top-2 right-2 p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
                            >
                                <X size={16} />
                            </button>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <Input
                                    label="Name (Internal)"
                                    value={variant.name}
                                    onChange={e => updateVariant(index, 'name', e.target.value)}
                                />
                                <Input
                                    label="Price (€)"
                                    type="number"
                                    value={variant.price}
                                    onChange={e => updateVariant(index, 'price', parseFloat(e.target.value) || 0)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <Input
                                    label="Name (DE)"
                                    value={variant.name_de}
                                    placeholder="Optional"
                                    onChange={e => updateVariant(index, 'name_de', e.target.value)}
                                />
                                <Select
                                    label="Billing Cycle"
                                    value={variant.billing_cycle || 'one_time'}
                                    onChange={e => updateVariant(index, 'billing_cycle', e.target.value)}
                                    options={[
                                        { value: 'one_time', label: 'One-time' },
                                        { value: 'yearly', label: 'Yearly' },
                                        { value: 'monthly', label: 'Monthly' }
                                    ]}
                                />
                            </div>

                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <div
                                        onClick={() => updateVariant(index, 'is_default', !variant.is_default)}
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${variant.is_default ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border-medium)] bg-white'}`}
                                    >
                                        {variant.is_default && <Check size={14} className="text-white" />}
                                    </div>
                                    <span className="text-[13px] font-bold text-[var(--text-main)]">Default</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <div
                                        onClick={() => updateVariant(index, 'active', !variant.active)}
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${variant.active !== false ? 'bg-[var(--success)] border-[var(--success)]' : 'border-[var(--border-medium)] bg-white'}`}
                                    >
                                        {variant.active !== false && <Check size={14} className="text-white" />}
                                    </div>
                                    <span className="text-[13px] font-bold text-[var(--text-main)]">Active</span>
                                </label>
                            </div>
                        </div>
                    ))}
                    {formData.variants.length === 0 && (
                        <p className="text-[13px] text-[var(--text-muted)] italic text-center py-4 bg-[var(--bg-app)] rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)]">
                            No variants added. Standard price will be used.
                        </p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-8 pt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                        onClick={() => handleSelectChange('active', !formData.active)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${formData.active ? 'bg-[var(--success)] border-[var(--success)]' : 'border-[var(--border-medium)] bg-white'}`}
                    >
                        {formData.active && <Check size={14} className="text-white" />}
                    </div>
                    <span className="text-[13px] font-bold text-[var(--text-main)]">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                        onClick={() => handleSelectChange('default_selected', !formData.default_selected)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${formData.default_selected ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border-medium)] bg-white'}`}
                    >
                        {formData.default_selected && <Check size={14} className="text-white" />}
                    </div>
                    <span className="text-[13px] font-bold text-[var(--text-main)]">Default Selected</span>
                </label>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-subtle)]">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    {t('common.cancel')}
                </Button>
                <Button type="submit" className="px-8">
                    {t('common.save')}
                </Button>
            </div>
        </form>
    );
};

export default ServiceForm;
