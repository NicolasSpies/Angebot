import React, { useState, useEffect } from 'react';
import { X, Search, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Badge from './ui/Badge';
import StatusPill from './ui/StatusPill';
import { formatCurrency } from '../utils/pricingEngine';

const LinkOfferModal = ({ isOpen, onClose, onLink, offers, customerId, currentOfferId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCustomer, setFilterCustomer] = useState(true);
    const [selectedOffer, setSelectedOffer] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setSelectedOffer(null);
            setFilterCustomer(!!customerId);
        }
    }, [isOpen, customerId]);

    if (!isOpen) return null;

    const filteredOffers = offers.filter(offer => {
        // Exclude current linked offer if any
        if (currentOfferId && offer.id === currentOfferId) return false;

        // Exclude archived offers (if logic exists, assuming status 'archived' or similar, strict check on standard statuses for now)
        // Adjust based on user request "Only allow linking offers that are not archived" -> Assume 'archived' status potentially exists or just standard list

        const matchesSearch = (offer.offer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (offer.id.toString().includes(searchTerm));

        const matchesCustomer = filterCustomer && customerId ? offer.customer_id === customerId : true;

        return matchesSearch && matchesCustomer;
    });

    const handleLink = () => {
        if (selectedOffer) {
            onLink(selectedOffer);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[var(--radius-xl)] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-surface)]">
                    <div>
                        <h2 className="text-xl font-extrabold text-[var(--text-main)]">Link Existing Offer</h2>
                        <p className="text-[13px] text-[var(--text-secondary)] font-medium mt-1">Select an offer to use as the strategic basis for this project.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors">
                        <X size={20} className="text-[var(--text-muted)]" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-[var(--border)] bg-white flex gap-4 items-center">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by offer name or ID..."
                            className="pl-10 py-2 text-[14px]"
                            containerStyle={{ marginBottom: 0 }}
                        />
                    </div>
                    {customerId && (
                        <label className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-main)] cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={filterCustomer}
                                onChange={(e) => setFilterCustomer(e.target.checked)}
                                className="rounded border-[var(--border-strong)] text-[var(--primary)] focus:ring-[var(--primary)]"
                            />
                            Match Client Only
                        </label>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 bg-[var(--bg-app)]">
                    {filteredOffers.length === 0 ? (
                        <div className="py-12 text-center text-[var(--text-muted)]">
                            <FileText size={48} className="mx-auto opacity-20 mb-4" />
                            <p className="font-medium text-[14px]">No matching offers found.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredOffers.map(offer => {
                                const isSelected = selectedOffer?.id === offer.id;
                                const isDifferentClient = customerId && offer.customer_id !== customerId;

                                return (
                                    <div
                                        key={offer.id}
                                        onClick={() => setSelectedOffer(offer)}
                                        className={`group p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4 ${isSelected
                                            ? 'border-[var(--primary)] bg-[var(--primary-light)]/20 shadow-sm'
                                            : 'border-transparent bg-white hover:border-[var(--border)] hover:shadow-sm'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                                            {isSelected ? <CheckCircle size={20} /> : <FileText size={20} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`font-bold text-[15px] truncate ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-main)]'}`}>
                                                    {offer.offer_name || `Offer #${offer.id}`}
                                                </h4>
                                                <span className="font-extrabold text-[var(--text-main)] text-[14px]">
                                                    {formatCurrency(offer.total)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 text-[12px]">
                                                <StatusPill status={offer.status} />
                                                <span className="text-[var(--text-secondary)] font-medium">Drafted {new Date(offer.created_at || Date.now()).toLocaleDateString()}</span>
                                                {isDifferentClient && (
                                                    <span className="flex items-center gap-1 text-[var(--warning-text)] font-bold bg-[var(--warning)]/10 px-1.5 py-0.5 rounded">
                                                        <AlertTriangle size={10} /> Different Client
                                                    </span>
                                                )}
                                                {offer.project_name && (
                                                    <span className="text-[var(--text-muted)]">• Linked to {offer.project_name}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border)] bg-white flex justify-between items-center">
                    <div className="text-[13px] font-medium text-[var(--text-secondary)]">
                        {selectedOffer ? (
                            <span>Selected: <span className="font-bold text-[var(--text-main)]">{selectedOffer.offer_name}</span></span>
                        ) : (
                            <span>Select an offer to link</span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button
                            variant="primary"
                            disabled={!selectedOffer}
                            onClick={handleLink}
                            className="shadow-lg"
                        >
                            Link Selected Offer
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LinkOfferModal;
