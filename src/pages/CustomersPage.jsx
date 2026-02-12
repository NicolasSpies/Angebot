import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';
import { Pencil } from 'lucide-react';

const CustomersPage = () => {
    const { t } = useI18n();
    const [customers, setCustomers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

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

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>{t('nav.customers')}</h1>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setEditingCustomer(null);
                        setIsModalOpen(true);
                    }}
                >+ {t('common.add')}</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Name</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Address</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>VAT</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
                        ) : customers.length > 0 ? customers.map(customer => (
                            <tr key={customer.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', fontWeight: 500 }}>
                                    <Link to={`/customers/${customer.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                        {customer.company_name}
                                    </Link>
                                </td>
                                <td style={{ padding: '1rem' }}>{customer.country}</td>
                                <td style={{ padding: '1rem' }}>{customer.vat_number}</td>
                                <td style={{ padding: '1rem' }}>
                                    <button
                                        onClick={() => handleEdit(customer)}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                    >
                                        <Pencil size={18} />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No customers found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCustomer ? t('common.edit') : t('common.add')}
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
