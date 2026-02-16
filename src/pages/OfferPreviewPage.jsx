import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { useI18n } from '../i18n/I18nContext';
import OfferLayout from '../components/offers/OfferLayout';
import { AlertTriangle, ChevronLeft, Pencil, FileText } from 'lucide-react';
import Button from '../components/ui/Button';
import DeadlineIndicator from '../components/ui/DeadlineIndicator';
import AttachmentSection from '../components/common/AttachmentSection';

const OfferPreviewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();
    const [offer, setOffer] = useState(null);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        const [oData, sData] = await Promise.all([
            dataService.getOffer(id),
            dataService.getSettings()
        ]);
        setOffer(oData);
        setSettings(sData);
        setIsLoading(false);
    }, [id]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [loadData]);

    if (isLoading) return <div className="page-container">Loading preview...</div>;
    if (!offer) return <div className="page-container">Offer not found.</div>;

    return (
        <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {!offer.customer_id && (
                <div className="mb-8 p-6 rounded-[var(--radius-lg)] bg-[var(--danger-bg)] border border-[var(--danger)]/20 flex justify-between items-center shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white text-[var(--danger)] flex items-center justify-center shadow-sm">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="font-extrabold text-[var(--text-main)] text-[15px]">Identity Synchronization Missing</p>
                            <p className="text-[13px] text-[var(--text-secondary)] font-medium">This proposal is currently unassigned. Please link a customer to enable signing and project generation.</p>
                        </div>
                    </div>
                    <Button
                        variant="primary"
                        className="bg-[var(--danger)] hover:bg-[var(--danger)]/90 shadow-md font-bold px-6"
                        onClick={() => navigate(`/offer/edit/${offer.id}`)}
                    >
                        Define Recipient
                    </Button>
                </div>
            )}

            <div className="no-print mb-8 flex justify-between items-center pb-6 border-b border-[var(--border)]">
                <Button variant="ghost" className="font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]" onClick={() => navigate('/offers')}>
                    <ChevronLeft size={18} className="mr-2" /> Back to Proposals
                </Button>
                <div className="flex gap-3">
                    <Button variant="ghost" className="font-bold text-[var(--primary)] hover:bg-[var(--primary-light)]" onClick={() => navigate(`/offer/edit/${offer.id}`)}>
                        <Pencil size={18} className="mr-2" /> Modify Proposal
                    </Button>
                    <Button size="lg" className="shadow-lg px-8" onClick={() => window.print()}>
                        <Download size={18} className="mr-2" /> Download Signed PDF
                    </Button>
                    <Button
                        size="lg"
                        variant="secondary"
                        className="shadow-sm border-[var(--border)] bg-gray-50 hover:bg-gray-100 text-[var(--text-main)]"
                        disabled={['signed', 'declined'].includes(offer.status)}
                        title={['signed', 'declined'].includes(offer.status) ? "Offer is already finalized" : "Open public signing page"}
                        onClick={() => window.open(`/offer/sign/${offer.token}`, '_blank')}
                    >
                        <FileText size={18} className="mr-2" /> Open Signing Link
                    </Button>
                </div>
            </div>

            {offer.due_date && (
                <div className="mb-6 no-print">
                    <DeadlineIndicator dueDate={offer.due_date} createdAt={offer.sent_at || offer.created_at} />
                </div>
            )}

            <div className="premium-document-shadow rounded-[var(--radius-lg)] overflow-hidden">
                <OfferLayout offer={offer} settings={settings} />
            </div>

            <div className="mt-10 no-print">
                <AttachmentSection entityType="offers" entityId={id} />
            </div>
        </div>
    );
};

export default OfferPreviewPage;
