import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import { Plus, User } from 'lucide-react';
import ListPageHeader from '../components/layout/ListPageHeader';
import ListPageToolbar from '../components/layout/ListPageToolbar';
import EmptyState from '../components/ui/EmptyState';

const CustomersPage = () => {
    const { t } = useI18n();
    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setIsLoading(true);
        const data = await dataService.getCustomers();
        setCustomers(data);
        setIsLoading(false);
    };

    const handleSave = async (customerData) => {
        await dataService.saveCustomer(customerData);
        loadCustomers();
        setIsModalOpen(false);
        setEditingCustomer(null);
    };

    const handleDelete = async (id) => {
        await dataService.deleteCustomer(id);
        loadCustomers();
    };

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const filteredCustomers = customers.filter(c =>
        c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container fade-in">
            <ListPageHeader
                title={t('nav.customers')}
                description="Manage your customer database and billing profiles."
                action={
                    <Button
                        onClick={() => {
                            setEditingCustomer(null);
                            setIsModalOpen(true);
                        }}
                        className="btn-primary shadow-sm"
                    >
                        <Plus size={18} /> Add Customer
                    </Button>
                }
            />

            <ListPageToolbar
                searchProps={{
                    value: searchTerm,
                    onChange: setSearchTerm,
                    placeholder: "Search by company, country or VAT ID..."
                }}
            />

            <Table headers={['Customer Name', 'Location', 'VAT ID', 'Health', 'Actions']}>
                {isLoading ? (
                    <tr><td colSpan="5" className="py-20 text-center text-[var(--text-muted)]">Loading customers...</td></tr>
                ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map(customer => (
                        <tr key={customer.id} className="hover:bg-[var(--bg-app)] transition-colors group border-b border-[var(--border-subtle)] last:border-0 text-left align-middle h-14">
                            <td className="py-3 px-6 font-bold">
                                <Link to={`/customers/${customer.id}`} className="flex items-center gap-4 text-[var(--text-main)] hover:text-[var(--primary)] transition-colors">
                                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg-app)] text-[var(--primary)] flex items-center justify-center shadow-sm border border-[var(--border-subtle)]">
                                        <User size={18} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[14px] leading-tight">{customer.company_name}</span>
                                        {customer.email && <span className="text-[12px] text-[var(--text-muted)] font-medium mt-0.5">{customer.email}</span>}
                                    </div>
                                </Link>
                            </td>
                            <td className="py-3 px-6 text-[14px] font-medium text-[var(--text-secondary)]">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/50"></span>
                                    {customer.country || <span className="text-[var(--text-muted)] opacity-50">Not specified</span>}
                                </div>
                            </td>
                            <td className="py-3 px-6">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-mono bg-[var(--bg-app)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                                    {customer.vat_number || 'No VAT'}
                                </span>
                            </td>
                            <td className="py-3 px-6">
                                {customer.health === 'stable' && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 text-green-700 border border-green-100 uppercase tracking-tight">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        Stable
                                    </span>
                                )}
                                {customer.health === 'overdue' && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-100 uppercase tracking-tight">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                        Overdue
                                    </span>
                                )}
                                {customer.health === 'risk' && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-tight">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                        Risk
                                    </span>
                                )}
                                {customer.health === 'inactive' && (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-50 text-gray-500 border border-gray-100 uppercase tracking-tight">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                        Inactive
                                    </span>
                                )}
                            </td>
                            <td className="py-3 px-6">
                                <div className="flex justify-end pr-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)} className="text-[var(--primary)] font-bold hover:bg-[var(--bg-app)]">
                                        Manage
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={5}>
                            <EmptyState
                                icon={User}
                                title="No customers found"
                                description="Add a new customer to manage their details."
                            />
                        </td>
                    </tr>
                )}
            </Table>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            >
                <div className="p-1">
                    <CustomerForm
                        customer={editingCustomer}
                        onSave={handleSave}
                        onDelete={handleDelete}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default CustomersPage;
