import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Input from '../components/ui/Input';
import { Plus, Search, User } from 'lucide-react';

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
        <div className="page-container">
            <div className="flex justify-between items-center mb-4">
                <h1 className="page-title" style={{ marginBottom: 0 }}>{t('nav.customers')}</h1>
                <Button
                    onClick={() => {
                        setEditingCustomer(null);
                        setIsModalOpen(true);
                    }}
                >
                    <Plus size={18} /> {t('common.add')}
                </Button>
            </div>

            <Card className="mb-4" padding="1rem">
                <div style={{ position: 'relative', maxWidth: '400px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <Input
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
                    />
                </div>
            </Card>

            <Card padding="0">
                <Table headers={['Customer Name', 'Location', 'VAT ID', 'Actions']}>
                    {isLoading ? (
                        <tr><td colSpan="4" style={{ padding: '4rem', textAlign: 'center' }}>Loading customers...</td></tr>
                    ) : filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                        <tr key={customer.id}>
                            <td className="font-bold">
                                <Link to={`/customers/${customer.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '6px', borderRadius: '8px' }}>
                                        <User size={16} />
                                    </div>
                                    {customer.company_name}
                                </Link>
                            </td>
                            <td className="text-secondary">{customer.country}</td>
                            <td className="text-muted">{customer.vat_number || 'N/A'}</td>
                            <td>
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(customer)} className="text-primary">
                                    Edit
                                </Button>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="4" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No customers found.</td></tr>
                    )}
                </Table>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            >
                <CustomerForm
                    customer={editingCustomer}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
        </div>
    );
};

export default CustomersPage;
