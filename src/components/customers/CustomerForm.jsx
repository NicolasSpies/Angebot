import React, { useState } from 'react';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

const CustomerForm = ({ customer, onSave, onDelete, onCancel }) => {
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
        language: 'en',
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
        <form onSubmit={handleSubmit} className="space-y-10 py-2">
            {/* Company Information */}
            <div className="space-y-6">
                <h3 className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] border-b border-[var(--border)] pb-2">Institutional Identity</h3>
                <div className="grid grid-2 gap-6">
                    <Input
                        label="Company Name"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Acme Corp"
                    />
                    <Input
                        label="VAT Number"
                        name="vat_number"
                        value={formData.vat_number}
                        onChange={handleChange}
                        placeholder="VAT-000000"
                    />
                </div>
            </div>

            {/* Contact Person */}
            <div className="space-y-6">
                <h3 className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] border-b border-[var(--border)] pb-2">Primary Liaison</h3>
                <div className="grid grid-2 gap-6">
                    <Input
                        label="First Name"
                        name="first_name"
                        value={formData.first_name || ''}
                        onChange={handleChange}
                        placeholder="John"
                    />
                    <Input
                        label="Last Name"
                        name="last_name"
                        value={formData.last_name || ''}
                        onChange={handleChange}
                        placeholder="Doe"
                    />
                    <Input
                        label="Email Address"
                        type="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        placeholder="liaison@company.com"
                    />
                    <Input
                        label="Direct Line"
                        type="tel"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleChange}
                        placeholder="+32 ..."
                    />
                </div>
            </div>

            {/* Address */}
            <div className="space-y-6">
                <h3 className="text-[12px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] border-b border-[var(--border)] pb-2">Geographic Presence</h3>
                <div className="space-y-6">
                    <Input
                        label="Street Address"
                        name="address"
                        value={formData.address || ''}
                        onChange={handleChange}
                        placeholder="Avenue des Arts 12"
                    />
                    <div className="grid grid-2 gap-6">
                        <Input
                            label="City / Region"
                            name="city"
                            value={formData.city || ''}
                            onChange={handleChange}
                            placeholder="Brussels"
                        />
                        <Input
                            label="Postal Code"
                            name="postal_code"
                            value={formData.postal_code || ''}
                            onChange={handleChange}
                            placeholder="1000"
                        />
                    </div>
                    <div className="grid grid-2 gap-6">
                        <Select
                            label="Country"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            options={[
                                { value: 'BE', label: 'Belgium' },
                                { value: 'DE', label: 'Germany' },
                                { value: 'FR', label: 'France' },
                                { value: 'LU', label: 'Luxembourg' },
                                { value: 'US', label: 'United States' },
                                { value: 'GB', label: 'United Kingdom' }
                            ]}
                        />
                        <Select
                            label="Preferred Language"
                            name="language"
                            value={formData.language}
                            onChange={handleChange}
                            options={[
                                { value: 'en', label: 'English (Default)' },
                                { value: 'de', label: 'Deutsch' },
                                { value: 'fr', label: 'Français' }
                            ]}
                        />
                    </div>
                </div>
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-[var(--border)]">
                {customer && onDelete && (
                    <Button
                        variant="danger"
                        onClick={() => setShowDeleteConfirm(true)}
                        type="button"
                        className="px-6"
                    >
                        Delete Customer
                    </Button>
                )}
                <div className="flex gap-4 ml-auto">
                    <Button variant="ghost" onClick={onCancel} type="button" className="px-6 font-bold">
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" className="px-10 shadow-lg">
                        Save Identity
                    </Button>
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
                title="Delete Customer"
                message="Are you sure you want to delete this customer? All associated offers will also be deleted. This action cannot be undone."
                confirmText="Delete"
                isDestructive={true}
            />
        </form>
    );
};

export default CustomerForm;
