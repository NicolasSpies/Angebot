import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import { useI18n } from '../i18n/I18nContext';

const PublicOfferPage = () => {
    const { id } = useParams();
    const { t } = useI18n();
    const [offer, setOffer] = useState(null);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSigning, setIsSigning] = useState(false);
    const [status, setStatus] = useState(null); // 'signed', 'declined'
    const [comment, setComment] = useState('');
    const [showDeclineForm, setShowDeclineForm] = useState(false);

    const loadData = useCallback(async () => {
        // setIsLoading(true);
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
                <div className="card" style={{ textAlign: 'center', padding: '4rem', border: '2px solid #10b981', background: '#f0fdf4' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
                    <h1 style={{ color: '#064e3b' }}>{t('common.signed_success') || 'Offer Signed Successfully!'}</h1>
                    <p style={{ color: '#065f46' }}>Thank you for your business. We have been notified of your signature.</p>
                </div>
            ) : status === 'declined' ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem', border: '2px solid #ef4444', background: '#fef2f2' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>❌</div>
                    <h1 style={{ color: '#991b1b' }}>Offer Declined</h1>
                    <p style={{ color: '#b91c1c' }}>The offer has been declined. Thank you for your feedback.</p>
                </div>
            ) : (
                <div className="card">
                    {/* Header with Company (Left), Offer (Center), Client (Right) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '2rem' }}>
                        {/* Company Details - Left */}
                        <div style={{ flex: 1 }}>
                            {settings?.logo_url && (
                                <img src={settings.logo_url} alt="Logo" style={{ maxHeight: '60px', marginBottom: '1rem', display: 'block' }} />
                            )}
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>{settings?.company_name}</h2>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {settings?.address && <div>{settings.address}</div>}
                                {settings?.vat_number && <div>VAT: {settings.vat_number}</div>}
                                {settings?.email && <div>Email: {settings.email}</div>}
                                {settings?.phone && <div>Phone: {settings.phone}</div>}
                            </div>
                        </div>

                        {/* Offer Info - Center */}
                        <div style={{ textAlign: 'center', padding: '0 2rem' }}>
                            <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '2rem' }}>OFFER</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 600 }}>#{offer.id}</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                {new Date(offer.created_at).toLocaleDateString()}
                            </p>
                        </div>

                        {/* Client Details - Right */}
                        <div style={{ flex: 1, textAlign: 'right' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bill To</p>
                            <div style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                                <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{offer.customer_name}</div>
                                {(offer.first_name || offer.last_name) && (
                                    <div>{offer.first_name} {offer.last_name}</div>
                                )}
                                {offer.address && <div>{offer.address}</div>}
                                {(offer.postal_code || offer.city) && (
                                    <div>{offer.postal_code} {offer.city}</div>
                                )}
                                {offer.customer_country && <div>{offer.customer_country}</div>}
                                {offer.email && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{offer.email}</div>}
                                {offer.phone && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{offer.phone}</div>}
                            </div>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem 0' }}>Service</th>
                                <th style={{ padding: '0.75rem 0', textAlign: 'center' }}>Qty</th>
                                <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {offer.items.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem 0' }}>
                                        <div style={{ fontWeight: 600 }}>{offer.language === 'de' ? item.name_de : item.name_fr}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{offer.language === 'de' ? item.description_de : item.description_fr}</div>
                                    </td>
                                    <td style={{ padding: '1rem 0', textAlign: 'center' }}>{item.quantity}</td>
                                    <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.total_price)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4rem' }}>
                        <div style={{ width: '300px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>Subtotal</span>
                                <span>{formatCurrency(offer.subtotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span>{offer.customer_country === 'BE' ? 'VAT (21%)' : 'VAT (0%)'}</span>
                                <span>{formatCurrency(offer.vat)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--primary)', fontWeight: 800, fontSize: '1.5rem' }}>
                                <span>Total</span>
                                <span style={{ color: 'var(--primary)' }}>{formatCurrency(offer.total)}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        {!showDeclineForm ? (
                            <>
                                <h3 style={{ marginBottom: '1rem' }}>Digital Signature</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                    By clicking the sign button, you accept this offer legally binding. Alternatively, you can decline the offer.
                                </p>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        className="btn-primary"
                                        style={{ flex: 2, padding: '1rem', fontSize: '1.1rem' }}
                                        onClick={handleSign}
                                        disabled={isSigning}
                                    >
                                        {isSigning ? 'Processing...' : 'Sign and Accept Offer'}
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        style={{ flex: 1, padding: '1rem', fontSize: '1.1rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
                                        onClick={() => setShowDeclineForm(true)}
                                        disabled={isSigning}
                                    >
                                        Decline
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={{ marginBottom: '1rem' }}>Decline Offer</h3>
                                <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    Please let us know why you are declining this offer (optional).
                                </p>
                                <textarea
                                    className="input-field"
                                    style={{ width: '100%', minHeight: '100px', marginBottom: '1.5rem', padding: '0.8rem' }}
                                    placeholder="Your reason..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button
                                        className="btn-primary"
                                        style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }}
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

                    {/* Footer with Company Contact Info */}
                    <div style={{ marginTop: '4rem', borderTop: '2px solid var(--border)', paddingTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                            {settings?.company_name && <span style={{ fontWeight: 600 }}>{settings.company_name}</span>}
                            {settings?.address && <span>{settings.address}</span>}
                            {settings?.email && <span>{settings.email}</span>}
                            {settings?.phone && <span>{settings.phone}</span>}
                            {settings?.website && <span>{settings.website}</span>}
                            {settings?.vat_number && <span>VAT: {settings.vat_number}</span>}
                        </div>
                        {settings?.payment_terms && (
                            <div style={{ textAlign: 'center', marginTop: '1rem', fontStyle: 'italic' }}>
                                {settings.payment_terms}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicOfferPage;
