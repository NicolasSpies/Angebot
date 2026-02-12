import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { useI18n } from '../i18n/I18nContext';
import { formatCurrency } from '../utils/pricingEngine';
import {
    Briefcase, Clock, CheckCircle, FileText, AlertTriangle,
    TrendingUp, Plus, Copy, Pencil, MoreVertical, ExternalLink,
    ChevronLeft
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';

const CustomerDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await dataService.getCustomerDashboard(id);
            setData(result);
        } catch (err) {
            console.error('Failed to load customer dashboard', err);
        }
        setIsLoading(false);
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleEditCustomer = async (customerData) => {
        await dataService.saveCustomer(customerData);
        loadData();
        setIsEditModalOpen(false);
    };

    const handleDuplicateOffer = async (offerId) => {
        const result = await dataService.duplicateOffer(offerId);
        if (result.success) {
            navigate(`/offer/edit/${result.id}`);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'signed': return '#10b981';
            case 'sent': return '#3b82f6';
            case 'declined': return '#ef4444';
            case 'draft': return '#94a3b8';
            default: return 'var(--text-muted)';
        }
    };

    if (isLoading || !data) return <div className="page-container">Loading...</div>;

    const { customer, offers, stats } = data;

    return (
        <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Link to="/customers" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={24} />
                </Link>
                <div style={{ flex: 1 }}>
                    <h1 className="page-title" style={{ margin: 0 }}>{customer.company_name}</h1>
                    <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        <span>{customer.country}</span>
                        <span>{customer.vat_number}</span>
                        <span>{customer.language === 'de' ? 'German' : 'French'}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn-secondary" onClick={() => setIsEditModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Pencil size={16} /> Edit Profile
                    </button>
                    <button className="btn-primary" onClick={() => navigate('/offer/new', { state: { customerId: customer.id } })} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={16} /> New Offer
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={<TrendingUp size={20} color="#10b981" />} />
                <StatCard label="Total Offers" value={stats.totalOffers} icon={<FileText size={20} color="#3b82f6" />} />
                <StatCard label="Avg Offer Value" value={formatCurrency(stats.avgOfferValue)} icon={<Briefcase size={20} color="#8b5cf6" />} />
                <StatCard label="Signed / Pending" value={`${stats.signedCount} / ${stats.pendingCount}`} icon={<CheckCircle size={20} color="#10b981" />} />
                <StatCard label="Declined" value={stats.declinedCount} icon={<AlertTriangle size={20} color="#ef4444" />} />
            </div>

            {/* Offers Table */}
            <div className="card" style={{ padding: 0, overflow: 'visible' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Offer History</h3>
                    <button
                        className="btn-secondary btn-sm"
                        onClick={() => offers.length > 0 && handleDuplicateOffer(offers[0].id)}
                        disabled={offers.length === 0}
                    >
                        <Copy size={14} style={{ marginRight: '0.5rem' }} /> Duplicate Last
                    </button>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Offer #</th>
                            <th>Date Created</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {offers.length > 0 ? offers.map(offer => (
                            <tr key={offer.id}>
                                <td style={{ fontWeight: 500 }}>ANB-{offer.id}</td>
                                <td>{new Date(offer.created_at).toLocaleDateString()}</td>
                                <td>{formatCurrency(offer.total)}</td>
                                <td>
                                    <span style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        background: `${getStatusColor(offer.status)}20`,
                                        color: getStatusColor(offer.status)
                                    }}>
                                        {offer.status.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right', position: 'relative' }}>
                                    <button
                                        className="btn-icon"
                                        onClick={() => setActiveDropdown(activeDropdown === offer.id ? null : offer.id)}
                                    >
                                        <MoreVertical size={18} />
                                    </button>

                                    {activeDropdown === offer.id && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '80%',
                                            right: '1rem',
                                            background: 'white',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            borderRadius: 'var(--radius-md)',
                                            zIndex: 100,
                                            minWidth: '160px',
                                            border: '1px solid var(--border)',
                                            padding: '0.5rem 0',
                                            textAlign: 'left'
                                        }}>
                                            <Link to={`/offer/preview/${offer.id}`} className="dropdown-item" style={dropdownItemStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <ExternalLink size={14} /> View
                                                </div>
                                            </Link>
                                            <Link to={`/offer/edit/${offer.id}`} className="dropdown-item" style={dropdownItemStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Pencil size={14} /> Edit
                                                </div>
                                            </Link>
                                            <div
                                                className="dropdown-item"
                                                style={dropdownItemStyle}
                                                onClick={() => handleDuplicateOffer(offer.id)}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Copy size={14} /> Duplicate
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No offers found for this customer.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Customer Profile"
            >
                <CustomerForm
                    customer={customer}
                    onSave={handleEditCustomer}
                    onCancel={() => setIsEditModalOpen(false)}
                />
            </Modal>
        </div>
    );
};

const StatCard = ({ label, value, icon }) => (
    <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: '#f1f5f9', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
            {icon}
        </div>
        <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>{label}</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{value}</p>
        </div>
    </div>
);

const dropdownItemStyle = {
    padding: '0.6rem 1rem',
    display: 'block',
    textDecoration: 'none',
    color: 'var(--text)',
    fontSize: '0.9rem',
    cursor: 'pointer',
    borderBottom: 'none',
    transition: 'background 0.2s'
};

export default CustomerDetailPage;
