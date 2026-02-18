import React, { useState, useEffect } from 'react';
import { dataService } from '../../data/dataService';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Card from '../ui/Card';
import { Plus, Check, Box, Zap, Layers, Type, Star, Settings2, X, ListTodo } from 'lucide-react';

const SPEC_KEYS = [
    { key: 'format', label: 'Format', icon: Box },
    { key: 'paper_type', label: 'Paper Type', icon: Layers },
    { key: 'weight', label: 'Weight / Grammage', icon: Zap },
    { key: 'finish', label: 'Finish', icon: Star },
    { key: 'color_mode', label: 'Color Mode', icon: Type },
    { key: 'sides', label: 'Sides', icon: Settings2 },
    { key: 'lamination', label: 'Lamination', icon: Settings2 },
    { key: 'round_corners', label: 'Round Corners', icon: Settings2 },
    { key: 'fold', label: 'Fold', icon: Settings2 },
    { key: 'binding', label: 'Binding', icon: Settings2 },
    { key: 'other', label: 'Other', icon: Settings2 }
];

const PrintProductForm = ({ initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        unit_label: 'pcs',
        active: 1,
        allowed_specs: {},
        default_specs: {}
    });

    const [newValInputs, setNewValInputs] = useState({});

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                allowed_specs: initialData.allowed_specs || {},
                default_specs: initialData.default_specs || {}
            });
        }
    }, [initialData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddValue = (key) => {
        const val = newValInputs[key]?.trim();
        if (!val) return;

        setFormData(prev => {
            const current = prev.allowed_specs[key] || [];
            if (current.includes(val)) return prev;
            return {
                ...prev,
                allowed_specs: {
                    ...prev.allowed_specs,
                    [key]: [...current, val]
                }
            };
        });
        setNewValInputs(prev => ({ ...prev, [key]: '' }));
    };

    const handleRemoveValue = (key, val) => {
        setFormData(prev => ({
            ...prev,
            allowed_specs: {
                ...prev.allowed_specs,
                [key]: (prev.allowed_specs[key] || []).filter(v => v !== val)
            },
            // Clear default if it was the removed value
            default_specs: prev.default_specs[key] === val
                ? { ...prev.default_specs, [key]: '' }
                : prev.default_specs
        }));
    };

    const handleSpecChange = (key, value) => {
        setFormData(prev => ({
            ...prev,
            default_specs: { ...prev.default_specs, [key]: value }
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-h-[85vh] overflow-y-auto px-4 py-2">
            {/* CORE INFO */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2">
                    <Input
                        label="Product Name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. Business Cards"
                        required
                    />
                </div>
                <Input
                    label="Unit (e.g. pcs, sets)"
                    name="unit_label"
                    value={formData.unit_label}
                    onChange={handleInputChange}
                    placeholder="pcs"
                />
                <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider ml-1">Status</label>
                    <div className="flex bg-[var(--bg-subtle)] p-1 rounded-lg border border-[var(--border-subtle)] h-[42px]">
                        <button
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, active: 1 }))}
                            className={`flex-1 rounded-md text-[13px] font-black transition-all ${formData.active ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
                        >
                            Active
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, active: 0 }))}
                            className={`flex-1 rounded-md text-[13px] font-black transition-all ${!formData.active ? 'bg-white shadow-sm text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}
                        >
                            Inactive
                        </button>
                    </div>
                </div>
            </div>

            {/* ALLOWED SPECS MANAGEMENT */}
            <div className="space-y-6 pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-[var(--primary-bg)] text-[var(--primary)]">
                        <ListTodo size={18} />
                    </div>
                    <div>
                        <h3 className="text-[16px] font-black text-[var(--text-main)]">Allowed Specification Values</h3>
                        <p className="text-[11px] text-[var(--text-muted)] font-medium">Manage which values can be selected for each property</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {SPEC_KEYS.map((spec) => (
                        <Card key={spec.key} className="p-4 border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                            <div className="flex items-center gap-2 mb-3">
                                {spec.icon && <spec.icon size={14} className="text-[var(--primary)]" />}
                                <label className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-[0.05em]">{spec.label}</label>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
                                {(formData.allowed_specs[spec.key] || []).map(val => (
                                    <div key={val} className="flex items-center gap-1 bg-white border border-[var(--border-subtle)] rounded-full px-3 py-1 text-[12px] group hover:border-[var(--primary)] transition-colors">
                                        <span>{val}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveValue(spec.key, val)}
                                            className="text-[var(--text-muted)] hover:text-[var(--danger)] ml-1"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                {(!formData.allowed_specs[spec.key] || formData.allowed_specs[spec.key].length === 0) && (
                                    <span className="text-[12px] text-[var(--text-muted)] italic py-1">No values defined.</span>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="flex-1 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[var(--primary)]"
                                    placeholder={`Add ${spec.label}...`}
                                    value={newValInputs[spec.key] || ''}
                                    onChange={(e) => setNewValInputs(prev => ({ ...prev, [spec.key]: e.target.value }))}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddValue(spec.key))}
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleAddValue(spec.key)}
                                    className="h-[38px] w-[38px] p-0 flex items-center justify-center"
                                >
                                    <Plus size={16} />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* DEFAULT SPECS TEMPLATE */}
            <div className="space-y-6 pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <Settings2 size={18} />
                    </div>
                    <div>
                        <h3 className="text-[16px] font-black text-[var(--text-main)]">Default Spec Template</h3>
                        <p className="text-[11px] text-[var(--text-muted)] font-medium">Pre-fill these values when adding this product to an Offer</p>
                    </div>
                </div>

                <Card className="p-6 border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                        {SPEC_KEYS.map((spec) => (
                            <div key={spec.key} className="space-y-2">
                                <label className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-[0.05em] ml-1">{spec.label}</label>

                                <Select
                                    value={formData.default_specs[spec.key] || ''}
                                    onChange={(e) => handleSpecChange(spec.key, e.target.value)}
                                    options={[
                                        { label: 'None', value: '' },
                                        ...(formData.allowed_specs[spec.key] || []).map(val => ({ label: val, value: val }))
                                    ]}
                                />
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-subtle)]">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit" variant="primary" className="px-8 font-black">
                    <Check size={18} className="mr-2" /> Save Catalog Product
                </Button>
            </div>
        </form>
    );
};

export default PrintProductForm;
