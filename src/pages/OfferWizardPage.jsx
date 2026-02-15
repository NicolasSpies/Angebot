import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { calculateTotals, formatCurrency } from '../utils/pricingEngine';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import { Check, Zap, ArrowLeft, ArrowRight, Save, Plus, AlertCircle } from 'lucide-react';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

const OfferWizardPage = () => {
    const { t, locale } = useI18n();
    const navigate = useNavigate();
    const location = useLocation(); // Imported from react-router-dom

    const { editId } = useParams();
    // Use editId directly or map to id if needed for consistency with rest of code
    const id = editId;

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Data handling
    const [customers, setCustomers] = useState([]);
    const [servicesList, setServicesList] = useState([]);
    const [packagesList, setPackagesList] = useState([]);


    // Form State
    const [offerName, setOfferName] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedPackage, setSelectedPackage] = useState('custom');
    const [offerLanguage, setOfferLanguage] = useState('de');
    const [dueDate, setDueDate] = useState('');
    const [internalNotes, setInternalNotes] = useState('');
    const [selectedServices, setSelectedServices] = useState([]);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [versionInfo, setVersionInfo] = useState(null);
    const [offerStatus, setOfferStatus] = useState('draft');
    const [showVersionModal, setShowVersionModal] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [cData, sData, settingsData, pData] = await Promise.all([
                dataService.getCustomers(),
                dataService.getServices(),
                dataService.getSettings(),
                dataService.getPackages()
            ]);
            setCustomers(cData);
            setServicesList(sData);
            setPackagesList(pData || []);


            if (editId) {
                const existingOffer = await dataService.getOffer(editId);
                if (existingOffer) {
                    const customer = cData.find(c => c.id === existingOffer.customer_id);
                    setSelectedCustomer(customer);
                    setOfferName(existingOffer.offer_name || '');
                    setOfferLanguage(existingOffer.language);
                    if (existingOffer.due_date) setDueDate(existingOffer.due_date.split('T')[0]);
                    setDiscountPercent(existingOffer.discount_percent || 0);
                    setInternalNotes(existingOffer.internal_notes || '');
                    setOfferStatus(existingOffer.status || 'draft');

                    if (existingOffer.version_number > 1) {
                        setVersionInfo({
                            number: existingOffer.version_number,
                            parentId: existingOffer.parent_id
                        });
                    }

                    // Map existing items...
                    const mappedItems = existingOffer.items.map(item => {
                        const originalService = sData.find(s => s.id === item.service_id);
                        if (!originalService) return null;
                        return {
                            ...originalService,
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                            variant_id: item.variant_id || null,
                            item_name: item.item_name,
                            item_description: item.item_description
                        };
                    }).filter(Boolean);
                    setSelectedServices(mappedItems);
                    setSelectedPackage('custom');
                }
            } else {
                // Creation Logic
                const defaults = sData
                    .filter(s => s.default_selected)
                    .map(s => ({ ...s, quantity: 1, unit_price: s.price }));
                setSelectedServices(defaults);

                if (settingsData && settingsData.default_validity_days) {
                    const d = new Date();
                    d.setDate(d.getDate() + settingsData.default_validity_days);
                    setDueDate(d.toISOString().split('T')[0]);
                }

                if (location.state?.customerId) {
                    const preselected = cData.find(c => c.id === parseInt(location.state.customerId));
                    if (preselected) setSelectedCustomer(preselected);
                }
            }
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [editId, location.state]);

    useEffect(() => {
        loadData();
    }, [loadData]);



    const handleSave = async (e) => {
        if (e) e.preventDefault();

        // If offer is already sent/signed, warn about versioning
        if (editId && (offerStatus === 'sent' || offerStatus === 'signed')) {
            setShowVersionModal(true);
            return;
        }

        await executeSave();
    };

    const executeSave = async () => {
        setIsSaving(true);
        const currentTotals = calculateTotals(selectedServices, discountPercent, selectedCustomer?.country || 'DE');

        const offerData = {
            customer_id: selectedCustomer?.id || null,
            offer_name: offerName,
            language: offerLanguage,
            due_date: dueDate,
            items: selectedServices.map(s => ({
                service_id: s.id,
                variant_id: s.variant_id || null,
                quantity: s.quantity,
                unit_price: s.unit_price,
                total_price: s.quantity * s.unit_price,
                billing_cycle: s.billing_cycle || 'one_time',
                item_name: s.item_name || (offerLanguage === 'de' ? s.name_de : s.name_fr),
                item_description: s.item_description || (offerLanguage === 'de' ? s.description_de : s.description_fr)
            })),
            internal_notes: internalNotes,
            strategic_notes: internalNotes,
            ...currentTotals
        };

        try {
            if (editId) {
                const res = await dataService.updateOffer(editId, offerData);
                const finalId = res.id || editId;
                navigate(`/offer/preview/${finalId}`);
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
            const pkg = packagesList.find(p => p.id === parseInt(pkgId));
            if (!pkg || !pkg.items) return;

            const pkgServices = pkg.items.map(item => {
                const baseService = servicesList.find(s => s.id === item.service_id);
                if (!baseService) return null;

                // If the package defines a specific variant, use it
                const variant = item.variant_id
                    ? baseService.variants?.find(v => v.id === item.variant_id)
                    : (baseService.variants?.find(v => v.is_default) || baseService.variants?.[0]);

                return {
                    ...baseService,
                    variant_id: variant?.id || null,
                    quantity: item.quantity || 1,
                    unit_price: variant ? variant.price : baseService.price,
                    item_name: variant ? `${offerLanguage === 'de' ? baseService.name_de : baseService.name_fr}: ${variant.name}` : (offerLanguage === 'de' ? baseService.name_de : baseService.name_fr),
                    item_description: variant ? variant.description : (offerLanguage === 'de' ? baseService.description_de : baseService.description_fr),
                    billing_cycle: variant ? variant.billing_cycle : 'one_time'
                };
            }).filter(Boolean);

            setSelectedServices(pkgServices);
        } else {
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
        <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div className="flex gap-12 pt-4">
                <main className="flex-1 min-w-0">
                    {/* Stepper Header */}
                    <div className="flex gap-12 mb-12 border-b border-[var(--border)] pb-6 overflow-x-auto no-scrollbar">
                        {[1, 2, 3, 4].map(s => (
                            <div key={s} className={`flex items-center gap-4 transition-all whitespace-nowrap ${step >= s ? 'opacity-100' : 'opacity-40'}`}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-[13px] shadow-sm transition-all ${step >= s ? 'bg-[var(--primary)] text-white scale-110' : 'bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border)]'}`}>
                                    {s}
                                </div>
                                <span className={`font-bold text-[14px] uppercase tracking-wider ${step >= s ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                                    {t(`offer.step_${s}`) || (s === 2 ? "Strategy" : s === 3 ? "Services" : s === 4 ? "Finalize" : "Basics")}
                                </span>
                                {s < 4 && <div className="w-8 h-[2px] bg-[var(--border)] opacity-50 ml-2" />}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-10">
                        {step === 1 && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mb-8 flex justify-between items-start">
                                    <div>
                                        <h2 className="text-3xl font-extrabold text-[var(--text-main)] mb-2">Proposal Foundation</h2>
                                        <p className="text-[var(--text-secondary)] font-medium">Define the core parameters and recipient for this engagement.</p>
                                        {versionInfo && (
                                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[12px] font-bold border border-blue-100 shadow-sm">
                                                <Zap size={14} /> Version {versionInfo.number} (Revision of #{versionInfo.parentId})
                                            </div>
                                        )}
                                    </div>

                                </div>
                                <Card className="border-[var(--border)] shadow-sm p-8">
                                    <div className="grid grid-cols-1 gap-12">
                                        <Input
                                            label="Proposition Title"
                                            placeholder="e.g. Enterprise Cloud Infrastructure Redesign"
                                            value={offerName}
                                            onChange={(e) => setOfferName(e.target.value)}
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <Select
                                                label="Strategic Client"
                                                value={selectedCustomer?.id || ''}
                                                onChange={(e) => setSelectedCustomer(customers.find(c => c.id === parseInt(e.target.value)))}
                                                options={[
                                                    { value: '', label: 'Select recipient directory...' },
                                                    ...customers.map(c => ({ value: c.id, label: c.company_name }))
                                                ]}
                                            />
                                            <Select
                                                label="Configuration Mode"
                                                value={selectedPackage}
                                                onChange={(e) => handlePackageChange(e.target.value)}
                                                options={[
                                                    { value: 'custom', label: 'Bespoke Configuration' },
                                                    ...packagesList.map(p => ({ value: p.id, label: p.name }))
                                                ]}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <Select
                                                label="Interactions Language"
                                                value={offerLanguage}
                                                onChange={(e) => setOfferLanguage(e.target.value)}
                                                options={[
                                                    { value: 'de', label: 'German (International)' },
                                                    { value: 'fr', label: 'French (International)' }
                                                ]}
                                            />
                                            <Input
                                                label="Proposal Validity"
                                                type="date"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mb-8">
                                    <h2 className="text-3xl font-extrabold text-[var(--text-main)] mb-2">Strategic Context</h2>
                                    <p className="text-[var(--text-secondary)] font-medium">Capture internal notes and strategic requirements handled by the team.</p>
                                </div>
                                <Card className="border-[var(--border)] shadow-sm p-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] shadow-sm">
                                                <Save size={20} />
                                            </div>
                                            <label className="text-[13px] font-extrabold text-[var(--text-main)] uppercase tracking-[0.1em]">Internal Strategic Notes</label>
                                        </div>
                                        <textarea
                                            className="w-full bg-[var(--bg-main)] border border-[var(--border)] rounded-[var(--radius-md)] py-4 px-6 text-[15px] font-medium min-h-[240px] focus:bg-white focus:ring-4 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition-all outline-none leading-relaxed"
                                            placeholder="Capture key strategic drivers, risk assessments, or timeline constraints for your team. These notes will stay internal and sync to the Project."
                                            value={internalNotes}
                                            onChange={(e) => setInternalNotes(e.target.value)}
                                        />
                                        <div className="flex items-center gap-3 pt-2 text-[var(--text-muted)] text-[13px]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                                            <span>Private & Internal Only</span>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}



                        {step === 3 && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mb-8 flex justify-between items-end">
                                    <div>
                                        <h2 className="text-3xl font-extrabold text-[var(--text-main)] mb-2">Service Selection</h2>
                                        <p className="text-[var(--text-secondary)] font-medium">Engineer the value proposition by selecting core modules.</p>
                                    </div>
                                    {suggestions.length > 0 && (
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--primary-light)] border border-[var(--primary)]/10 animate-pulse">
                                            <Zap size={18} className="text-[var(--primary)]" />
                                            <span className="text-[13px] text-[var(--primary)] font-bold">{suggestions[0].text}</span>
                                            <Button variant="primary" size="sm" className="h-8 py-0 shadow-sm" onClick={() => toggleService(servicesList.find(s => s.id === suggestions[0].id))}>
                                                Add Now
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {servicesList.map(s => {
                                        const isSelected = !!selectedServices.find(ss => ss.id === s.id);
                                        const selectedVariantId = isSelected ? selectedServices.find(ss => ss.id === s.id).variant_id : null;
                                        const hasVariants = s.variants && s.variants.length > 0;

                                        return (
                                            <div key={s.id} className={`group border-[2px] rounded-2xl transition-all duration-300 ${isSelected ? 'border-[var(--primary)] bg-[var(--primary-light)]/30 shadow-md' : 'border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--bg-main)]'}`}>
                                                <div className="p-6 flex items-center gap-6">
                                                    <div
                                                        onClick={() => toggleService(s)}
                                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border)] bg-white group-hover:border-[var(--primary)]/50'}`}
                                                    >
                                                        {isSelected && <Check size={16} className="text-white" />}
                                                    </div>
                                                    <div className="flex-1 cursor-pointer" onClick={() => toggleService(s)}>
                                                        <div className="font-extrabold text-[var(--text-main)] text-[16px] mb-1">{offerLanguage === 'de' ? s.name_de : s.name_fr}</div>
                                                        <div className="text-[12px] text-[var(--text-muted)] font-bold flex items-center gap-2 uppercase tracking-tight">
                                                            <span className="px-2 py-0.5 rounded bg-white border border-[var(--border)] shadow-xs">{s.category}</span>
                                                            {!hasVariants && <span className="text-[var(--primary)] font-extrabold">• {formatCurrency(s.price)}</span>}
                                                        </div>
                                                    </div>
                                                    {isSelected && !hasVariants && (
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Quantity</span>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                className="w-20 bg-white border border-[var(--border)] rounded-lg py-2 px-3 text-[14px] font-bold focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                                                                value={selectedServices.find(ss => ss.id === s.id).quantity}
                                                                onChange={(e) => updateQuantity(s.id, e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {hasVariants && isSelected && (
                                                    <div className="px-14 pb-6 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {s.variants.map(v => (
                                                                <div
                                                                    key={v.id}
                                                                    onClick={() => selectVariant(s, v)}
                                                                    className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all border-[2px] ${selectedVariantId === v.id ? 'bg-white border-[var(--primary)] shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}
                                                                >
                                                                    <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedVariantId === v.id ? 'border-[var(--primary)]' : 'border-[var(--border)]'}`}>
                                                                        {selectedVariantId === v.id && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="text-[14px] font-extrabold text-[var(--text-main)] mb-1">{v.name}</div>
                                                                        <div className="text-[12px] text-[var(--text-secondary)] font-bold">{formatCurrency(v.price)} <span className="opacity-50 mx-1">•</span> <span className="uppercase text-[10px] tracking-wider">{v.billing_cycle}</span></div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center gap-4 py-3 border-t border-[var(--primary)]/10">
                                                            <span className="text-[12px] font-extrabold text-[var(--text-muted)] uppercase tracking-widest">Adjust Allocation:</span>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                className="w-20 bg-white border border-[var(--border)] rounded-lg py-2 px-3 text-[14px] font-bold"
                                                                value={selectedServices.find(ss => ss.id === s.id).quantity}
                                                                onChange={(e) => updateQuantity(s.id, e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="mb-8">
                                    <h2 className="text-3xl font-extrabold text-[var(--text-main)] mb-2">Finalization & Logic</h2>
                                    <p className="text-[var(--text-secondary)] font-medium">Apply strategic adjustments and document internal considerations.</p>
                                </div>
                                <Card className="border-[var(--border)] shadow-sm space-y-12 p-8">
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-[var(--danger-bg)] text-[var(--danger)] shadow-sm">
                                                <Zap size={22} />
                                            </div>
                                            <h4 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.15em]">Strategic Incentive Engagement</h4>
                                        </div>
                                        <Input
                                            type="number"
                                            value={discountPercent}
                                            onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                            placeholder="0.00"
                                            className="max-w-[320px]"
                                            label="Adjustment Magnitude (%)"
                                        />
                                        <p className="text-[13px] text-[var(--text-muted)] font-medium leading-relaxed max-w-[480px]">Apply a competitive discount to incentivize signing. This will be visible on the final contract as a 'Strategic Rebate'.</p>
                                    </div>


                                </Card>
                            </div>
                        )}

                        <div className="pt-10 border-t border-[var(--border)] flex items-center justify-between">
                            {step > 1 ? (
                                <Button variant="ghost" className="font-extrabold px-8 group" onClick={() => setStep(step - 1)}>
                                    <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> {step === 2 ? "Back to Basics" : "Previous Step"}
                                </Button>
                            ) : <div />}

                            {step < 4 ? (
                                <Button size="lg" className="px-10 font-extrabold shadow-lg" onClick={() => setStep(step + 1)} disabled={step === 1 && !offerName}>
                                    Next Phase <ArrowRight size={18} className="ml-2" />
                                </Button>
                            ) : (
                                <div className="flex flex-col items-end gap-2">
                                    <Button
                                        size="lg"
                                        className="px-12 font-extrabold shadow-xl shadow-[var(--primary)]/20"
                                        onClick={handleSave}
                                        disabled={isSaving || !selectedCustomer}
                                        title={!selectedCustomer ? "Please select a Strategic Client in Step 1" : ""}
                                    >
                                        {isSaving ? 'Synchronizing Data...' : 'Generate Strategic Proposal'} <Check size={18} className="ml-2" />
                                    </Button>
                                    {!selectedCustomer && <p className="text-[11px] text-[var(--danger)] font-bold">Client selection required</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                <aside className="w-[400px] shrink-0">
                    <div className="sticky top-[100px] space-y-8">
                        <div className="bg-white rounded-3xl p-8 border border-[var(--border)] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                            <h3 className="text-[12px] font-extrabold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" /> Proposal Metrics
                            </h3>
                            <div className="space-y-5 mb-10">
                                <div className="flex justify-between items-center">
                                    <span className="text-[14px] text-[var(--text-secondary)] font-bold">Volume Subtotal</span>
                                    <span className="font-extrabold text-[var(--text-main)] text-[16px]">{formatCurrency(totals.subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[14px] text-[var(--text-secondary)] font-bold">Est. Tax Capacity</span>
                                    <span className="font-extrabold text-[var(--text-main)] text-[16px]">{formatCurrency(totals.vat)}</span>
                                </div>
                                {discountPercent > 0 && (
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-[var(--danger-bg)] text-[var(--danger)]">
                                        <span className="text-[13px] font-bold">Applied Discount ({discountPercent}%)</span>
                                        <span className="font-extrabold text-[15px]">-{formatCurrency(totals.subtotal * (discountPercent / 100))}</span>
                                    </div>
                                )}
                            </div>
                            <div className="pt-8 border-t border-[var(--border)] border-dashed flex justify-between items-baseline">
                                <span className="text-[16px] font-extrabold text-[var(--text-main)] uppercase tracking-wider">Net Contract</span>
                                <span className="text-[36px] font-black text-[var(--text-main)] tracking-tighter tabular-nums">{formatCurrency(totals.total)}</span>
                            </div>
                        </div>

                        <Card className="p-6 bg-[var(--bg-main)]/50 border-[2px] border-dashed border-[var(--border)] rounded-2xl">
                            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[var(--border)]/50">
                                <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] animate-pulse" />
                                <span className="text-[11px] font-extrabold text-[var(--text-main)] uppercase tracking-[0.15em]">Live Selection Architecture</span>
                            </div>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {selectedServices.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <Plus size={32} className="mx-auto text-[var(--text-muted)] opacity-20 mb-3" />
                                        <p className="text-[13px] text-[var(--text-muted)] font-medium italic">Architect your solution by selecting services from the directory.</p>
                                    </div>
                                ) : (
                                    selectedServices.map(s => (
                                        <div key={s.id} className="flex justify-between items-start text-[14px] p-2 hover:bg-white rounded-lg transition-colors group/item">
                                            <div className="min-w-0 pr-4">
                                                <div className="font-extrabold text-[var(--text-main)] truncate group-hover/item:text-[var(--primary)] transition-colors">{s.item_name || (offerLanguage === 'de' ? s.name_de : s.name_fr)}</div>
                                                <div className="text-[12px] text-[var(--text-muted)] font-bold mt-0.5">{s.quantity} units <span className="opacity-50 mx-1">@</span> {formatCurrency(s.unit_price)}</div>
                                            </div>
                                            <div className="font-black text-[var(--text-main)] whitespace-nowrap mt-0.5">
                                                {formatCurrency(s.quantity * s.unit_price)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>
                </aside>
            </div>
            <ConfirmationDialog
                isOpen={showVersionModal}
                onClose={() => setShowVersionModal(false)}
                onConfirm={executeSave}
                title="Create New Revision?"
                message={`This offer has already been ${offerStatus}. Saving changes will create a new version (Revision ${versionInfo ? versionInfo.number + 1 : 2}) and reset its status to draft. The current version will be archived.`}
                confirmText="Create Revision"
            />
        </div>
    );
};

export default OfferWizardPage;
