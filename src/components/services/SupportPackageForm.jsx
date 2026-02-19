import React, { useState, useEffect } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import { Check, X, Layers, Tag as TagIcon } from 'lucide-react';

const SupportPackageForm = ({ initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: 'Maintenance',
        variant_name: '',
        included_hours: '',
        price: '',
        is_pay_as_you_go: 0,
        description: '',
        active: 1
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                category: initialData.category || 'Maintenance',
                variant_name: initialData.variant_name || '',
                included_hours: initialData.included_hours || '',
                price: initialData.price || '',
                description: initialData.description || ''
            });
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            included_hours: formData.is_pay_as_you_go ? null : parseFloat(formData.included_hours),
            price: formData.is_pay_as_you_go ? null : parseFloat(formData.price)
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <Input
                        label="Package / Product Name"
                        placeholder="e.g. Web Support"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                <Select
                    label="Category"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    options={[
                        { label: 'Maintenance', value: 'Maintenance' },
                        { label: 'Development Support', value: 'Development Support' },
                        { label: 'Hosting & Server', value: 'Hosting & Server' },
                        { label: 'General retainer', value: 'General retainer' },
                        { label: 'Other', value: 'Other' }
                    ]}
                />

                <Input
                    label="Variant Name (e.g. Bronze, 10h, Basic)"
                    placeholder="Bronze"
                    value={formData.variant_name}
                    onChange={e => setFormData({ ...formData, variant_name: e.target.value })}
                />

                <div className="md:col-span-2 flex items-center gap-3 p-4 bg-[var(--bg-app)] rounded-xl border border-[var(--border-subtle)]">
                    <input
                        type="checkbox"
                        id="is_pay_as_you_go"
                        checked={formData.is_pay_as_you_go === 1}
                        onChange={e => setFormData({ ...formData, is_pay_as_you_go: e.target.checked ? 1 : 0 })}
                        className="w-5 h-5 accent-[var(--primary)]"
                    />
                    <label htmlFor="is_pay_as_you_go" className="text-[14px] font-bold text-[var(--text-main)] cursor-pointer">
                        Pay as you go (Billing by hourly rate)
                    </label>
                </div>

                {!formData.is_pay_as_you_go ? (
                    <>
                        <Input
                            label="Included Hours"
                            type="number"
                            step="0.5"
                            value={formData.included_hours}
                            onChange={e => setFormData({ ...formData, included_hours: e.target.value })}
                            required
                        />
                        <Input
                            label="Price (€)"
                            type="number"
                            step="0.01"
                            value={formData.price}
                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                            required
                        />
                    </>
                ) : (
                    <div className="md:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-[12px] text-amber-700 font-medium">
                            Note: Pay as you go packages use the default hourly rate from settings. Price will be shown as "On request" or automatically calculated.
                        </p>
                    </div>
                )}

                <div className="md:col-span-2">
                    <Textarea
                        label="Description (Optional)"
                        placeholder="Describe what's included..."
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-subtle)]">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit" variant="primary" className="px-8 font-black">
                    <Check size={18} className="mr-2" /> Save Support Package
                </Button>
            </div>
        </form>
    );
};

export default SupportPackageForm;
