import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { dataService } from '../../data/dataService';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Search } from 'lucide-react';

const BundleForm = ({ initialData, onSave, onCancel }) => {
    const { t, locale } = useI18n();
    const [formData, setFormData] = useState(initialData || {
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

    const handleServiceToggle = (serviceId, checked) => {
        setFormData(prev => {
            const currentItems = prev.items || [];
            if (checked) {
                return { ...prev, items: [...currentItems, { service_id: serviceId, variant_name: null, discount_percent: 0 }] };
            } else {
                return { ...prev, items: currentItems.filter(item => item.service_id !== serviceId) };
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
        <form onSubmit={handleSubmit} className="flex flex-column gap-4">
            <div className="grid grid-2 gap-4">
                <Input
                    label="Bundle Name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                />
                <div>
                    <label className="form-label mb-1">Bundle Discount</label>
                    <div className="flex gap-2">
                        <select
                            className="form-select w-24"
                            value={formData.discount_type}
                            onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                        >
                            <option value="percent">%</option>
                            <option value="fixed">€</option>
                        </select>
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

            <div>
                <label className="form-label mb-2">Services in Bundle</label>

                <div className="relative mb-2">
                    <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        placeholder="Search services..."
                        className="form-input pl-9 py-1 text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="border rounded-md bg-white p-2 flex flex-column gap-1" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {filteredServices.length === 0 ? (
                        <p className="text-sm text-muted p-2 text-center">No services found.</p>
                    ) : (
                        filteredServices.map(s => {
                            const selectedItem = formData.items?.find(item => item.service_id === s.id);
                            const isSelected = !!selectedItem;

                            return (
                                <div key={s.id} className={`flex flex-col p-2 rounded border border-transparent ${isSelected ? 'bg-primary-light border-primary/20' : 'hover:bg-gray-50'}`}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`srv-${s.id}`}
                                            checked={isSelected}
                                            onChange={e => handleServiceToggle(s.id, e.target.checked)}
                                            className="cursor-pointer"
                                        />
                                        <label htmlFor={`srv-${s.id}`} className="cursor-pointer flex-1 text-sm font-medium">
                                            {locale === 'de' ? s.name_de : s.name_fr}
                                        </label>
                                        <span className="text-xs font-bold whitespace-nowrap">{s.price}€</span>
                                    </div>

                                    {isSelected && (
                                        <div className="ml-6 mt-2 flex flex-wrap items-center gap-4">
                                            {s.variants && s.variants.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted">Variant:</span>
                                                    <select
                                                        className="form-select text-xs py-1 px-2 h-auto"
                                                        value={selectedItem?.variant_name || ''}
                                                        onChange={e => handleVariantChange(s.id, e.target.value || null)}
                                                    >
                                                        <option value="">Default ({s.price}€)</option>
                                                        {s.variants.map((v, idx) => (
                                                            <option key={idx} value={v.name}>
                                                                {v.name} ({v.price}€)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted">Discount:</span>
                                                <input
                                                    type="number"
                                                    className="form-input text-xs py-1 px-2 h-auto w-16"
                                                    placeholder="0"
                                                    value={selectedItem.discount_percent}
                                                    onChange={e => handleItemDiscountChange(s.id, e.target.value)}
                                                />
                                                <span className="text-xs text-muted">%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="bg-muted p-4 rounded-lg mt-2">
                <h4 className="text-xs font-bold uppercase text-muted mb-3">Bundle Price Breakdown</h4>
                <div className="flex flex-column gap-2">
                    <div className="flex justify-between text-sm">
                        <span>Original Total:</span>
                        <span className="font-mono">{totals.originalTotal.toFixed(2)}€</span>
                    </div>
                    {totals.originalTotal !== totals.itemsTotalAfterItemDiscounts && (
                        <div className="flex justify-between text-sm text-primary">
                            <span>After Item Discounts:</span>
                            <span className="font-mono">{totals.itemsTotalAfterItemDiscounts.toFixed(2)}€</span>
                        </div>
                    )}
                    {(formData.discount_value > 0) && (
                        <div className="flex justify-between text-sm text-primary">
                            <span>Bundle Discount ({formData.discount_type === 'percent' ? `${formData.discount_value}%` : `${formData.discount_value}€`}):</span>
                            <span className="font-mono">-{(totals.itemsTotalAfterItemDiscounts - totals.finalTotal).toFixed(2)}€</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-2 border-t mt-1">
                        <span>Final Bundle Price:</span>
                        <span className="text-primary">{totals.finalTotal.toFixed(2)}€</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
                <Button type="submit">{t('common.save')}</Button>
            </div>
        </form>
    );
};

export default BundleForm;
