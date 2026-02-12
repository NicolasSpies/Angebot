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
            <div className="page-header">
                <h1 className="page-title">{t('nav.offers')}</h1>
                <Link to="/offer/new" className="btn-primary" style={{ textDecoration: 'none' }}>+ {t('offer.create')}</Link>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'visible' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Offer Name / Project</th>
                            <th>Customer</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>Loading offers...</td></tr>
                        ) : offers.length > 0 ? offers.map(o => (
                            <tr key={o.id}>
                                <td style={{ fontWeight: 500 }}>
                                    <Link to={`/offer/preview/${o.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        {o.offer_name || <i>Untitled Offer #{o.id}</i>}
                                    </Link>
                                </td>
                                <td>{o.customer_name}</td>
                                <td style={{ fontWeight: 600 }}>{formatCurrency(o.total)}</td>
                                <td>
                                    <span className={`status-badge status-${o.status}`}>
                                        {o.status}
                                    </span>
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <span style={{ fontSize: '0.85rem' }}>{new Date(o.created_at).toLocaleDateString()}</span>
                                        {o.due_date && o.status !== 'signed' && o.status !== 'declined' && (
                                            (() => {
                                                const due = new Date(o.due_date);
                                                const now = new Date();
                                                const created = new Date(o.sent_at || o.created_at);
                                                const totalWindow = Math.max(1, Math.ceil((due - created) / (1000 * 60 * 60 * 24)));
                                                const elapsed = Math.ceil((now - created) / (1000 * 60 * 60 * 24));
                                                const remaining = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                                                const pct = Math.max(0, Math.min(100, (elapsed / totalWindow) * 100));

                                                let color = '#22c55e'; // Green
                                                let text = `${remaining} days left`;

                                                if (remaining <= 0) {
                                                    color = '#ef4444'; // Red
                                                    text = `Overdue by ${Math.abs(remaining)} days`;
                                                } else if (remaining <= 3) {
                                                    color = '#f97316'; // Orange
                                                }

                                                return (
                                                    <div style={{ width: '100px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', position: 'relative' }} title={text}>
                                                        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s ease' }} />
                                                    </div>
                                                );
                                            })()
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <DropdownMenu
                                        actions={[
                                            { label: t('common.view'), onClick: () => navigate(`/offer/preview/${o.id}`) },
                                            { label: t('common.edit'), onClick: () => navigate(`/offer/edit/${o.id}`) },
                                            // Add the Send action unconditionally, but it will be disabled/hidden based on status
                                            { label: t('common.send'), onClick: () => handleSend(o.id), disabled: !(o.status === 'draft' || o.status === 'declined') },
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
        </div >
    );
};

export default OffersPage;
