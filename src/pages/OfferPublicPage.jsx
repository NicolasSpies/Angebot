import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { dataService } from '../data/dataService';
import OfferLayout from '../components/offers/OfferLayout';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import Button from '../components/ui/Button';
import { FileText, CheckCircle, Clock } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

const OfferPublicPage = () => {
    const { token } = useParams();
    const { t } = useI18n();
    const [offer, setOffer] = useState(null);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const [oData, sData] = await Promise.all([
                dataService.getOfferByToken(token),
                dataService.getSettings()
            ]);
            if (oData.error) throw new Error(oData.error);
            setOffer(oData);
            setSettings(sData);
        } catch (err) {
            setError(err.message || 'Failed to load offer');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSign = async () => {
        if (!confirm("Are you sure you want to sign this offer? This action is binding.")) return;
        try {
            await dataService.signOffer(token);
            loadData(); // Reload to show signed status
        } catch (err) {
            alert('Failed to sign offer');
        }
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-screen text-[var(--text-muted)] font-medium">Loading proposal...</div>;
    if (error) return <div className="flex items-center justify-center min-h-screen text-[var(--danger)] font-bold">{error}</div>;
    if (!offer) return null;

    return (
        <div className="min-h-screen bg-[var(--bg-app)] py-12 px-4 print:bg-white print:p-0">
            {/* Header Actions */}
            <div className="max-w-[1000px] mx-auto mb-8 flex justify-between items-center no-print">
                <div className="flex items-center gap-4">
                    {offer.status === 'signed' && (
                        <div className="px-4 py-2 bg-[var(--success-bg)] text-[var(--success-text)] rounded-[var(--radius-md)] flex items-center gap-2 font-bold border border-[var(--success)]/20 shadow-sm">
                            <CheckCircle size={18} />
                            Offer Signed on {new Date(offer.updated_at).toLocaleDateString()}
                        </div>
                    )}
                    {offer.status === 'sent' && (
                        <div className="px-4 py-2 bg-[var(--warning-bg)] text-[var(--warning-text)] rounded-[var(--radius-md)] flex items-center gap-2 font-bold border border-[var(--warning)]/20 shadow-sm">
                            <Clock size={18} />
                            Awaiting Signature
                        </div>
                    )}
                </div>
                <div className="flex gap-3">
                    <Button
                        size="lg"
                        variant="ghost"
                        className="shadow-sm bg-white border-[var(--border)] hover:bg-[var(--bg-main)]"
                        onClick={() => window.print()}
                    >
                        <FileText size={18} className="mr-2" /> Export PDF
                    </Button>
                    {(offer.status === 'sent' || offer.status === 'draft') && (
                        <Button
                            size="lg"
                            className="shadow-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] px-8"
                            onClick={handleSign}
                        >
                            <CheckCircle size={18} className="mr-2" /> Sign Offer
                        </Button>
                    )}
                </div>
            </div>

            {/* Offer Content */}
            <div className="max-w-[1000px] mx-auto bg-white rounded-[var(--radius-lg)] shadow-lg overflow-hidden print:shadow-none print:rounded-none">
                <ErrorBoundary key={offer?.id}>
                    <OfferLayout offer={offer} settings={settings} hideInternal={true} />
                </ErrorBoundary>
            </div>

            {/* Simple Footer */}
            <div className="max-w-[1000px] mx-auto mt-12 text-center text-[var(--text-muted)] text-sm no-print pb-8 font-medium">
                Powered by {settings?.company_name || 'Business Catalyst'}
            </div>
        </div>
    );
};

export default OfferPublicPage;
