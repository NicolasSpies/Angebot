import React from 'react';
import { formatCurrency } from '../../utils/pricingEngine';
import DeadlineIndicator from '../ui/DeadlineIndicator';

const cycleTitles = {
    one_time: { de: 'Einmalige Kosten', fr: 'Frais uniques' },
    yearly: { de: 'Jährliche Kosten', fr: 'Frais annuels' },
    monthly: { de: 'Monatliche Kosten', fr: 'Frais mensuels' }
};

const OfferLayout = ({ offer, settings }) => {
    // Group items by billing cycle
    const groups = { one_time: [], yearly: [], monthly: [] };
    offer.items.forEach(item => {
        const cycle = item.billing_cycle || 'one_time';
        if (!groups[cycle]) groups[cycle] = [];
        groups[cycle].push(item);
    });

    const calculateGroupTotals = (items) => {
        const subtotal = items.reduce((acc, i) => acc + (i.unit_price * i.quantity), 0);
        const discountAmount = subtotal * ((offer.discount_percent || 0) / 100);
        const discountedSubtotal = subtotal - discountAmount;
        const vatRate = offer.customer_country === 'BE' ? 0.21 : 0.0;
        const vat = discountedSubtotal * vatRate;
        const total = discountedSubtotal + vat;
        return { subtotal, vat, total };
    };

    const lang = offer.language || 'de';

    return (
        <div className="a4-container card">
            {/* Header: Company (Left) | Offer (Center) | Client (Right) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', borderBottom: '1px solid var(--border)', paddingBottom: '2rem' }}>
                {/* Company Details */}
                <div style={{ flex: 1 }}>
                    {settings?.logo_url && (
                        <img src={settings.logo_url} alt="Logo" style={{ maxHeight: '60px', marginBottom: '1rem', display: 'block' }} />
                    )}
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>{settings?.company_name || 'My Agency'}</h2>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                        {settings?.address && <div style={{ whiteSpace: 'pre-wrap' }}>{settings.address}</div>}
                        {settings?.vat_number && <div>{lang === 'de' ? 'MwSt' : 'TVA'}: {settings.vat_number}</div>}
                        {settings?.email && <div>Email: <a href={`mailto:${settings.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>{settings.email}</a></div>}
                        {settings?.phone && <div>Phone: <a href={`tel:${settings.phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{settings.phone}</a></div>}
                        {settings?.website && (
                            <div>Website: <a href={settings.website.startsWith('http') ? settings.website : `https://${settings.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{settings.website}</a></div>
                        )}
                    </div>
                </div>

                {/* Offer Info */}
                <div style={{ textAlign: 'center', padding: '0 2rem' }}>
                    <h1 style={{ color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                        {lang === 'de' ? 'ANGEBOT' : 'OFFRE'}
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>
                        {offer.offer_name || `#${offer.id}`}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {new Date(offer.created_at).toLocaleDateString()}
                    </p>

                    {offer.due_date && (
                        <div style={{ marginTop: '1rem', maxWidth: '280px', margin: '1rem auto 0' }}>
                            <DeadlineIndicator dueDate={offer.due_date} createdAt={offer.sent_at || offer.created_at} />
                        </div>
                    )}
                </div>

                {/* Client Details */}
                <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', lineHeight: '1.6', marginTop: '1.8rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{offer.customer_name || 'Client'}</div>
                        {(offer.first_name || offer.last_name) && (
                            <div>{offer.first_name} {offer.last_name}</div>
                        )}
                        {offer.address && <div>{offer.address}</div>}
                        {(offer.postal_code || offer.city) && (
                            <div>{offer.postal_code} {offer.city}</div>
                        )}
                        {offer.vat_number && (
                            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                {lang === 'de' ? 'MwSt' : 'TVA'}: {offer.vat_number}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Items Tables Grouped by Billing Cycle */}
            {['one_time', 'yearly', 'monthly'].map(cycle => {
                const items = groups[cycle];
                if (!items || items.length === 0) return null;

                const groupTotals = calculateGroupTotals(items);

                return (
                    <div key={cycle} style={{ marginBottom: '2.5rem', breakInside: 'avoid' }}>
                        {cycle !== 'one_time' && (
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                {lang === 'de' ? cycleTitles[cycle].de : cycleTitles[cycle].fr}
                            </h3>
                        )}

                        <table className="data-table" style={{ marginBottom: '1rem' }}>
                            <thead>
                                <tr>
                                    <th>{lang === 'de' ? 'Leistung' : 'Service'}</th>
                                    <th style={{ textAlign: 'center' }}>{lang === 'de' ? 'Menge' : 'Qté'}</th>
                                    <th style={{ textAlign: 'right' }}>{lang === 'de' ? 'Einzelpreis' : 'Prix Unitaire'}</th>
                                    <th style={{ textAlign: 'right' }}>{lang === 'de' ? 'Gesamt' : 'Total'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{lang === 'de' ? item.name_de : item.name_fr}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lang === 'de' ? item.description_de : item.description_fr}</div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatCurrency((item.quantity || 1) * item.unit_price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: '250px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{lang === 'de' ? 'Zwischensumme' : 'Sous-total'}</span>
                                    <span>{formatCurrency(groupTotals.subtotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{offer.customer_country === 'BE'
                                        ? (lang === 'de' ? 'MwSt (21%)' : 'TVA (21%)')
                                        : (lang === 'de' ? 'MwSt (0%)' : 'TVA (0%)')}</span>
                                    <span>{formatCurrency(groupTotals.vat)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '2px solid var(--text-main)', fontWeight: 700, fontSize: '1.15rem' }}>
                                    <span>{lang === 'de' ? 'Gesamt' : 'Total'}</span>
                                    <span>{formatCurrency(groupTotals.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Footer */}
            <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border)', paddingTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    {settings?.company_name && <span style={{ fontWeight: 500 }}>{settings.company_name}</span>}
                    {settings?.address && <span>{settings.address}</span>}
                    {settings?.email && <span>{settings.email}</span>}
                    {settings?.phone && <span>{settings.phone}</span>}
                    {settings?.website && <span>{settings.website}</span>}
                    {settings?.vat_number && <span>{lang === 'de' ? 'MwSt' : 'TVA'}: {settings.vat_number}</span>}
                </div>
                {settings?.payment_terms && (
                    <div style={{ textAlign: 'center', marginTop: '0.75rem', fontStyle: 'italic' }}>
                        {settings.payment_terms}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OfferLayout;
