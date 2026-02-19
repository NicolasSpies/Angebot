import React, { useState, useEffect, useCallback } from 'react';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import { Link, useNavigate } from 'react-router-dom';
import {
    Search, Plus, FileText, Eye, Edit2, Send, Link as LinkIcon, Trash2, ExternalLink
} from 'lucide-react';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Skeleton from '../components/ui/Skeleton';
import DropdownMenu from '../components/ui/DropdownMenu';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import StatusPill from '../components/ui/StatusPill';
import DueStatusIndicator from '../components/ui/DueStatusIndicator';
import EmptyState from '../components/ui/EmptyState';
import { toast } from 'react-hot-toast';
import { getStatusColor } from '../utils/statusColors';

const OffersPage = () => {
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const loadOffers = useCallback(async () => {
        if (offers.length === 0) setIsLoading(true);
        const data = await dataService.getOffers();
        setOffers(data);
        setIsLoading(false);
    }, [offers.length]);

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
            await dataService.updateOfferStatus(id, newStatus);
        } catch (error) {
            console.error('Failed to update status', error);
            loadOffers();
        }
    };

    const copyLink = (token) => {
        const url = `${window.location.origin}/offer/sign/${token}`;
        navigator.clipboard.writeText(url);
        toast.success('Signature link copied to clipboard!');
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

            {/* Block 1: Standardized Top Bar */}
            <div className="flex items-center justify-between gap-6 mb-6">
                {/* LEFT: Segmented filter pills */}
                <div className="flex bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
                    {STATUS_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setStatusFilter(opt.value)}
                            className={`
                                flex items-center gap-2 px-4 h-8 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap
                                ${statusFilter === opt.value
                                    ? 'text-white shadow-sm'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-white/50'}
                            `}
                            style={statusFilter === opt.value ? {
                                backgroundColor: opt.value === 'all' ? 'var(--primary)' : getStatusColor(opt.value).dot,
                            } : {}}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* RIGHT: Search + New Offer */}
                <div className="flex items-center gap-4 flex-1 justify-end max-w-2xl">
                    <div className="relative flex-1 max-w-xs">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search offers..."
                            className="w-full h-9 pl-9 pr-4 bg-[var(--bg-subtle)] border border-[var(--border-subtle)] rounded-xl text-[13px] font-medium outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all"
                        />
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    </div>

                    <Button
                        size="sm"
                        onClick={() => navigate('/offer/new')}
                        className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm hover:shadow-md transition-all whitespace-nowrap font-bold rounded-lg px-4 h-9"
                    >
                        <Plus size={16} className="mr-1.5" /> New Offer
                    </Button>
                </div>
            </div>


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
                        <tr key={offer.id} className="hover:bg-[var(--bg-app)] transition-colors group border-b border-[var(--border-subtle)] last:border-0 text-left align-middle h-16 cursor-pointer" onClick={() => navigate(`/offer/preview/${offer.id}`)}>
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
                            <td className="py-3 px-6" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu
                                    trigger={<button className="hover:opacity-80 transition-opacity"><StatusPill status={offer.status} /></button>}
                                    actions={STATUS_OPTIONS.filter(s => s.value !== 'all').map(s => ({
                                        label: s.label,
                                        status: s.value,
                                        onClick: () => handleUpdateStatus(offer.id, s.value)
                                    }))}
                                />
                            </td>
                            <td className="py-3 px-6" onClick={(e) => e.stopPropagation()}>
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
                                            {
                                                label: offer.status === 'signed' ? 'Cannot Trash Signed' : 'Move to Trash',
                                                onClick: () => handleDeleteClick(offer.id),
                                                isDestructive: true,
                                                icon: Trash2,
                                                disabled: offer.status === 'signed',
                                                title: offer.status === 'signed' ? 'Signed offers cannot be moved to trash' : 'Move to trash'
                                            }
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
                title="Move to Trash"
                message="Are you sure you want to move this offer to the trash? You can recover it later from the Archive Recovery page."
                confirmText="Move to Trash"
                isDestructive={true}
            />
        </div>
    );
};

export default OffersPage;
