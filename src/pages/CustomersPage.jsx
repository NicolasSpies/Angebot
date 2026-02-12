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
            <div className="page-header">
                <h1 className="page-title">{t('nav.customers')}</h1>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setEditingCustomer(null);
                        setIsModalOpen(true);
                    }}
                >+ {t('common.add')}</button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Address</th>
                            <th>VAT</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
                        ) : customers.length > 0 ? customers.map(customer => (
                            <tr key={customer.id}>
                                <td style={{ fontWeight: 500 }}>
                                    <Link to={`/customers/${customer.id}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                        {customer.company_name}
                                    </Link>
                                </td>
                                <td>{customer.country}</td>
                                <td>{customer.vat_number}</td>
                                <td>
                                    <button
                                        onClick={() => handleEdit(customer)}
                                        className="btn-icon"
                                    >
                                        <Pencil size={16} />
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
