import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useNavigate, useParams } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { calculateTotals, formatCurrency } from '../utils/pricingEngine';
import Input from '../components/ui/Input';

const OfferWizardPage = () => {
    const { t, locale } = useI18n();
    const navigate = useNavigate();
    const { editId } = useParams();

    // Data
    const [customers, setCustomers] = useState([]);
    const [servicesList, setServicesList] = useState([]);
    const packages = [
        { id: 'custom', name: 'Custom Project', services: [] },
        { id: 'web_starter', name: 'Web Starter (Website + SEO + Hosting)', services: [1, 3, 5] },
        { id: 'ecommerce', name: 'E-Commerce Pack', services: [1, 2, 3, 5] }
    ];

    // State
    const [step, setStep] = useState(1);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [offerName, setOfferName] = useState('');
    const [offerLanguage, setOfferLanguage] = useState(locale);
    // Default due date: 14 days from now
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d.toISOString().split('T')[0];
    });
    const [selectedPackage, setSelectedPackage] = useState('custom');
    const [selectedServices, setSelectedServices] = useState([]);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        // setIsLoading(true);
        try {
            const [cData, sData, settingsData] = await Promise.all([
                dataService.getCustomers(),
                dataService.getServices(),
                dataService.getSettings()
            ]);
            setCustomers(cData);
            setServicesList(sData);

            if (editId) {
                const existingOffer = await dataService.getOffer(editId);
                if (existingOffer) {
                    // Find customer in the loaded list. Note: c.id and existingOffer.customer_id are numbers.
                    const customer = cData.find(c => c.id === existingOffer.customer_id);
                    setSelectedCustomer(customer);

                    setOfferName(existingOffer.offer_name || '');
                    setOfferLanguage(existingOffer.language);
                    if (existingOffer.due_date) {
                        setDueDate(existingOffer.due_date.split('T')[0]);
                    }
                    setDiscountPercent(existingOffer.discount_percent || 0);

                    // Map items to selectedServices
                    const mappedItems = existingOffer.items.map(item => {
                        const originalService = sData.find(s => s.id === item.service_id);
                        return {
                            ...originalService,
                            quantity: item.quantity,
                            unit_price: item.unit_price
                        };
                    });
                    setSelectedServices(mappedItems);
                    setSelectedPackage('custom');
                }
            } else {
                const defaults = sData
                    .filter(s => s.default_selected)
                    .map(s => ({ ...s, quantity: 1, unit_price: s.price }));
                setSelectedServices(defaults);

                // Set default due date based on settings
                if (settingsData && settingsData.default_validity_days) {
                    const d = new Date();
                    d.setDate(d.getDate() + settingsData.default_validity_days);
                    setDueDate(d.toISOString().split('T')[0]);
                }
            }
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [editId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [loadData]);

    const handleSave = async (e) => {
        // e might be undefined if called directly, but usually called from button click
        if (e) e.preventDefault();
        setIsSaving(true);

        const totals = calculateTotals(selectedServices, discountPercent); // Note: country arg missing here in original handleSave but present in render? 
        // Logic below at 230 includes country. Let's use that if possible or just rely on global? 
        // Actually, let's stick to the handleSave implementation from top block (lines 79-113) 
        // but wait, calculateTotals usually needs country for VAT? 
        // In line 230 it was `calculateTotals(selectedServices, discountPercent, selectedCustomer?.country || 'DE');`
        // In line 83 it was `const totals = calculateTotals(selectedServices, discountPercent);`
        // I should probably use the more complete one.

        const currentTotals = calculateTotals(selectedServices, discountPercent, selectedCustomer?.country || 'DE');

        const offerData = {
            customer_id: selectedCustomer.id,
            offer_name: offerName,
            language: offerLanguage,
            due_date: dueDate,
            items: selectedServices.map(s => ({
                service_id: s.id,
                quantity: s.quantity,
                unit_price: s.unit_price,
                total_price: s.quantity * s.unit_price,
                billing_cycle: s.billing_cycle || 'one_time'
            })),
            ...currentTotals
        };

        try {
            if (editId) {
                await dataService.updateOffer(editId, offerData);
                navigate(`/offer/preview/${editId}`);
            } else {
                const res = await dataService.saveOffer(offerData);
                navigate(`/offer/preview/${res.id}`);
            }
        } catch (err) {
            console.error(err);
            alert('Error saving offer');
        }
        setIsSaving(false);
    };

    const handlePackageChange = (pkgId) => {
        setSelectedPackage(pkgId);
        if (pkgId !== 'custom') {
            const pkg = packages.find(p => p.id === pkgId);
            const pkgServices = servicesList
                .filter(s => pkg.services.includes(s.id))
                .map(s => ({ ...s, quantity: 1, unit_price: s.price }));
            setSelectedServices(pkgServices);
        } else {
            // Reset to defaults or keep? Usually reset to defaults if switching back to custom, or keep as is?
            // Let's reset to defaults for consistency with previous logic
            const defaults = servicesList
                .filter(s => s.default_selected)
                .map(s => ({ ...s, quantity: 1, unit_price: s.price }));
            setSelectedServices(defaults);
        }
    };

    const suggestions = useMemo(() => {
        const newSuggestions = [];
        // Note: IDs are numbers in SQLite
        const hasWebsite = selectedServices.some(s => s.id === 1);
        const hasHosting = selectedServices.some(s => s.id === 3);

        if (hasWebsite && !hasHosting) {
            newSuggestions.push({
                id: 3,
                text: offerLanguage === 'de' ? 'Empfehlung: Hosting hinzufügen?' : 'Recommandation : ajouter l\'hébergement ?'
            });
        }
        return newSuggestions;
    }, [selectedServices, offerLanguage]);

    const toggleService = (service) => {
        setSelectedServices(prev => {
            const exists = prev.find(s => s.id === service.id);
            if (exists) return prev.filter(s => s.id !== service.id);

            // Handle variants
            if (service.variants && service.variants.length > 0) {
                // Select default or first variant
                const v = service.variants.find(v => v.is_default) || service.variants[0];
                return [...prev, {
                    ...service,
                    variant_id: v.id,
                    quantity: 1,
                    unit_price: v.price,
                    item_name: `${offerLanguage === 'de' ? service.name_de : service.name_fr}: ${v.name}`,
                    billing_cycle: v.billing_cycle,
                    item_description: v.description
                }];
            }

            return [...prev, { ...service, quantity: 1, unit_price: service.price }];
        });
    };

    const selectVariant = (service, variant) => {
        setSelectedServices(prev => {
            const existing = prev.find(s => s.id === service.id);
            const others = prev.filter(s => s.id !== service.id);
            return [...others, {
                ...service,
                variant_id: variant.id,
                quantity: existing ? existing.quantity : 1,
                unit_price: variant.price,
                item_name: `${offerLanguage === 'de' ? service.name_de : service.name_fr}: ${variant.name}`,
                billing_cycle: variant.billing_cycle,
                item_description: variant.description
            }].sort((a, b) => a.id - b.id); // Keep order roughly? Or just append. sorting by ID is safer for UI stability
        });
    };

    const updateQuantity = (id, qty) => {
        setSelectedServices(prev => prev.map(s =>
            s.id === id ? { ...s, quantity: Math.max(1, parseInt(qty) || 1) } : s
        ));
    };

    const totals = calculateTotals(selectedServices, discountPercent, selectedCustomer?.country || 'DE');

    if (isLoading) return <div className="page-container">Loading...</div>;

    return (
        <div className="page-container" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>
            <div>
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: step >= s ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: step === s ? 'bold' : 'normal'
                        }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: step >= s ? 'var(--primary)' : '#e2e8f0',
                                color: step >= s ? 'white' : 'var(--text-main)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>{s}</div>
                            {t(`offer.step_${s}`)}
                        </div>
                    ))}
                </div>

                <div className="card">
                    {step === 1 && (
                        <div>
                            <h2 style={{ marginBottom: '1.5rem' }}>Customer & Basic Info</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label className="form-label">Offer Name / Project</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Website Redesign Summer 2026"
                                        style={{ width: '100%', padding: '0.75rem' }}
                                        value={offerName}
                                        onChange={(e) => setOfferName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">{t('offer.customer')}</label>
                                    <select
                                        style={{ width: '100%', padding: '0.75rem' }}
                                        value={selectedCustomer?.id || ''}
                                        onChange={(e) => setSelectedCustomer(customers.find(c => c.id === parseInt(e.target.value)))}
                                    >
                                        <option value="">-- Select Customer --</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-2">
                                    <div>
                                        <label className="form-label">{t('offer.language')}</label>
                                        <select
                                            style={{ width: '100%', padding: '0.75rem' }}
                                            value={offerLanguage}
                                            onChange={(e) => setOfferLanguage(e.target.value)}
                                        >
                                            <option value="de">Deutsch</option>
                                            <option value="fr">Français</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Preset Package</label>
                                        <select
                                            style={{ width: '100%', padding: '0.75rem' }}
                                            value={selectedPackage}
                                            onChange={(e) => handlePackageChange(e.target.value)}
                                        >
                                            {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <Input
                                            label={t('offer.due_date') === 'offer.due_date' ? 'Valid Until' : t('offer.due_date')}
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            style={{ marginBottom: 0 }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h2 style={{ marginBottom: '1.5rem' }}>Select Services</h2>

                            {suggestions.length > 0 && (
                                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
                                    {suggestions.map(sug => (
                                        <div key={sug.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#92400e', fontSize: '0.9rem', fontWeight: 500 }}>💡 {sug.text}</span>
                                            <button
                                                onClick={() => toggleService(servicesList.find(s => s.id === sug.id))}
                                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: '#f59e0b', color: 'white', borderRadius: '4px' }}
                                            >Add</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {servicesList.map(s => {
                                    const isSelected = !!selectedServices.find(ss => ss.id === s.id);
                                    const selectedVariantId = isSelected ? selectedServices.find(ss => ss.id === s.id).variant_id : null;
                                    const hasVariants = s.variants && s.variants.length > 0;

                                    return (
                                        <div key={s.id} style={{
                                            padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                                            background: isSelected ? '#eff6ff' : 'transparent',
                                            display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <input
                                                    type="checkbox"
                                                    style={{ width: 22, height: 22 }}
                                                    checked={isSelected}
                                                    onChange={() => toggleService(s)}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontWeight: 600, margin: 0 }}>{offerLanguage === 'de' ? s.name_de : s.name_fr}</p>
                                                    {!hasVariants && <small style={{ color: 'var(--text-muted)' }}>{s.category} • € {s.price} / {s.unit_type}</small>}
                                                    {hasVariants && <small style={{ color: 'var(--text-muted)' }}>{s.category}</small>}
                                                </div>
                                                {isSelected && !hasVariants && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            style={{ width: 60, padding: '0.4rem' }}
                                                            value={selectedServices.find(ss => ss.id === s.id).quantity}
                                                            onChange={(e) => updateQuantity(s.id, e.target.value)}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Variants List */}
                                            {hasVariants && (
                                                <div style={{ marginLeft: '0', paddingLeft: '2.5rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    {s.variants.map(v => (
                                                        <label key={v.id} style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                                                            opacity: isSelected ? 1 : 0.6
                                                        }}>
                                                            <input
                                                                type="radio"
                                                                name={`service-${s.id}`}
                                                                checked={isSelected && selectedVariantId === v.id}
                                                                onChange={() => selectVariant(s, v)}
                                                                disabled={!isSelected}
                                                            />
                                                            <span style={{ fontSize: '0.9rem' }}>
                                                                {v.name} - {formatCurrency(v.price)} <span style={{ color: '#64748b' }}>({v.billing_cycle})</span>
                                                            </span>
                                                        </label>
                                                    ))}
                                                    {isSelected && (
                                                        <div style={{ marginTop: '0.5rem' }}>
                                                            <label style={{ fontSize: '0.85rem', marginRight: '0.5rem' }}>Quantity:</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                style={{ width: 60, padding: '0.3rem' }}
                                                                value={selectedServices.find(ss => ss.id === s.id).quantity}
                                                                onChange={(e) => updateQuantity(s.id, e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h2 style={{ marginBottom: '1.5rem' }}>Finalize</h2>
                            <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
                                <Input
                                    label="Rabatt (%)"
                                    type="number"
                                    max="100"
                                    min="0"
                                    value={discountPercent}
                                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                    style={{ marginBottom: 0 }}
                                />
                            </div>
                            <div className="card" style={{ background: '#f8fafc', padding: '1.5rem', border: '1px solid var(--border)' }}>
                                <h3>Summary</h3>
                                <div className="flex flex-column gap-2 mt-2">
                                    <p><strong>Customer:</strong> {selectedCustomer?.company_name}</p>
                                    <p><strong>Language:</strong> {offerLanguage.toUpperCase()}</p>
                                    <p><strong>Selected Items:</strong> {selectedServices.length}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        {step > 1 && <button className="btn-secondary" onClick={() => setStep(step - 1)}>{t('common.back')}</button>}
                        <div style={{ flex: 1 }} />
                        {step < 3 ? (
                            <button className="btn-primary" onClick={() => setStep(step + 1)} disabled={step === 1 && (!selectedCustomer || !offerName)}>
                                {t('common.next')}
                            </button>
                        ) : (
                            <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : t('common.save')}
                            </button>
                        )}
                    </div>
                </div>
            </div >

            <div className="sticky-panel">
                <div className="card" style={{ position: 'sticky', top: '2rem', border: '2px solid var(--primary)' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>{t('offer.total')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Subtotal</span>
                            <span>{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>VAT</span>
                            <span>{formatCurrency(totals.vat)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            <span>Total</span>
                            <span>{formatCurrency(totals.total)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default OfferWizardPage;
