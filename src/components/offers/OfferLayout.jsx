import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { formatCurrency } from '../../utils/pricingEngine';
import DeadlineIndicator from '../ui/DeadlineIndicator';
import { formatDate, formatDateTime } from '../../utils/dateUtils';

// No longer using cycleTitles as we use t()
const OfferLayout = ({ offer, settings, hideInternal = false, tempSignature = null, onSelectItem = null }) => {
    const { t } = useI18n();
    // Group items by billing cycle
    const groups = { one_time: [], yearly: [], monthly: [] };
    const items = Array.isArray(offer?.items) ? offer.items : [];

    items.forEach(item => {
        const cycle = item.billing_cycle || 'one_time';
        if (!groups[cycle]) groups[cycle] = [];
        groups[cycle].push(item);
    });

    const calculateGroupTotals = (items) => {
        const subtotal = items
            .filter(i => i.price_mode !== 'UNSET' && (i.is_selected === undefined || i.is_selected === 1 || i.is_selected === true))
            .reduce((acc, i) => acc + ((i.unit_price || 0) * (i.quantity || 0)), 0);
        const discountAmount = subtotal * ((offer.discount_percent || 0) / 100);
        const discountedSubtotal = subtotal - discountAmount;
        const vatRate = offer.customer_country === 'BE' ? 0.21 : 0.0;
        const vat = discountedSubtotal * vatRate;
        const total = discountedSubtotal + vat;
        return { subtotal, vat, total };
    };

    const lang = offer.language || 'de';

    const signatureToDisplay = tempSignature ? {
        name: tempSignature.name,
        email: tempSignature.email,
        date: tempSignature.date || new Date().toISOString(),
        image: tempSignature.signatureData || tempSignature.image
    } : (offer.status === 'signed' ? {
        name: offer.signed_by_name,
        email: offer.signed_by_email,
        date: offer.signed_at,
        image: offer.signed_pdf_url || offer.signature_data || offer.pdfUrl
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
                        <div className="mt-4 flex flex-col gap-1">
                            {settings?.vat_number && <div className="font-bold flex gap-2"><span className="opacity-50">{t('customer.vat_number')}</span> {settings.vat_number}</div>}
                            {settings?.email && <div className="flex gap-2"><span className="opacity-50">@</span> {settings.email}</div>}
                            {settings?.website && <div className="flex gap-2"><span className="opacity-50">W</span> {settings.website}</div>}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end text-right min-w-[280px]">
                    <div className="p-4 bg-[var(--bg-main)] rounded-[var(--radius-lg)] border border-[var(--border)] mb-8 w-full">
                        <h1 className="text-[11px] font-extrabold tracking-[0.2em] text-[var(--primary)] uppercase mb-2">
                            {t('offer.proposal_title')}
                        </h1>
                        <div className="text-[20px] font-extrabold mb-1">{offer.offer_name || `#${offer.id}`}</div>
                        <div className="text-[12px] text-[var(--text-muted)] font-bold">
                            {formatDate(offer.created_at)}
                        </div>
                        {offer.due_date && (
                            <div className="mt-3 pt-3 border-t border-[var(--border)]/50">
                                <div className="text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest mb-1">{t('offer.valid_until')}</div>
                                <div className="text-[12px] font-bold text-[var(--text-main)]">
                                    {formatDate(offer.due_date)}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="text-[14px]">
                        <div className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest mb-3">{t('offer.prepared_for')}</div>
                        <div className="text-[18px] font-extrabold text-[var(--text-main)] mb-1">{offer.customer_name || 'Strategic Partner'}</div>
                        <div className="text-[var(--text-secondary)] font-medium leading-relaxed text-right">
                            {offer.address && <div>{offer.address}</div>}
                            {(offer.postal_code || offer.city) && (
                                <div>{offer.postal_code} {offer.city}</div>
                            )}
                            {offer.vat_number && (
                                <div className="text-[12px] font-bold mt-2 opacity-60">
                                    {t('customer.vat_number')}: {offer.vat_number}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Tables Grouped by Billing Cycle */}
            {['one_time', 'yearly', 'monthly'].map(cycle => {
                const cycleItems = groups[cycle] || [];
                if (cycleItems.length === 0) return null;

                const groupTotals = calculateGroupTotals(cycleItems);

                return (
                    <div key={cycle} className="mb-12 break-inside-avoid">
                        <div className="flex items-center gap-4 mb-6">
                            <h3 className="text-[14px] font-extrabold text-[var(--text-main)] uppercase tracking-[0.1em]">
                                {t(`offer.cycle.${cycle}`)}
                            </h3>
                            <div className="h-[1px] flex-1 bg-[var(--border)] opacity-50" />
                        </div>

                        <table className="w-full mb-6">
                            <thead>
                                <tr className="border-b border-[var(--text-main)]/10">
                                    <th className="py-4 text-left text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">{t('offer.item_name')}</th>
                                    <th className="py-4 text-center text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider w-20">{t('offer.quantity')}</th>
                                    <th className="py-4 text-right text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">{t('offer.unit')}</th>
                                    <th className="py-4 text-right text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">{t('offer.amount')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const rawGroups = {};
                                    const processed = [];

                                    cycleItems.forEach(item => {
                                        if (item.group_id) {
                                            if (!rawGroups[item.group_id]) rawGroups[item.group_id] = { isGroup: true, id: item.group_id, type: item.group_type, items: [] };
                                            rawGroups[item.group_id].items.push(item);
                                        } else {
                                            processed.push({ ...item, isGroup: false });
                                        }
                                    });

                                    Object.values(rawGroups).forEach(group => {
                                        if (group.items.length <= 1) {
                                            processed.push(...group.items.map(it => ({ ...it, isGroup: false, group_id: null })));
                                        } else {
                                            processed.push(group);
                                        }
                                    });

                                    return processed.map((entry) => {
                                        if (entry.isGroup) {
                                            return (
                                                <tr key={`group-${entry.id}`} className="border-b border-[var(--border)] bg-[var(--bg-main)]/30">
                                                    <td colSpan={4} className="p-0">
                                                        <div className="divide-y divide-[var(--border)]">
                                                            {entry.items.map((item) => {
                                                                const isPrint = item.type === 'print';
                                                                const specsJson = item.specs ? (typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs) : item.print_selections;
                                                                const specs = isPrint && specsJson ? Object.entries(specsJson).filter(([_, v]) => v !== undefined && v !== null) : [];
                                                                const isSelected = item.is_selected === 1 || item.is_selected === true;
                                                                const isSigned = offer.status === 'signed' || offer.status === 'declined';

                                                                return (
                                                                    <div
                                                                        key={item.id}
                                                                        className={`flex items-start gap-8 p-6 transition-all duration-300 ${isSelected ? 'bg-[var(--primary-light)]/30' : 'bg-transparent'} ${onSelectItem && !isSigned ? 'cursor-pointer hover:bg-[var(--primary-light)]/20' : ''}`}
                                                                        onClick={() => onSelectItem && !isSigned && onSelectItem(item.id, entry.id)}
                                                                    >
                                                                        <div className="pt-1">
                                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-[var(--border-medium)] bg-white'}`}>
                                                                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="text-[15px] font-black text-[var(--text-main)] mb-1.5 flex items-center gap-2">
                                                                                {item.item_name || (lang === 'de' ? item.name_de : item.name_fr)}
                                                                                {item.price_mode === 'UNSET' && (
                                                                                    <span className="text-[8px] font-black bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Price Pending</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-[13px] text-[var(--text-secondary)] leading-relaxed font-medium opacity-80 mb-3">
                                                                                {item.item_description || (!isPrint ? (lang === 'de' ? item.description_de : item.description_fr) : '') || (!isPrint ? 'Professional service deliverable' : '')}
                                                                            </div>
                                                                            {isPrint && specs.length > 0 && (
                                                                                <div className="text-[11px] text-[var(--text-secondary)] font-bold italic mt-2 opacity-80 flex flex-wrap gap-x-3 gap-y-1">
                                                                                    {specs.map(([k, v]) => (
                                                                                        <span key={k}>{k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ')}: {v || (lang === 'de' ? 'Keines' : lang === 'fr' ? 'Aucun' : 'None')}</span>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="w-20 text-center">
                                                                            <div className="text-[15px] font-black text-[var(--text-main)]">{item.quantity}</div>
                                                                            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em]">Units</div>
                                                                        </div>
                                                                        <div className="w-24 text-right">
                                                                            <div className="text-[15px] font-bold text-[var(--text-secondary)]">
                                                                                {item.price_mode === 'UNSET' ? '—' : formatCurrency(item.unit_price)}
                                                                            </div>
                                                                        </div>
                                                                        <div className="w-24 text-right">
                                                                            <div className={`text-[15px] font-black ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                                                                                {item.price_mode === 'UNSET' ? (
                                                                                    <span className="text-[10px] text-amber-600 font-black uppercase tracking-tight italic">TBD</span>
                                                                                ) : formatCurrency((item.quantity || 1) * item.unit_price)}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        } else {
                                            const item = entry;
                                            const isPrint = item.type === 'print';
                                            const specsJson = item.specs ? (typeof item.specs === 'string' ? JSON.parse(item.specs) : item.specs) : item.print_selections;
                                            const specs = isPrint && specsJson ? Object.entries(specsJson).filter(([_, v]) => v !== undefined && v !== null) : [];

                                            return (
                                                <tr key={item.id} className="border-b border-[var(--border)] group/row hover:bg-slate-50/30 transition-colors">
                                                    <td className="py-6 pr-8">
                                                        <div className="text-[14px] font-black text-[var(--text-main)] mb-1.5 flex items-center gap-2">
                                                            {item.item_name || (lang === 'de' ? item.name_de : item.name_fr)}
                                                            {isPrint && item.option_set_name && (
                                                                <span className="text-[8px] font-black text-[var(--primary)] uppercase bg-[var(--primary-light)] px-1.5 py-0.5 rounded-sm tracking-widest">
                                                                    {item.option_set_name}
                                                                </span>
                                                            )}
                                                            {item.price_mode === 'UNSET' && (
                                                                <span className="text-[8px] font-black bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Price Pending</span>
                                                            )}
                                                        </div>
                                                        <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed font-medium opacity-80 mb-3">
                                                            {item.item_description || (!isPrint ? (lang === 'de' ? item.description_de : item.description_fr) : '') || (!isPrint ? 'Professional service deliverable' : '')}
                                                        </div>

                                                        {isPrint && specs.length > 0 && (
                                                            <div className="text-[11px] text-[var(--text-secondary)] font-bold italic mt-2 opacity-80">
                                                                {specs.map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ')}: ${v || (lang === 'de' ? 'Keines' : lang === 'fr' ? 'Aucun' : 'None')}`).join(' • ')}
                                                            </div>
                                                        )}

                                                        {isPrint && item.print_note && (
                                                            <div className="mt-3 text-[11px] italic text-[var(--text-muted)] font-medium bg-slate-50/50 p-2 rounded-lg border-l-2 border-slate-200">
                                                                {item.print_note}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-6 text-center">
                                                        <div className="text-[14px] font-black text-[var(--text-main)]">{item.quantity}</div>
                                                        <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Units</div>
                                                    </td>
                                                    <td className="py-6 text-right">
                                                        <div className="text-[14px] font-bold text-[var(--text-secondary)]">
                                                            {item.price_mode === 'UNSET' ? '—' : formatCurrency(item.unit_price)}
                                                        </div>
                                                    </td>
                                                    <td className="py-6 text-right">
                                                        <div className="text-[14px] font-black text-[var(--text-main)]">
                                                            {item.price_mode === 'UNSET' ? (
                                                                <span className="text-[10px] text-amber-600 font-black uppercase tracking-tight italic">TBD</span>
                                                            ) : formatCurrency((item.quantity || 1) * item.unit_price)}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    });
                                })()}
                            </tbody>
                        </table>

                        {/* Totals Block */}
                        <div className="flex justify-end mt-8">
                            <div className="w-[300px] p-6 rounded-[var(--radius-lg)] bg-[var(--bg-main)]/50 border border-[var(--border)] break-inside-avoid">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-tight">{t('offer.subtotal')}</span>
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
                                    <span className="text-[14px] font-extrabold text-[var(--text-main)] uppercase tracking-wider">{t('offer.total')}</span>
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
                        {t('offer.strategic_notes')}
                    </h4>
                    <p className="text-[13px] text-[var(--text-main)] leading-relaxed font-medium whitespace-pre-wrap">
                        {offer.strategic_notes || offer.internal_notes}
                    </p>
                </div>
            )}

            {/* Terms & Footer */}
            <div className="mt-20 pt-16 border-t border-[var(--border)] break-inside-avoid">
                <div className="grid grid-cols-2 gap-12 mb-12">
                    {settings?.payment_terms && (
                        <div>
                            <h4 className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-3">Rechtliche Hinweise</h4>
                            <p className="text-[12px] leading-relaxed text-[var(--text-muted)] italic font-medium">
                                {settings.payment_terms}
                            </p>
                        </div>
                    )}
                    <div className="flex flex-col items-end justify-end">
                        {signatureToDisplay ? (
                            <div className="flex flex-col items-end break-inside-avoid">
                                <div className="mb-2">
                                    <img src={signatureToDisplay.image} alt="Signature" className="h-16 object-contain" style={{ maxWidth: '200px' }} />
                                </div>
                                <div className="w-56 h-[1px] bg-[var(--text-main)] mb-2" />
                                <div className="text-[11px] font-extrabold text-[var(--text-main)] uppercase tracking-widest text-right">
                                    {t('offer.signed_by')} {signatureToDisplay.name}
                                </div>
                                <div className="text-[10px] text-[var(--text-muted)] mt-1 text-right font-medium leading-tight">
                                    {formatDateTime(signatureToDisplay.date)} <br />
                                    {signatureToDisplay.email}
                                </div>
                            </div>
                        ) : (
                            <div className="break-inside-avoid text-right">
                                <div className="w-48 h-[1px] bg-[var(--text-main)] mb-4 ml-auto" />
                                <div className="text-[11px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest text-right">Digital Signature Panel</div>
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
