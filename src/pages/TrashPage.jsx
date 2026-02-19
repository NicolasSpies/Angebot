import React, { useState, useEffect } from 'react';
import { dataService } from '../data/dataService';
import { Trash2, RotateCcw, AlertCircle, FileText, Briefcase, Users, Zap, Box, Clock } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import Table from '../components/ui/Table';
import EmptyState from '../components/common/EmptyState';
import { toast } from 'react-hot-toast';

const TrashPage = () => {
    const [trashItems, setTrashItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    useEffect(() => {
        loadTrash();
    }, []);

    const loadTrash = async () => {
        try {
            setLoading(true);
            const data = await dataService.getTrash();
            setTrashItems(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (type, id) => {
        try {
            await dataService.restoreItem(type, id);
            loadTrash();
        } catch (err) {
            toast.error('Failed to restore item: ' + err.message);
        }
    };

    const handleEmptyTrash = async () => {
        try {
            await dataService.emptyTrash();
            setShowConfirmEmpty(false);
            loadTrash();
        } catch (err) {
            toast.error('Failed to empty trash: ' + err.message);
        }
    };

    const handlePermanentDelete = async () => {
        if (!itemToDelete) return;
        try {
            await dataService.deletePermanentItem(itemToDelete.type, itemToDelete.id);
            setShowConfirmDelete(false);
            setItemToDelete(null);
            loadTrash();
        } catch (err) {
            toast.error('Failed to delete item: ' + err.message);
        }
    };

    const getItemIcon = (type) => {
        switch (type) {
            case 'offers': return <FileText size={16} />;
            case 'projects': return <Briefcase size={16} />;
            case 'customers': return <Users size={16} />;
            case 'services': return <Zap size={16} />;
            case 'packages': return <Box size={16} />;
            case 'reviews': return <FileText size={16} />;
            case 'support': return <Clock size={16} />;
            default: return <Trash2 size={16} />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'offers': return 'Offers';
            case 'projects': return 'Projects';
            case 'customers': return 'Customers';
            case 'services': return 'Services';
            case 'packages': return 'Bundle';
            case 'reviews': return 'Review';
            case 'support': return 'Support';
            default: return type;
        }
    };

    return (
        <div className="page-container fade-in">
            {/* Block 1: Standardized Top Bar */}
            <div className="flex items-center justify-between gap-6 mb-8">
                {/* LEFT: Title Area */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shadow-sm border border-red-100">
                        <Trash2 size={20} />
                    </div>
                    <div>
                        <h2 className="text-[18px] font-black text-[var(--text-main)] tracking-tight leading-none">Archive Recovery</h2>
                        <p className="text-[12px] text-[var(--text-muted)] font-medium mt-1">Permanently purge or recover retired artifacts.</p>
                    </div>
                </div>

                {/* RIGHT: Actions */}
                <div className="flex items-center gap-4">
                    {trashItems.length > 0 && (
                        <Button variant="danger" className="bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md transition-all font-bold rounded-lg px-6 h-10" onClick={() => setShowConfirmEmpty(true)}>
                            <Trash2 size={18} className="mr-2" />
                            Purge All
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-20">
                    <div className="w-10 h-10 border-4 border-[var(--primary-light)] border-t-[var(--primary)] rounded-full animate-spin shadow-sm"></div>
                </div>
            ) : error ? (
                <Card className="p-6 bg-[var(--danger-bg)] border-[var(--danger)]/20 text-[var(--danger)] flex items-center gap-4">
                    <AlertCircle size={24} />
                    <div>
                        <p className="text-[15px] font-black uppercase tracking-wider">Storage Error</p>
                        <p className="text-[14px] font-medium opacity-80">{error}</p>
                    </div>
                </Card>
            ) : trashItems.length === 0 ? (
                <EmptyState
                    icon={Trash2}
                    title="Immaculate Archive"
                    description="Your workspace is currently devoid of discarded artifacts."
                />
            ) : (
                <Table
                    headers={[
                        "Identity / Segment",
                        "Artifact Designation",
                        "Discarded Timestamp",
                        { label: "Stability Actions", className: "text-right" }
                    ]}
                >
                    {trashItems.map((item) => (
                        <tr key={`${item.type}-${item.id}`} className="hover:bg-[var(--bg-app)] transition-colors group border-b border-[var(--border-subtle)] last:border-0 text-left align-middle h-16">
                            <td className="px-6 py-3">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-white border border-[var(--border)] text-[var(--text-muted)] shadow-sm group-hover:text-[var(--primary)] transition-colors">
                                        {getItemIcon(item.type)}
                                    </div>
                                    <Badge variant="neutral" className="!text-[10px] font-black uppercase tracking-[0.1em] px-3">
                                        {getTypeLabel(item.type)}
                                    </Badge>
                                </div>
                            </td>
                            <td className="px-6 py-3 font-bold text-[var(--text-main)] text-[14px]">
                                {item.name}
                            </td>
                            <td className="px-6 py-3 text-[var(--text-muted)] font-medium text-[13px]">
                                {new Date(item.deleted_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => handleRestore(item.type, item.id)}
                                        className="w-10 h-10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--success)] hover:bg-[var(--success-bg)] rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent hover:border-[var(--success)]/20"
                                        title="Restore Artifact"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                    <button
                                        onClick={() => { setItemToDelete(item); setShowConfirmDelete(true); }}
                                        className="w-10 h-10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent hover:border-[var(--danger)]/20"
                                        title="Permanent Purge"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </Table>
            )}

            <ConfirmationDialog
                isOpen={showConfirmEmpty}
                onClose={() => setShowConfirmEmpty(false)}
                onConfirm={handleEmptyTrash}
                title="System-Wide Archive Purge"
                message="This will irrevocably erase every artifact currently in the trash. This action is terminal and cannot be reversed. Proceed with caution."
                confirmText="Purge Workspace Forever"
                isDestructive={true}
            />

            <ConfirmationDialog
                isOpen={showConfirmDelete}
                onClose={() => { setShowConfirmDelete(false); setItemToDelete(null); }}
                onConfirm={handlePermanentDelete}
                title="Permanent Artifact Erasure"
                message={`Are you certain you wish to permanently erase "${itemToDelete?.name}"? This artifact will be removed from the primary database forever.`}
                confirmText="Erase Forever"
                isDestructive={true}
            />
        </div>
    );
};

export default TrashPage;
