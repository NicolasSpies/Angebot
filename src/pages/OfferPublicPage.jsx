import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { dataService } from '../data/dataService';
import OfferLayout from '../components/offers/OfferLayout';
import SigningForm from '../components/offers/SigningForm';
import DeclineModal from '../components/offers/DeclineModal';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import Button from '../components/ui/Button';
import { FileText, CheckCircle, Clock, Download, Loader2, XCircle } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

const OfferPublicPage = () => {
    const { token } = useParams();
    // ... (omitting unchanged lines for brevity in thought, but tool needs exact target content)

    const { t } = useI18n();
    const [offer, setOffer] = useState(null);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Signing State
    const [showSignModal, setShowSignModal] = useState(false);
    const [tempSignature, setTempSignature] = useState(null);
    const [apiError, setApiError] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Decline State
    const [showDeclineModal, setShowDeclineModal] = useState(false);
    const [isDeclining, setIsDeclining] = useState(false);

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

    const handleGenerateAndSign = async (signatureData) => {
        if (isGenerating) return;
        setIsGenerating(true);
        setTempSignature(signatureData); // Triggers render of signature in OfferLayout

        try {
            // 1. Convert signature Data URL to File
            const fetchRes = await fetch(signatureData.signatureData);
            const blob = await fetchRes.blob();
            const file = new File([blob], `Signature_${offer.id}.png`, { type: 'image/png' });

            // 2. Upload Signature Image
            const uploadRes = await dataService.uploadFile(file);
            if (!uploadRes.url) throw new Error(uploadRes.error || 'Failed to upload signature');

            // 3. Submit to backend (using signed_pdf_url to store signature URL for now, or just to satisfy the API)
            // The backend likely expects 'pdfUrl' key, so we send the signature URL there.
            // Semantic mismatch but functional for now. Ideally backend should have 'signature_url'.
            // However, the prompt implies "use browser's Save as PDF", so we DON'T generate a PDF.
            // We just store the signature. 

            const response = await dataService.signOffer(token, {
                ...signatureData,
                pdfUrl: uploadRes.url // Storing signature image URL here
            });

            // 4. Update State
            await loadData();
            setShowSignModal(false);
            setTempSignature(null);
            setApiError(null);

            // 5. Trigger Browser Print
            // User needs to see the signed state first.
            setTimeout(() => {
                alert('Offer signed successfully! The print dialog will now open for you to save a PDF copy.');
                window.print();
            }, 500);

        } catch (err) {
            console.error('Signing failed:', err);
            setApiError(err);
            setTempSignature(null);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDecline = async (reason) => {
        if (isDeclining) return;
        setIsDeclining(true);
        try {
            await dataService.declineOffer(token, reason);
            await loadData();
            setShowDeclineModal(false);
        } catch (err) {
            console.error('Decline failed:', err);
            alert('Failed to decline offer. Please try again.');
        } finally {
            setIsDeclining(false);
        }
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-screen text-[var(--text-muted)] font-medium">Loading proposal...</div>;
    if (error) return <div className="flex items-center justify-center min-h-screen text-[var(--danger)] font-bold">{error}</div>;
    if (!offer) return null;

    return (
        <div className="min-h-screen bg-[var(--bg-app)] py-12 px-4 print:bg-white print:p-0">
            {/* Header Actions */}
            <div className="max-w-[1000px] mx-auto mb-8 flex justify-between items-center no-print flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    {offer.status === 'signed' && (
                        <div className="px-4 py-2 bg-[var(--success-bg)] text-[var(--success-text)] rounded-[var(--radius-md)] flex items-center gap-2 font-bold border border-[var(--success)]/20 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <CheckCircle size={18} />
                            Offer Signed on {new Date(offer.signed_at || offer.updated_at).toLocaleDateString()}
                        </div>
                    )}
                    {offer.status === 'declined' && (
                        <div className="px-4 py-2 bg-red-100 text-red-700 rounded-[var(--radius-md)] flex items-center gap-2 font-bold border border-red-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <XCircle size={18} />
                            Offer Declined on {new Date(offer.declined_at || offer.updated_at).toLocaleDateString()}
                        </div>
                    )}
                    {offer.status === 'sent' && (
                        <div className="px-4 py-2 bg-[var(--warning-bg)] text-[var(--warning-text)] rounded-[var(--radius-md)] flex items-center gap-2 font-bold border border-[var(--warning)]/20 shadow-sm">
                            <Clock size={18} />
                            Awaiting Response
                        </div>
                    )}
                </div>

                <div className="flex gap-3 flex-wrap">


                    <Button
                        size="lg"
                        className="shadow-sm bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] border-[var(--primary)] hover:border-[var(--primary-dark)]"
                        onClick={() => window.print()}
                    >
                        <Download size={18} className="mr-2" /> Download Signed PDF
                    </Button>

                    {(offer.status === 'sent' || offer.status === 'draft') && (
                        <>
                            <Button
                                size="lg"
                                className="shadow-sm bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-6"
                                onClick={() => setShowDeclineModal(true)}
                                disabled={isGenerating || isDeclining}
                            >
                                Decline Offer
                            </Button>
                            <Button
                                size="lg"
                                className="shadow-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] px-8"
                                onClick={() => setShowSignModal(true)}
                                disabled={isGenerating || isDeclining}
                            >
                                {isGenerating ? <Loader2 size={18} className="mr-2 animate-spin" /> : <CheckCircle size={18} className="mr-2" />}
                                {isGenerating ? 'Processing...' : 'Sign Offer'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Offer Content */}
            <div
                id="offer-content"
                className="max-w-[1000px] mx-auto bg-white rounded-[var(--radius-lg)] shadow-lg overflow-hidden print:shadow-none print:rounded-none"
            >
                <ErrorBoundary key={offer?.id}>
                    <OfferLayout
                        offer={offer}
                        settings={settings}
                        hideInternal={true}
                        tempSignature={tempSignature}
                    />
                </ErrorBoundary>
            </div>

            {/* Simple Footer */}
            <div className="max-w-[1000px] mx-auto mt-12 text-center text-[var(--text-muted)] text-sm no-print pb-8 font-medium">
                Powered by {settings?.company_name || 'Business Catalyst'}
            </div>

            {/* Signing Modal */}
            {showSignModal && (
                <SigningForm
                    onCancel={() => setShowSignModal(false)}
                    onConfirm={handleGenerateAndSign}
                    isSubmitting={isGenerating}
                />
            )}

            {/* Decline Modal */}
            {showDeclineModal && (
                <DeclineModal
                    onCancel={() => setShowDeclineModal(false)}
                    onConfirm={handleDecline}
                    isSubmitting={isDeclining}
                />
            )}
            {/* Dev Debug Overlay */}
            <DevDebug offer={offer} token={token} error={apiError} />
        </div>
    );
};

const DevDebug = ({ offer, token, error }) => {
    if (!import.meta.env.DEV) return null;
    return (
        <div className="fixed bottom-4 left-4 p-4 bg-black/80 text-white text-xs rounded-lg shadow-xl z-50 font-mono w-96 pointer-events-none opacity-75 hover:opacity-100 transition-opacity no-print">
            <h3 className="font-bold border-b border-gray-600 pb-1 mb-2 text-green-400">DEV DEBUG INSPECTOR</h3>
            <div className="space-y-1">
                <p><span className="text-gray-400">Token:</span> <span className="text-blue-300">{token}</span></p>
                <p><span className="text-gray-400">Offer ID:</span> {offer?.id} ({offer?.offer_name})</p>
                <p><span className="text-gray-400">Status:</span>
                    <span className={['signed', 'accepted'].includes(offer?.status) ? 'text-green-400 ml-1' : 'text-yellow-400 ml-1'}>{offer?.status?.toUpperCase()}</span>
                </p>
                <p><span className="text-gray-400">Cust ID:</span> {offer?.customer_id}</p>
                {error && (
                    <div className="mt-2 pt-2 border-t border-red-900 bg-red-900/20 p-2 rounded">
                        <p className="text-red-400 font-bold">API ERROR:</p>
                        <p className="break-all">{error.message || JSON.stringify(error)}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OfferPublicPage;
