import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { dataService } from '../../data/dataService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Search, Package, Check } from 'lucide-react';
import Select from '../ui/Select';

const BundleForm = ({ initialData, onSave, onCancel }) => {
    const { t, locale } = useI18n();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        discount_type: 'percent',
        discount_value: 0,
        items: []
    });
    const [services, setServices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadData = async () => {
            const data = await dataService.getServices();
            setServices(data || []);

            if (initialData) {
                const normalizedItems = (initialData.items || []).map(item => {
                    if (typeof item === 'object') return item;
                    return { service_id: item, variant_name: null, discount_percent: 0 };
                });
                setFormData({
                    ...initialData,
                    discount_type: initialData.discount_type || 'percent',
                    discount_value: initialData.discount_value || 0,
                    items: normalizedItems
                });
            }
        };
        loadData();
    }, [initialData]);

    const handleServiceToggle = (serviceId) => {
        setFormData(prev => {
            const isSelected = prev.items.some(item => item.service_id === serviceId);
            if (isSelected) {
                return { ...prev, items: prev.items.filter(item => item.service_id !== serviceId) };
            } else {
                return { ...prev, items: [...prev.items, { service_id: serviceId, variant_name: null, discount_percent: 0 }] };
            }
        });
    };

    const handleVariantChange = (serviceId, variantName) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.service_id === serviceId ? { ...item, variant_name: variantName } : item
            )
        }));
    };

    const handleItemDiscountChange = (serviceId, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map(item =>
                item.service_id === serviceId ? { ...item, discount_percent: parseFloat(value) || 0 } : item
            )
        }));
    };

    const calculateTotals = () => {
        let originalTotal = 0;
        let itemsTotalAfterItemDiscounts = 0;

        formData.items.forEach(item => {
            const service = services.find(s => s.id === item.service_id);
            if (service) {
                const variant = item.variant_name ? service.variants?.find(v => v.name === item.variant_name) : null;
                const basePrice = variant ? variant.price : service.price;
                originalTotal += basePrice;
                itemsTotalAfterItemDiscounts += basePrice * (1 - (item.discount_percent || 0) / 100);
            }
        });

        let finalTotal = itemsTotalAfterItemDiscounts;
        if (formData.discount_type === 'percent') {
            finalTotal = itemsTotalAfterItemDiscounts * (1 - (formData.discount_value || 0) / 100);
        } else if (formData.discount_type === 'fixed') {
            finalTotal = Math.max(0, itemsTotalAfterItemDiscounts - (formData.discount_value || 0));
        }

        return { originalTotal, itemsTotalAfterItemDiscounts, finalTotal };
    };

    const totals = calculateTotals();

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const filteredServices = services.filter(s =>
        s.name_de?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name_fr?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Bundle Name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                />
                <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">
                        Bundle Discount
                    </label>
                    <div className="flex gap-2">
                        <Select
                            className="w-24"
                            value={formData.discount_type}
                            onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                            options={[
                                { value: 'percent', label: '%' },
                                { value: 'fixed', label: '€' }
                            ]}
                        />
                        <Input
                            type="number"
                            step="0.01"
                            value={formData.discount_value}
                            onChange={e => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                            className="flex-1"
                        />
                    </div>
                </div>
            </div>

            <Input
                label="Description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
            />

            <div className="space-y-3">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">
                    Services in Bundle
                </label>

                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search services..."
                        className="w-full pl-10 pr-4 py-2 text-[14px] bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="border border-[var(--border-subtle)] rounded-[var(--radius-lg)] bg-[var(--bg-app)] divide-y divide-[var(--border-subtle)] max-h-[300px] overflow-y-auto custom-scrollbar">
                    {filteredServices.length === 0 ? (
                        <div className="py-8 text-center text-[var(--text-muted)] text-[13px] font-medium">
                            No services found matching your search.
                        </div>
                    ) : (
                        filteredServices.map(s => {
                            const selectedItem = formData.items?.find(item => item.service_id === s.id);
                            const isSelected = !!selectedItem;

                            return (
                                <div key={s.id} className={`p-4 transition-colors ${isSelected ? 'bg-white shadow-[var(--shadow-sm)]' : 'hover:bg-[var(--bg-surface)]'}`}>
                                    <div className="flex items-center gap-3">
                                        <div
                                            onClick={() => handleServiceToggle(s.id)}
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border-medium)] bg-white hover:border-[var(--primary)]/50'}`}
                                        >
                                            {isSelected && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-[14px] font-bold text-[var(--text-main)]">
                                                {locale === 'de' ? s.name_de : s.name_fr}
                                            </div>
                                            <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                                                {s.category} • {s.price}€
                                            </div>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="ml-8 mt-4 pt-4 border-t border-[var(--border-subtle)] border-dashed border-t-[1px] grid grid-cols-2 gap-4">
                                            {s.variants && s.variants.length > 0 && (
                                                <Select
                                                    label="Variant"
                                                    value={selectedItem?.variant_name || ''}
                                                    onChange={e => handleVariantChange(s.id, e.target.value || null)}
                                                    options={[
                                                        { value: '', label: `Default (${s.price}€)` },
                                                        ...(s.variants?.map(v => ({ value: v.name, label: `${v.name} (${v.price}€)` })) || [])
                                                    ]}
                                                />
                                            )}
                                            <Input
                                                label="Item Discount (%)"
                                                type="number"
                                                value={selectedItem.discount_percent}
                                                onChange={e => handleItemDiscountChange(s.id, e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="bg-[var(--bg-app)] border border-[var(--border-subtle)] p-5 rounded-[var(--radius-lg)]">
                <div className="flex items-center gap-2 mb-4">
                    <Package size={16} className="text-[var(--primary)]" />
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-main)]">Bundle Breakdown</h4>
                </div>
                <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-[13px]">
                        <span className="text-[var(--text-secondary)] font-medium">Original Total</span>
                        <span className="font-bold text-[var(--text-main)] tabular-nums">{totals.originalTotal.toFixed(2)}€</span>
                    </div>
                    {totals.originalTotal !== totals.itemsTotalAfterItemDiscounts && (
                        <div className="flex justify-between items-center text-[13px]">
                            <span className="text-[var(--primary)] font-medium">After Item Discounts</span>
                            <span className="font-bold text-[var(--primary)] tabular-nums">{totals.itemsTotalAfterItemDiscounts.toFixed(2)}€</span>
                        </div>
                    )}
                    {(formData.discount_value > 0) && (
                        <div className="flex justify-between items-center text-[13px]">
                            <span className="text-[var(--success)] font-medium">
                                Bundle Discount ({formData.discount_type === 'percent' ? `${formData.discount_value}%` : `${formData.discount_value}€`})
                            </span>
                            <span className="font-bold text-[var(--success)] tabular-nums">-{(totals.itemsTotalAfterItemDiscounts - totals.finalTotal).toFixed(2)}€</span>
                        </div>
                    )}
                    <div className="pt-3 border-t border-[var(--border-subtle)] border-dashed border-t-[1px] flex justify-between items-center">
                        <span className="text-[14px] font-extrabold text-[var(--text-main)]">Final Bundle Price</span>
                        <span className="text-[20px] font-black text-[var(--primary)] tabular-nums">{totals.finalTotal.toFixed(2)}€</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-subtle)]">
                <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
                <Button type="submit" className="px-8">{t('common.save')}</Button>
            </div>
        </form>
    );
};

export default BundleForm;
