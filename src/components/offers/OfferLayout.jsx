import React from 'react';
import { formatCurrency } from '../../utils/pricingEngine';
import DeadlineIndicator from '../ui/DeadlineIndicator';

const cycleTitles = {
    one_time: { de: 'Einmalige Kosten', fr: 'Frais uniques' },
    yearly: { de: 'Jährliche Kosten', fr: 'Frais annuels' },
    monthly: { de: 'Monatliche Kosten', fr: 'Frais mensuels' }
};

const OfferLayout = ({ offer, settings, hideInternal = false, tempSignature = null }) => {
    // Group items by billing cycle
    const groups = { one_time: [], yearly: [], monthly: [] };
    const items = Array.isArray(offer?.items) ? offer.items : [];

    items.forEach(item => {
        const cycle = item.billing_cycle || 'one_time';
        if (!groups[cycle]) groups[cycle] = [];
        groups[cycle].push(item);
    });

    const calculateGroupTotals = (items) => {
        const subtotal = items.reduce((acc, i) => acc + ((i.unit_price || 0) * (i.quantity || 0)), 0);
        const discountAmount = subtotal * ((offer.discount_percent || 0) / 100);
        const discountedSubtotal = subtotal - discountAmount;
        const vatRate = offer.customer_country === 'BE' ? 0.21 : 0.0;
        const vat = discountedSubtotal * vatRate;
        const total = discountedSubtotal + vat;
        return { subtotal, vat, total };
    };

    const lang = offer.language || 'de';

    const signatureToDisplay = (typeof tempSignature !== 'undefined' ? tempSignature : null) || (offer.status === 'signed' ? {
        name: offer.signed_by_name,
        email: offer.signed_by_email,
        date: offer.signed_at,
        image: offer.signature_data
    } : null);

    return (
        <div className="a4-container bg-white" style={{ padding: '3.5rem', color: 'var(--text-main)' }}>
            {/* Header: Company & Recipient */}
            <div className="flex justify-between gap-12 mb-16 pb-12 border-b border-[var(--border)]">
                <div className="flex-1">
                    {settings?.logo_url && (
                        <img src={settings.logo_url} alt="Logo" className="max-h-[70px] mb-8 grayscale hover:grayscale-0 transition-all duration-500" />
                    )}
                    <h2 className="text-[18px] font-extrabold tracking-tight mb-4 text-[var(--text-main)]">
                        {settings?.company_name || 'Business Catalyst Group'}
                    </h2>
                    <div className="text-[13px] text-[var(--text-secondary)] leading-loose font-medium">
                        {settings?.address && <div className="whitespace-pre-wrap opacity-80">{settings.address}</div>}
                        <div className="mt-4 flex flex-column gap-1">
                            {settings?.vat_number && <div className="font-bold flex gap-2"><span className="opacity-50">{lang === 'de' ? 'ID' : 'TAX'}</span> {settings.vat_number}</div>}
                            {settings?.email && <div className="flex gap-2"><span className="opacity-50">@</span> {settings.email}</div>}
                            {settings?.website && <div className="flex gap-2"><span className="opacity-50">W</span> {settings.website}</div>}
                        </div>
                    </div>
                </div>

                <div className="flex flex-column items-end text-right min-w-[280px]">
                    <div className="p-4 bg-[var(--bg-main)] rounded-[var(--radius-lg)] border border-[var(--border)] mb-8 w-full">
                        <h1 className="text-[11px] font-extrabold tracking-[0.2em] text-[var(--primary)] uppercase mb-2">
                            {lang === 'de' ? 'Geschäftliches Angebot' : 'Proposition Commerciale'}
                        </h1>
                        <div className="text-[20px] font-extrabold mb-1">{offer.offer_name || `#${offer.id}`}</div>
                        <div className="text-[12px] text-[var(--text-muted)] font-bold">
                            {new Date(offer.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        {offer.due_date && (
                            <div className="mt-3 pt-3 border-t border-[var(--border)]/50">
                                <div className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest mb-1">Valid Until</div>
                                <div className="text-[12px] font-bold text-[var(--text-main)]">
                                    {new Date(offer.due_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="text-[14px]">
                        <div className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest mb-3">Prepared for</div>
                        <div className="text-[18px] font-extrabold text-[var(--text-main)] mb-1">{offer.customer_name || 'Strategic Partner'}</div>
                        <div className="text-[var(--text-secondary)] font-medium leading-relaxed">
                            {offer.address && <div>{offer.address}</div>}
                            {(offer.postal_code || offer.city) && (
                                <div>{offer.postal_code} {offer.city}</div>
                            )}
                            {offer.vat_number && (
                                <div className="text-[12px] font-bold mt-2 opacity-60">
                                    {lang === 'de' ? 'MwSt' : 'TVA'}: {offer.vat_number}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Tables Grouped by Billing Cycle */}
            {['one_time', 'yearly', 'monthly'].map(cycle => {
                const items = groups[cycle];
                if (!items || items.length === 0) return null;

                const groupTotals = calculateGroupTotals(items);

                return (
                    <div key={cycle} className="mb-12 break-inside-avoid">
                        <div className="flex items-center gap-4 mb-6">
                            <h3 className="text-[14px] font-extrabold text-[var(--text-main)] uppercase tracking-[0.1em]">
                                {lang === 'de' ? cycleTitles[cycle].de : cycleTitles[cycle].fr}
                            </h3>
                            <div className="h-[1px] flex-1 bg-[var(--border)] opacity-50" />
                        </div>

                        <table className="w-full mb-6">
                            <thead>
                                <tr className="border-b border-[var(--text-main)]/10">
                                    <th className="py-4 text-left text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">{lang === 'de' ? 'Service/Beschreibung' : 'Service/Description'}</th>
                                    <th className="py-4 text-center text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider w-20">{lang === 'de' ? 'Menge' : 'Qté'}</th>
                                    <th className="py-4 text-right text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">{lang === 'de' ? 'Einheit' : 'Unité'}</th>
                                    <th className="py-4 text-right text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">{lang === 'de' ? 'Betrag' : 'Total'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id} className="border-b border-[var(--border)]">
                                        <td className="py-5 pr-8">
                                            <div className="text-[14px] font-bold text-[var(--text-main)] mb-1">
                                                {item.item_name || (lang === 'de' ? item.name_de : item.name_fr)}
                                            </div>
                                            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed font-medium">
                                                {item.item_description || (lang === 'de' ? item.description_de : item.description_fr)}
                                            </div>
                                        </td>
                                        <td className="py-5 text-center text-[14px] font-bold text-[var(--text-secondary)]">{item.quantity}</td>
                                        <td className="py-5 text-right text-[14px] font-bold text-[var(--text-secondary)]">{formatCurrency(item.unit_price)}</td>
                                        <td className="py-5 text-right text-[14px] font-extrabold text-[var(--text-main)]">{formatCurrency((item.quantity || 1) * item.unit_price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals Block */}
                        <div className="flex justify-end mt-8">
                            <div className="w-[300px] p-6 rounded-[var(--radius-lg)] bg-[var(--bg-main)]/50 border border-[var(--border)] break-inside-avoid">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-tight">{lang === 'de' ? 'Netto' : 'Sous-total'}</span>
                                    <span className="text-[14px] font-bold text-[var(--text-main)]">{formatCurrency(groupTotals.subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-[var(--border)] border-dashed">
                                    <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                                        {offer.customer_country === 'BE'
                                            ? (lang === 'de' ? 'MwSt (21%)' : 'TVA (21%)')
                                            : (lang === 'de' ? 'Steuersatz (0%)' : 'TVA (0%)')}
                                    </span>
                                    <span className="text-[14px] font-bold text-[var(--text-main)]">{formatCurrency(groupTotals.vat)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[14px] font-extrabold text-[var(--text-main)] uppercase tracking-wider">{lang === 'de' ? 'Gesamtbetrag' : 'Total Général'}</span>
                                    <span className="text-[20px] font-extrabold text-[var(--primary)]">{formatCurrency(groupTotals.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Strategic Notes (if present) */}
            {(!hideInternal && (offer.strategic_notes || offer.internal_notes)) && (
                <div className="mt-12 mb-8 p-6 bg-[var(--bg-main)]/50 rounded-[var(--radius-lg)] border border-[var(--border)] break-inside-avoid">
                    <h4 className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">
                        {lang === 'de' ? 'Strategische Hinweise' : 'Notes Stratégiques'}
                    </h4>
                    <p className="text-[13px] text-[var(--text-main)] leading-relaxed font-medium whitespace-pre-wrap">
                        {offer.strategic_notes || offer.internal_notes}
                    </p>
                </div>
            )}

            {/* Terms & Footer */}
            <div className="mt-20 pt-16 border-t border-[var(--border)] break-inside-avoid">
                <div className="grid grid-2 gap-12 mb-12">
                    {settings?.payment_terms && (
                        <div>
                            <h4 className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-3">Rechtliche Hinweise</h4>
                            <p className="text-[12px] leading-relaxed text-[var(--text-muted)] italic font-medium">
                                {settings.payment_terms}
                            </p>
                        </div>
                    )}
                    <div className="flex flex-column items-end justify-end">
                        {signatureToDisplay ? (
                            <div className="flex flex-col items-end break-inside-avoid">
                                <div className="mb-2">
                                    <img src={signatureToDisplay.image} alt="Signature" className="h-16 object-contain" style={{ maxWidth: '200px' }} />
                                </div>
                                <div className="w-56 h-[1px] bg-[var(--text-main)] mb-2" />
                                <div className="text-[11px] font-extrabold text-[var(--text-main)] uppercase tracking-widest text-right">
                                    Signed by {signatureToDisplay.name}
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)] mt-1 text-right font-medium leading-tight">
                                    {new Date(signatureToDisplay.date || new Date()).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })} <br />
                                    {signatureToDisplay.email}
                                </div>
                            </div>
                        ) : (
                            <div className="break-inside-avoid">
                                <div className="w-48 h-[1px] bg-[var(--text-main)] mb-4" />
                                <div className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">Digital Signature Panel</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.15em] flex justify-center items-center gap-8 flex-wrap opacity-60">
                    {settings?.company_name && <span className="text-[var(--text-main)]">{settings.company_name}</span>}
                    {settings?.email && <span>{settings.email}</span>}
                    {settings?.phone && <span>{settings.phone}</span>}
                    {settings?.vat_number && <span>VAT: {settings.vat_number}</span>}
                </div>
            </div>
        </div>
    );
};

export default OfferLayout;
