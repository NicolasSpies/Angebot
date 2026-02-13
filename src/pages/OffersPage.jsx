import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/pricingEngine';
import DropdownMenu from '../components/ui/DropdownMenu';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import { Plus, Search, Filter } from 'lucide-react';
import { calculateValidityProgress, formatDateDash } from '../utils/dateUtils';

const OffersPage = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const loadOffers = useCallback(async () => {
        const data = await dataService.getOffers();
        setOffers(data);
        setIsLoading(false);
    }, []);

    useEffect(() => { loadOffers(); }, [loadOffers]);

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            setIsLoading(true);
            await dataService.deleteOffer(deleteId);
            loadOffers();
        } catch (error) {
            console.error('Delete failed:', error);
            setIsLoading(false);
        }
        setIsDeleteDialogOpen(false);
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
        // Using a more subtle notification would be better, but sticking to basics for now
        alert('Signature link copied to clipboard!');
    };

    const filteredOffers = offers.filter(o =>
        (o.offer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container">
            <div className="flex justify-between items-center mb-4">
                <h1 className="page-title" style={{ marginBottom: 0 }}>{t('nav.offers')}</h1>
                <Link to="/offer/new" style={{ textDecoration: 'none' }}>
                    <Button>
                        <Plus size={18} style={{ marginRight: '0.5rem' }} /> {t('offer.create')}
                    </Button>
                </Link>
            </div>

            <Card className="mb-4" padding="1rem">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-muted" />
                        <span className="text-sm font-bold text-muted uppercase">Filters</span>
                    </div>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                        <input
                            placeholder="Search offers or clients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>
                </div>
            </Card>

            <Card padding="0">
                <Table headers={[
                    'Offer / Project',
                    'Customer',
                    'Total',
                    'Status',
                    'Created / Due',
                    'Actions'
                ]}>
                    {isLoading ? (
                        <tr><td colSpan="6" style={{ padding: '4rem', textAlign: 'center' }}>Loading offers...</td></tr>
                    ) : filteredOffers.length > 0 ? filteredOffers.map(o => (
                        <tr key={o.id}>
                            <td>
                                <Link to={`/offer/preview/${o.id}`} style={{ textDecoration: 'none', color: 'var(--text-main)', fontWeight: 600 }}>
                                    {o.offer_name || <i className="text-muted">Untitled Offer #{o.id}</i>}
                                </Link>
                                {o.project_name && (
                                    <div className="text-xs text-muted mt-1">{o.project_name}</div>
                                )}
                            </td>
                            <td className="text-secondary">{o.customer_name}</td>
                            <td className="font-bold">{formatCurrency(o.total)}</td>
                            <td>
                                <Badge variant={
                                    o.status === 'signed' ? 'success' :
                                        o.status === 'sent' ? 'warning' :
                                            o.status === 'draft' ? 'primary' : 'neutral'
                                }>
                                    {(o.status || 'draft').toUpperCase()}
                                </Badge>
                            </td>
                            <td>
                                <div className="flex flex-column gap-1" style={{ minWidth: '100px' }}>
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm">{formatDateDash(o.created_at)}</span>
                                        {o.due_date && <span className="text-muted" style={{ fontSize: '10px' }}>→</span>}
                                        {o.due_date && <span className="text-sm">{formatDateDash(o.due_date)}</span>}
                                    </div>
                                    {o.due_date && o.status !== 'signed' && o.status !== 'declined' && (
                                        <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                                            <div style={{
                                                width: `${calculateValidityProgress(o.created_at, o.due_date)}%`,
                                                height: '100%',
                                                background: calculateValidityProgress(o.created_at, o.due_date) > 90 ? 'var(--danger)' : 'var(--primary)',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td>
                                <DropdownMenu
                                    actions={[
                                        { label: t('common.view'), onClick: () => navigate(`/offer/preview/${o.id}`) },
                                        { label: t('common.edit'), onClick: () => navigate(`/offer/edit/${o.id}`) },
                                        { label: t('common.send'), onClick: () => handleSend(o.id), disabled: !(o.status === 'draft' || o.status === 'declined') },
                                        ...((o.status === 'sent' || o.status === 'signed' || o.status === 'declined') && o.token ? [{ label: t('common.link'), onClick: () => copyLink(o.token) }] : []),
                                        { label: t('common.delete'), onClick: () => handleDeleteClick(o.id), isDestructive: true }
                                    ]}
                                />
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan="6" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>No offers found.</td></tr>
                    )}
                </Table>
            </Card>

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
