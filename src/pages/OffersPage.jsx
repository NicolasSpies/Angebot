import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import { Link, useNavigate } from 'react-router-dom';
import {
    Plus, FileText, Eye, Edit2, Send, Link as LinkIcon, Trash2, ExternalLink,
    LayoutGrid, List
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Skeleton from '../components/ui/Skeleton';
import DropdownMenu from '../components/ui/DropdownMenu';
import Select from '../components/ui/Select';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import { formatDateDot } from '../utils/dateUtils';
import ListPageHeader from '../components/layout/ListPageHeader';
import ListPageToolbar from '../components/layout/ListPageToolbar';
import StatusPill from '../components/ui/StatusPill';
import DueStatusIndicator from '../components/ui/DueStatusIndicator';
import EmptyState from '../components/ui/EmptyState';
import { getStatusColor } from '../utils/statusColors';

const OffersPage = () => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('offersViewMode') || 'list');
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const loadOffers = useCallback(async () => {
        setIsLoading(true);
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
        const result = await dataService.sendOffer(id);
        if (result.token) {
            window.open(`/offer/sign/${result.token}`, '_blank');
        }
        loadOffers();
    };

    const handleUpdateStatus = async (id, newStatus) => {
        setOffers(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
        try {
            await dataService.updateOffer(id, { status: newStatus });
        } catch (error) {
            console.error('Failed to update status', error);
            loadOffers();
        }
    };

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        localStorage.setItem('offersViewMode', mode);
    };

    const copyLink = (token) => {
        const url = `${window.location.origin}/offer/sign/${token}`;
        navigator.clipboard.writeText(url);
        alert('Signature link copied to clipboard!');
    };

    const filteredOffers = offers.filter(offer => {
        const matchesSearch = (offer.offer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (offer.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const STATUS_OPTIONS = [
        { value: 'all', label: 'All', color: 'var(--primary)' },
        { value: 'draft', label: 'Draft', color: '#64748b' },
        { value: 'sent', label: 'Sent', color: '#f59e0b' },
        { value: 'signed', label: 'Signed', color: '#10b981' },
        { value: 'declined', label: 'Declined', color: '#ef4444' }
    ];

    return (
        <div className="page-container fade-in">
            {/* Block 1: Compact Toolbar */}
            <ListPageToolbar
                searchProps={{
                    value: searchTerm,
                    onChange: setSearchTerm,
                    placeholder: "Search by name, customer or project..."
                }}
                filters={
                    <div className="flex flex-wrap bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
                        {STATUS_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setStatusFilter(opt.value)}
                                className={`
                                    flex items-center gap-2 px-4 h-[32px] rounded-lg text-[12px] font-bold transition-all whitespace-nowrap
                                    ${statusFilter === opt.value
                                        ? 'text-white shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-white/50'}
                                `}
                                style={statusFilter === opt.value ? {
                                    backgroundColor: opt.color,
                                } : {}}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                }
                actions={
                    <Button
                        size="sm"
                        onClick={() => navigate('/offer/new')}
                        className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm hover:shadow-md transition-all whitespace-nowrap font-bold rounded-lg px-4 h-9"
                    >
                        <Plus size={16} className="mr-1.5" /> New Offer
                    </Button>
                }
            />

            <div className="h-px bg-[var(--border-subtle)] mb-8" />

            <Table headers={['Offer Name', 'Customer', 'Validity', 'Total Amount', 'Status', 'Actions']}>
                {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                        <tr key={i}>
                            <td className="p-4"><Skeleton style={{ width: '60%', height: 20 }} /></td>
                            <td className="p-4"><Skeleton style={{ width: '40%', height: 20 }} /></td>
                            <td className="p-4"><Skeleton style={{ width: '30%', height: 20 }} /></td>
                            <td className="p-4"><Skeleton style={{ width: '20%', height: 20 }} /></td>
                            <td className="p-4"><Skeleton style={{ width: 80, height: 24, borderRadius: 12 }} /></td>
                            <td className="p-4"><Skeleton style={{ width: 24, height: 24 }} /></td>
                        </tr>
                    ))
                ) : filteredOffers.length === 0 ? (
                    <tr>
                        <td colSpan={6}>
                            <EmptyState
                                icon={FileText}
                                title="No offers found"
                                description="Create a new offer to get started."
                            />
                        </td>
                    </tr>
                ) : (
                    filteredOffers.map(offer => (
                        <tr key={offer.id} className="hover:bg-[var(--bg-app)] transition-colors group border-b border-[var(--border-subtle)] last:border-0 text-left align-middle h-14">
                            <td className="py-3 px-6">
                                <div className="flex flex-col">
                                    <Link to={`/offer/preview/${offer.id}`} className="font-bold text-[14px] text-[var(--text-main)] hover:text-[var(--primary)] transition-colors mb-0.5">
                                        {offer.offer_name || `#${offer.id}`}
                                    </Link>
                                    {offer.project_name && (
                                        <span className="text-[12px] text-[var(--text-muted)] font-medium">
                                            {offer.project_name}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="py-3 px-6 text-[14px] font-medium text-[var(--text-secondary)]">
                                {offer.customer_name || <span className="text-[var(--text-muted)] opacity-50">—</span>}
                            </td>
                            <td className="py-3 px-6">
                                <DueStatusIndicator dueDate={offer.due_date} />
                            </td>
                            <td className="py-3 px-6 text-[14px] font-bold text-[var(--text-main)]">
                                {formatCurrency(offer.total || 0)}
                            </td>
                            <td className="py-3 px-6">
                                <DropdownMenu
                                    trigger={<button className="hover:opacity-80 transition-opacity"><StatusPill status={offer.status} /></button>}
                                    actions={STATUS_OPTIONS.filter(s => s.value !== 'all').map(s => ({
                                        label: s.label,
                                        status: s.value,
                                        onClick: () => handleUpdateStatus(offer.id, s.value)
                                    }))}
                                />
                            </td>
                            <td className="py-3 px-6">
                                <div className="flex justify-end">
                                    <DropdownMenu
                                        actions={[
                                            { label: 'View Offer', onClick: () => navigate(`/offer/preview/${offer.id}`), icon: Eye },
                                            { label: 'Edit Draft', onClick: () => navigate(`/offer/edit/${offer.id}`), icon: Edit2 },
                                            {
                                                label: 'Send to Client',
                                                onClick: () => handleSend(offer.id),
                                                disabled: !(offer.status === 'draft' || offer.status === 'declined') || !offer.customer_id,
                                                icon: Send
                                            },
                                            ...((offer.status === 'sent' || offer.status === 'signed' || offer.status === 'declined') && offer.token ? [
                                                { label: 'Copy Public Link', onClick: () => copyLink(offer.token), icon: LinkIcon },
                                                {
                                                    label: 'Open Signing Page',
                                                    onClick: () => window.open(`/offer/sign/${offer.token}`, '_blank'),
                                                    icon: ExternalLink,
                                                    disabled: ['signed', 'declined'].includes(offer.status),
                                                    title: ['signed', 'declined'].includes(offer.status) ? "Offer is already finalized" : "Open public signing page"
                                                }
                                            ] : []),
                                            { label: 'Delete Offer', onClick: () => handleDeleteClick(offer.id), isDestructive: true, icon: Trash2 }
                                        ]}
                                    />
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </Table>

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
