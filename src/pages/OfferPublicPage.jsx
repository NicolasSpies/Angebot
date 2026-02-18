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
import DeadlineIndicator from '../components/ui/DeadlineIndicator';
import { formatDate } from '../utils/dateUtils';
import { toast } from 'react-hot-toast';

const OfferPublicPage = () => {
    const { token } = useParams();
    // ... (omitting unchanged lines for brevity in thought, but tool needs exact target content)

    const { t, setLocale } = useI18n();
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
            if (oData.language) {
                setLocale(oData.language);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load offer');
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
                pdfUrl: uploadRes.url, // Storing signature image URL here
                items: offer.items // Passing selected items to persist selections
            });

            // 4. Update State
            await loadData();
            setShowSignModal(false);
            setTempSignature(null);
            setApiError(null);

            // 5. Success state handled by re-rendering with signed status

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
            toast.error('Failed to decline offer. Please try again.');
        } finally {
            setIsDeclining(false);
        }
    };

    const handleSelectItem = (itemId, groupId) => {
        if (!offer || offer.status !== 'sent') return;

        setOffer(prev => ({
            ...prev,
            items: prev.items.map(item => {
                if (item.group_id === groupId) {
                    return { ...item, is_selected: item.id === itemId ? 1 : 0 };
                }
                return item;
            })
        }));
    };

    const areAllVariantsSelected = () => {
        if (!offer || !offer.items) return true;

        const groups = {};
        offer.items.forEach(item => {
            if (item.group_id) {
                if (!groups[item.group_id]) groups[item.group_id] = [];
                groups[item.group_id].push(item);
            }
        });

        return Object.values(groups).every(groupItems =>
            groupItems.some(item => item.is_selected === 1 || item.is_selected === true)
        );
    };

    const allSelected = areAllVariantsSelected();
    const lang = offer?.language || 'de';

    if (isLoading) return <div className="flex items-center justify-center min-h-screen text-[var(--text-muted)] font-medium">{t('public_offer.loading')}</div>;
    if (error) return <div className="flex items-center justify-center min-h-screen text-[var(--danger)] font-bold">{error}</div>;
    if (!offer) return null;

    return (
        <div className="min-h-screen bg-[var(--bg-app)] py-12 px-4 public-page">
            {/* Header Actions */}
            <div className="max-w-[1000px] mx-auto mb-8 flex justify-between items-center no-print flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    {offer.status === 'signed' && (
                        <div className="px-4 py-2 bg-[var(--success-bg)] text-[var(--success-text)] rounded-[var(--radius-md)] flex items-center gap-2 font-bold border border-[var(--success)]/20 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <CheckCircle size={18} />
                            {t('public_offer.signed_on')} {formatDate(offer.signed_at || offer.updated_at)}
                        </div>
                    )}
                    {offer.status === 'declined' && (
                        <div className="px-4 py-2 bg-red-100 text-red-700 rounded-[var(--radius-md)] flex items-center gap-2 font-bold border border-red-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <XCircle size={18} />
                            {t('public_offer.declined_on')} {formatDate(offer.declined_at || offer.updated_at)}
                        </div>
                    )}
                    {offer.status === 'sent' && (
                        <div className="px-4 py-2 bg-[var(--warning-bg)] text-[var(--warning-text)] rounded-[var(--radius-md)] flex items-center gap-2 font-bold border border-[var(--warning)]/20 shadow-sm">
                            <Clock size={18} />
                            {t('public_offer.awaiting_response')}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 flex-wrap">


                    <Button
                        size="lg"
                        className="shadow-sm bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] border-[var(--primary)] hover:border-[var(--primary-dark)]"
                        onClick={() => {
                            window.location.href = `/api/offers/${offer.id}/signed-pdf`;
                        }}
                    >
                        <Download size={18} className="mr-2" /> {t('public_offer.download_pdf')}
                    </Button>

                    {(offer.status === 'sent' || offer.status === 'draft') && (
                        <>
                            <Button
                                size="lg"
                                className="shadow-sm bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-6"
                                onClick={() => setShowDeclineModal(true)}
                                disabled={isGenerating || isDeclining}
                            >
                                {t('public_offer.decline_btn')}
                            </Button>
                            <Button
                                size="lg"
                                className={`shadow-lg px-8 transition-all duration-300 ${allSelected ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'}`}
                                onClick={() => allSelected && setShowSignModal(true)}
                                disabled={isGenerating || isDeclining || !allSelected}
                            >
                                {isGenerating ? <Loader2 size={18} className="mr-2 animate-spin" /> : <CheckCircle size={18} className="mr-2" />}
                                {isGenerating ? t('public_offer.processing') : (allSelected ? t('public_offer.sign_btn') : (lang === 'de' ? 'Variante wählen' : 'Choisir une variante'))}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {offer.due_date && (
                <div className="max-w-[1000px] mx-auto mb-6 no-print">
                    <DeadlineIndicator dueDate={offer.due_date} createdAt={offer.sent_at || offer.created_at} />
                </div>
            )}

            {/* Offer Content */}
            <div
                id="offer-content"
                className="max-w-[1000px] mx-auto bg-white rounded-[var(--radius-lg)] shadow-lg overflow-hidden"
            >
                <ErrorBoundary key={offer?.id}>
                    <OfferLayout
                        offer={offer}
                        settings={settings}
                        hideInternal={true}
                        tempSignature={tempSignature}
                        onSelectItem={handleSelectItem}
                    />
                </ErrorBoundary>
            </div>

            {/* Simple Footer */}
            <div className="max-w-[1000px] mx-auto mt-12 text-center text-[var(--text-muted)] text-sm no-print pb-8 font-medium">
                {t('public_offer.powered_by')} {settings?.company_name || 'Business Catalyst'}
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

            {/* Success Toast / Notification */}
            {offer.status === 'signed' && !showSignModal && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[var(--success)] text-white px-6 py-3 rounded-full shadow-floating z-50 animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2 no-print">
                    <CheckCircle size={20} />
                    <span className="font-bold">{t('public_offer.success_msg')}</span>
                </div>
            )}

            {/* Error Notification */}
            {apiError && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[var(--danger)] text-white px-6 py-3 rounded-full shadow-floating z-50 animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2 no-print">
                    <XCircle size={20} />
                    <span className="font-bold">{t('public_offer.signing_failed')} {apiError.message || 'Unknown error'}</span>
                    <button onClick={() => setApiError(null)} className="ml-2 hover:bg-white/20 rounded-full p-1"><XCircle size={14} /></button>
                </div>
            )}
        </div>
    );
};

export default OfferPublicPage;
