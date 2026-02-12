import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import { useI18n } from '../i18n/I18nContext';

const OfferPreviewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();
    const [offer, setOffer] = useState(null);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        // setIsLoading(true);
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
        <div className="page-container preview-page">
            <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn-secondary" onClick={() => navigate('/offers')}>← {t('common.back')}</button>
                <button className="btn-primary" onClick={() => window.print()}>{t('common.print')} / PDF</button>
            </div>

            <div className="a4-container card">
                {/* Header with Company (Left) and Client (Right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', borderBottom: '2px solid var(--border)', paddingBottom: '2rem' }}>
                    {/* Company Details - Left */}
                    <div style={{ flex: 1 }}>
                        {settings?.logo_url && (
                            <img src={settings.logo_url} alt="Logo" style={{ maxHeight: '60px', marginBottom: '1rem', display: 'block' }} />
                        )}
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary)' }}>{settings?.company_name || 'My Agency'}</h2>
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
                            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{offer.customer_name || 'Client'}</div>
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

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '0.75rem 0', fontWeight: 600 }}>Service</th>
                            <th style={{ padding: '0.75rem 0', fontWeight: 600, textAlign: 'center' }}>Qty</th>
                            <th style={{ padding: '0.75rem 0', fontWeight: 600, textAlign: 'right' }}>Unit Price</th>
                            <th style={{ padding: '0.75rem 0', fontWeight: 600, textAlign: 'right' }}>Total</th>
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
                                <td style={{ padding: '1rem 0', textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.total_price)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>Subtotal</span>
                            <span>{formatCurrency(offer.subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span>{offer.customer_country === 'BE' ? 'VAT (21%)' : 'VAT (0%)'}</span>
                            <span>{formatCurrency(offer.vat)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--primary)', fontWeight: 800, fontSize: '1.25rem' }}>
                            <span>Total</span>
                            <span style={{ color: 'var(--primary)' }}>{formatCurrency(offer.total)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer with Company Contact Info */}
                <div style={{ marginTop: '5rem', borderTop: '2px solid var(--border)', paddingTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
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
        </div>
    );
};

export default OfferPreviewPage;
