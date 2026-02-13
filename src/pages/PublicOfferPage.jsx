import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { useI18n } from '../i18n/I18nContext';
import OfferLayout from '../components/offers/OfferLayout';

const PublicOfferPage = () => {
    const { id } = useParams();
    const { t } = useI18n();
    const [offer, setOffer] = useState(null);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSigning, setIsSigning] = useState(false);
    const [status, setStatus] = useState(null);
    const [comment, setComment] = useState('');
    const [showDeclineForm, setShowDeclineForm] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [oData, sData] = await Promise.all([
                dataService.getOfferByToken(id),
                dataService.getSettings()
            ]);
            setOffer(oData);
            setSettings(sData);
            if (oData.status === 'signed') setStatus('signed');
            if (oData.status === 'declined') setStatus('declined');
        } catch (err) {
            console.error(err);
        }
        setIsLoading(false);
    }, [id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSign = async () => {
        setIsSigning(true);
        try {
            await dataService.signOffer(id);
            setStatus('signed');
        } catch (err) {
            console.error(err);
        }
        setIsSigning(false);
    };

    const handleDecline = async () => {
        setIsSigning(true);
        try {
            await dataService.declineOffer(id, comment);
            setStatus('declined');
        } catch (err) {
            console.error(err);
        }
        setIsSigning(false);
    };

    if (isLoading) return <div className="page-container">Loading offer...</div>;
    if (!offer) return <div className="page-container">Offer not found.</div>;

    return (
        <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
            {status === 'signed' ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem', border: '1px solid #10b981', background: '#f0fdf4' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <h1 style={{ color: '#064e3b', fontWeight: 600, fontSize: '1.5rem' }}>{t('common.signed_success') || 'Offer Signed Successfully!'}</h1>
                    <p style={{ color: '#065f46', marginTop: '0.5rem' }}>Thank you for your business. We have been notified of your signature.</p>
                </div>
            ) : status === 'declined' ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem', border: '1px solid #ef4444', background: '#fef2f2' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                    <h1 style={{ color: '#991b1b', fontWeight: 600, fontSize: '1.5rem' }}>Offer Declined</h1>
                    <p style={{ color: '#b91c1c', marginTop: '0.5rem' }}>The offer has been declined. Thank you for your feedback.</p>
                </div>
            ) : (
                <div>
                    <OfferLayout offer={offer} settings={settings} />

                    {/* Sign / Decline Section */}
                    <div className="card" style={{ marginTop: '2rem' }}>
                        {!showDeclineForm ? (
                            <>
                                <h3 style={{ marginBottom: '0.75rem', fontWeight: 600 }}>Digital Signature</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                                    By clicking the sign button, you accept this offer legally binding. Alternatively, you can decline the offer.
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        className="btn-primary"
                                        style={{ flex: 2 }}
                                        onClick={handleSign}
                                        disabled={isSigning}
                                    >
                                        {isSigning ? 'Processing...' : 'Sign and Accept Offer'}
                                    </button>
                                    <button
                                        className="btn-danger"
                                        style={{ flex: 1, padding: '0.75rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
                                        onClick={() => setShowDeclineForm(true)}
                                        disabled={isSigning}
                                    >
                                        Decline
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={{ marginBottom: '0.75rem', fontWeight: 600 }}>Decline Offer</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                    Please let us know why you are declining this offer (optional).
                                </p>
                                <textarea
                                    style={{ width: '100%', minHeight: '80px', marginBottom: '1rem' }}
                                    placeholder="Your reason..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        className="btn-danger"
                                        style={{ flex: 1 }}
                                        onClick={handleDecline}
                                        disabled={isSigning}
                                    >
                                        {isSigning ? 'Processing...' : 'Confirm Decline'}
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        style={{ flex: 1 }}
                                        onClick={() => setShowDeclineForm(false)}
                                        disabled={isSigning}
                                    >
                                        Back
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicOfferPage;
