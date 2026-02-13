import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { useI18n } from '../i18n/I18nContext';
import { formatCurrency } from '../utils/pricingEngine';
import {
    Briefcase, Clock, CheckCircle, FileText, AlertTriangle,
    TrendingUp, Plus, Copy, Pencil, ExternalLink,
    ChevronLeft, Globe, Mail, Phone, MapPin
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import CustomerForm from '../components/customers/CustomerForm';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import DropdownMenu from '../components/ui/DropdownMenu';

const CustomerDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

    useEffect(() => { loadData(); }, [loadData]);

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

    if (isLoading || !data) return <div className="page-container">Loading customer...</div>;

    const { customer, offers, stats } = data;

    return (
        <div className="page-container" style={{ maxWidth: '1100px' }}>
            {/* Header */}
            <div className="mb-6">
                <Link to="/customers" className="flex items-center gap-1 text-sm text-muted mb-2" style={{ textDecoration: 'none' }}>
                    <ChevronLeft size={16} /> Back to Customers
                </Link>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>{customer.company_name}</h1>
                        <div className="flex items-center gap-4 text-xs text-muted">
                            <span className="flex items-center gap-1"><MapPin size={14} /> {customer.country}</span>
                            <span className="flex items-center gap-1"><FileText size={14} /> {customer.vat_number || 'No VAT'}</span>
                            <span className="flex items-center gap-1"><Globe size={14} /> {customer.language === 'de' ? 'German' : 'French'}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditModalOpen(true)}>
                            <Pencil size={16} /> Edit Profile
                        </Button>
                        <Button size="sm" onClick={() => navigate('/offer/new', { state: { customerId: customer.id } })}>
                            <Plus size={16} /> New Offer
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-4 mb-6">
                <Card padding="1.25rem" className="flex items-center gap-4">
                    <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '10px', borderRadius: '10px' }}>
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted uppercase">Revenue</p>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{formatCurrency(stats.totalRevenue)}</h2>
                    </div>
                </Card>
                <Card padding="1.25rem" className="flex items-center gap-4">
                    <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '10px', borderRadius: '10px' }}>
                        <FileText size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted uppercase">Total Offers</p>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{stats.totalOffers}</h2>
                    </div>
                </Card>
                <Card padding="1.25rem" className="flex items-center gap-4">
                    <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '10px', borderRadius: '10px' }}>
                        <CheckCircle size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted uppercase">Signed</p>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{stats.signedCount}</h2>
                    </div>
                </Card>
                <Card padding="1.25rem" className="flex items-center gap-4">
                    <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px', borderRadius: '10px' }}>
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted uppercase">Declined</p>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{stats.declinedCount}</h2>
                    </div>
                </Card>
            </div>

            {/* Offer History */}
            <Card padding="0">
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="text-sm font-bold uppercase text-muted">Offer History</h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => offers.length > 0 && handleDuplicateOffer(offers[0].id)}
                        disabled={offers.length === 0}
                        className="text-primary font-bold"
                    >
                        <Copy size={16} /> Duplicate Last
                    </Button>
                </div>
                <Table headers={['Reference', 'Date', 'Amount', 'Status', 'Actions']}>
                    {offers.length > 0 ? offers.map(offer => (
                        <tr key={offer.id}>
                            <td className="font-bold">ANB-{offer.id}</td>
                            <td className="text-secondary">{new Date(offer.created_at).toLocaleDateString()}</td>
                            <td className="font-bold">{formatCurrency(offer.total)}</td>
                            <td>
                                <Badge variant={
                                    offer.status === 'signed' ? 'success' :
                                        offer.status === 'sent' ? 'warning' :
                                            offer.status === 'declined' ? 'danger' : 'neutral'
                                } showDot={true}>
                                    {offer.status.toUpperCase()}
                                </Badge>
                            </td>
                            <td>
                                <DropdownMenu
                                    actions={[
                                        { label: 'View Offer', onClick: () => navigate(`/offer/preview/${offer.id}`) },
                                        { label: 'Edit Offer', onClick: () => navigate(`/offer/edit/${offer.id}`) },
                                        { label: 'Duplicate', onClick: () => handleDuplicateOffer(offer.id) }
                                    ]}
                                />
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="5" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No offers found for this customer.</td></tr>
                    )}
                </Table>
            </Card>

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

export default CustomerDetailPage;
