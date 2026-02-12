import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useNavigate, useParams } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { calculateTotals, formatCurrency } from '../utils/pricingEngine';

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
    const [selectedPackage, setSelectedPackage] = useState('custom');
    const [selectedServices, setSelectedServices] = useState([]);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        // setIsLoading(true);
        const [cData, sData] = await Promise.all([
            dataService.getCustomers(),
            dataService.getServices()
        ]);
        setCustomers(cData);
        setServicesList(sData);

        if (editId) {
            const existingOffer = await dataService.getOffer(editId);
            if (existingOffer) {
                setSelectedCustomer(cData.find(c => c.id === existingOffer.customer_id));
                setOfferName(existingOffer.offer_name || '');
                setOfferLanguage(existingOffer.language);
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
            // Initial defaults if not editing
            const defaults = sData
                .filter(s => s.default_selected)
                .map(s => ({ ...s, quantity: 1, unit_price: s.price }));
            setSelectedServices(defaults);
        }
        setIsLoading(false);
    }, [editId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [loadData]);

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
            return [...prev, { ...service, quantity: 1, unit_price: service.price }];
        });
    };

    const updateQuantity = (id, qty) => {
        setSelectedServices(prev => prev.map(s =>
            s.id === id ? { ...s, quantity: Math.max(1, parseInt(qty) || 1) } : s
        ));
    };

    const totals = calculateTotals(selectedServices, discountPercent, selectedCustomer?.country || 'DE');

    const handleSave = async () => {
        setIsSaving(true);

        const offerData = {
            customer_id: selectedCustomer.id,
            offer_name: offerName,
            language: offerLanguage,
            subtotal: totals.subtotal,
            vat: totals.vat,
            total: totals.total,
            status: editId ? undefined : 'draft', // Backend handles status updates or keeps existing on PUT
            discount_percent: discountPercent,
            items: selectedServices.map(s => ({
                service_id: s.id,
                quantity: s.quantity,
                unit_price: s.unit_price,
                total_price: s.quantity * s.unit_price
            }))
        };

        if (editId) {
            await dataService.updateOffer(editId, offerData);
        } else {
            await dataService.saveOffer(offerData);
        }

        setIsSaving(false);
        navigate('/offers');
    };

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
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('offer.customer')}</label>
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
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{t('offer.language')}</label>
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
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Preset Package</label>
                                        <select
                                            style={{ width: '100%', padding: '0.75rem' }}
                                            value={selectedPackage}
                                            onChange={(e) => handlePackageChange(e.target.value)}
                                        >
                                            {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
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
                                {servicesList.map(s => (
                                    <div key={s.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                                        background: selectedServices.find(ss => ss.id === s.id) ? '#eff6ff' : 'transparent'
                                    }}>
                                        <input
                                            type="checkbox"
                                            style={{ width: 22, height: 22 }}
                                            checked={!!selectedServices.find(ss => ss.id === s.id)}
                                            onChange={() => toggleService(s)}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 600, margin: 0 }}>{offerLanguage === 'de' ? s.name_de : s.name_fr}</p>
                                            <small style={{ color: 'var(--text-muted)' }}>{s.category} • € {s.price} / {s.unit_type}</small>
                                        </div>
                                        {selectedServices.find(ss => ss.id === s.id) && (
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
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h2 style={{ marginBottom: '1.5rem' }}>Finalize</h2>
                            <div className="grid grid-2" style={{ marginBottom: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Rabatt (%)</label>
                                    <input
                                        type="number"
                                        max="100"
                                        min="0"
                                        style={{ width: '100%', padding: '0.75rem' }}
                                        value={discountPercent}
                                        onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="card" style={{ background: '#f8fafc' }}>
                                <h3>Summary</h3>
                                <p>Customer: {selectedCustomer?.company_name}</p>
                                <p>Language: {offerLanguage.toUpperCase()}</p>
                                <p>Selected Items: {selectedServices.length}</p>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        {step > 1 && <button className="btn-secondary" onClick={() => setStep(step - 1)}>{t('common.back')}</button>}
                        <div style={{ flex: 1 }} />
                        {step < 3 ? (
                            <button className="btn-primary" onClick={() => setStep(step + 1)} disabled={step === 1 && !selectedCustomer}>
                                {t('common.next')}
                            </button>
                        ) : (
                            <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? 'Saving...' : t('common.save')}
                            </button>
                        )}
                    </div>
                </div>
            </div>

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
        </div>
    );
};

export default OfferWizardPage;
