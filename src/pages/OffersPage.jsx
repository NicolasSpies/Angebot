import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/pricingEngine';
import DropdownMenu from '../components/ui/DropdownMenu';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import { useNavigate } from 'react-router-dom';

const OffersPage = () => {

    const { t } = useI18n();
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const loadOffers = useCallback(async () => {
        // setIsLoading(true); // Removed to avoid sync state update in effect
        const data = await dataService.getOffers();
        setOffers(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadOffers();
    }, [loadOffers]);

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            setIsLoading(true);
            await dataService.deleteOffer(deleteId);
            loadOffers();
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Delete failed: ' + error.message);
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (id) => {
        setDeleteId(id);
        setIsDeleteDialogOpen(true);
    };

    const handleSend = async (id) => {
        setIsLoading(true);
        await dataService.sendOffer(id);
        loadOffers();
    };

    const copyLink = (token) => {
        const url = `${window.location.origin}/offer/sign/${token}`;
        navigator.clipboard.writeText(url);
        alert('Signature link copied to clipboard!');
    };

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>{t('nav.offers')}</h1>
                <Link to="/offer/new" className="btn-primary" style={{ textDecoration: 'none' }}>+ {t('offer.create')}</Link>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'visible' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Offer #</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Customer</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>Loading offers...</td></tr>
                        ) : offers.length > 0 ? offers.map(o => (
                            <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', fontWeight: 600 }}>OFFER-{o.id}</td>
                                <td style={{ padding: '1rem' }}>{o.customer_name}</td>
                                <td style={{ padding: '1rem', fontWeight: 700 }}>{formatCurrency(o.total)}</td>
                                <td style={{ padding: '1rem' }}>
                                    <span className={`status-badge status-${o.status}`}>
                                        {o.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                                <td style={{ padding: '1rem' }}>
                                    <DropdownMenu
                                        actions={[
                                            { label: t('common.view'), onClick: () => navigate(`/offer/preview/${o.id}`) },
                                            { label: t('common.edit'), onClick: () => navigate(`/offer/edit/${o.id}`) },
                                            ...(o.status === 'draft' || o.status === 'declined' ? [{ label: t('common.send'), onClick: () => handleSend(o.id) }] : []),
                                            ...((o.status === 'sent' || o.status === 'signed' || o.status === 'declined') && o.token ? [{ label: t('common.link'), onClick: () => copyLink(o.token) }] : []),
                                            { label: t('common.delete'), onClick: () => handleDeleteClick(o.id), isDestructive: true }
                                        ]}
                                    />
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No offers found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title={t('common.delete') + ' Offer'}
                message="Are you sure you want to delete this offer? This action cannot be undone."
                confirmText={t('common.delete')}
                isDestructive={true}
            />
        </div>
    );
};

export default OffersPage;
