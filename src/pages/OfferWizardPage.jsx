import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import logger from '../utils/logger';
import { dataService } from '../data/dataService';
import { calculateTotals, formatCurrency } from '../utils/pricingEngine';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Textarea from '../components/ui/Textarea';
import { Check, Zap, ArrowLeft, ArrowRight, Save, Plus, AlertCircle, AlertTriangle, ChevronDown, Info, Settings, DollarSign, Trash2, HelpCircle, Lock, Settings2, FileText, Copy, GitCompare, Percent } from 'lucide-react';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import Badge from '../components/ui/Badge';
import { toast } from 'react-hot-toast';

const PrintItemCard = ({ item, product, onUpdateSpec, onUpdateQuantity, onUpdateItem, onRemove, onRefreshParams, globalParams, onDuplicate, onCompare, compact = false }) => {
    const [showSpecs, setShowSpecs] = useState(true);
    const [isAddingNew, setIsAddingNew] = useState(null); // { key, value }

    if (!product) return null;

    const selections = item.print_selections || {};
    const supplierTotal = item.supplier_price || 0;
    const margin = item.margin || 0;
    const finalTotal = supplierTotal > 0 ? supplierTotal * (1 + margin / 100) : 0;
    const unitPrice = finalTotal / (item.quantity || 1);

    const specKeys = [
        { key: 'format', label: 'Format' },
        { key: 'paper_type', label: 'Paper' },
        { key: 'weight', label: 'Weight' },
        { key: 'finish', label: 'Finish' },
        { key: 'color_mode', label: 'Color' },
        { key: 'sides', label: 'Sides' },
        { key: 'lamination', label: 'Lamination' },
        { key: 'round_corners', label: 'Corners' },
        { key: 'fold', label: 'Fold' },
        { key: 'binding', label: 'Binding' },
        { key: 'other', label: 'Other' }
    ];

    const handleCreateValue = async (key, value) => {
        if (!value) return;
        try {
            await dataService.savePrintParameter({
                spec_key: key,
                value: value,
                sort_order: 0
            });
            onUpdateSpec(key, value);
            setIsAddingNew(null);
            if (onRefreshParams) onRefreshParams();
        } catch (err) {
            console.error(err);
            toast.error('Failed to add spec value to global parameters');
        }
    };

    const groupedParams = (globalParams || []).reduce((acc, p) => {
        if (!acc[p.spec_key]) acc[p.spec_key] = [];
        acc[p.spec_key].push(p.value);
        return acc;
    }, {});

    const specSummary = specKeys
        .filter(sk => selections[sk.key])
        .map(sk => `${sk.label}: ${selections[sk.key]}`)
        .join(' • ');

    return (
        <div className={`group bg-white border rounded-[calc(var(--radius-lg)*1.5)] overflow-hidden transition-all duration-300 ${!finalPrice ? 'border-amber-200 bg-amber-50/10' : 'border-[var(--border-medium)] shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]'}`}>
            <div className="p-6 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 mb-8">
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--primary)] text-white flex items-center justify-center font-black text-lg shadow-lg shadow-[var(--primary)]/20">
                                {product.name.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-black text-[var(--text-main)] text-[18px] uppercase tracking-tight">{item.item_name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="neutral" className="text-[10px] font-black tracking-widest uppercase">{product.unit_label || 'pcs'}</Badge>
                                    {!finalPrice && (
                                        <Badge variant="warning" className="text-[10px] font-black uppercase py-0.5 px-2 animate-pulse">Price TBD</Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        {(!showSpecs || compact) && specSummary && (
                            <p className="text-[12px] text-[var(--text-secondary)] font-medium italic line-clamp-1 mt-4 px-4 py-2 bg-[var(--bg-app)] rounded-lg border border-[var(--border-subtle)]">
                                {specSummary}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-6">
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-6">
                            <div className="flex flex-col">
                                <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Quantity</label>
                                <div className="relative group/input">
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-24 bg-white border-2 border-[var(--border-medium)] rounded-xl py-2.5 px-3 text-[14px] font-black text-center focus:ring-4 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition-all outline-none"
                                        value={item.quantity}
                                        onChange={(e) => onUpdateQuantity(parseInt(e.target.value) || 1)}
                                    />
                                    <div className="absolute -right-2 -top-2 opacity-0 group-hover/input:opacity-100 transition-opacity">
                                        <Badge variant="primary" className="text-[8px] py-0 px-1">{product.unit_label || 'pcs'}</Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden sm:block w-[1px] h-10 bg-[var(--border-subtle)] self-end mb-1" />

                            <div className="flex flex-col items-center gap-2 mt-auto">
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => onDuplicate && onDuplicate(item)} className="h-10 px-4 text-[11px] font-black uppercase tracking-widest border-[var(--border-medium)] hover:border-[var(--primary)] hover:bg-[var(--primary-light)]">
                                        <Copy size={14} className="mr-2" /> Duplicate
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => onCompare && onCompare(item)} className="h-10 px-4 text-[11px] font-black uppercase tracking-widest border-[var(--border-medium)] hover:border-[var(--primary)] hover:bg-[var(--primary-light)]">
                                        <GitCompare size={14} className="mr-2" /> Compare
                                    </Button>
                                    <div className="flex gap-1 bg-[var(--bg-app)] p-1 rounded-xl border border-[var(--border-subtle)]">
                                        <Button variant="ghost" size="icon-sm" onClick={() => setShowSpecs(!showSpecs)} className={`rounded-lg ${showSpecs ? 'text-[var(--primary)] bg-white shadow-sm' : 'text-[var(--text-muted)]'}`}>
                                            <Settings2 size={16} />
                                        </Button>
                                        <Button variant="ghost" size="icon-sm" onClick={onRemove} className="text-red-500 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PRICING SECTION */}
                <div className="bg-[var(--bg-app)] rounded-2xl p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-8 border border-[var(--border-subtle)]">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em]">Supplier Price</label>
                            <Info size={12} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="relative group/price">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black text-[14px]">€</div>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full bg-white border-2 border-[var(--border-medium)] rounded-xl py-3.5 pl-10 pr-4 text-[16px] font-black text-[var(--text-main)] focus:ring-4 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition-all outline-none"
                                placeholder="0.00"
                                value={item.supplier_price || ''}
                                onChange={(e) => onUpdateItem({ supplier_price: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <label className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em]">Margin (%)</label>
                            <Percent size={12} className="text-[var(--text-muted)]" />
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                className="w-full bg-white border-2 border-[var(--border-medium)] rounded-xl py-3.5 px-4 text-[16px] font-black text-[var(--text-main)] focus:ring-4 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition-all outline-none"
                                placeholder="0"
                                value={item.margin || ''}
                                onChange={(e) => onUpdateItem({ margin: parseFloat(e.target.value) || 0 })}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-black text-[14px]">%</div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-[var(--primary)] uppercase tracking-[0.15em]">Final Calculated Price</label>
                        <div className="bg-white border-2 border-[var(--primary)]/20 rounded-xl py-3.5 px-6 flex items-center justify-between shadow-sm shadow-[var(--primary)]/5">
                            <span className="text-[20px] font-black text-[var(--primary)]">{finalTotal ? formatCurrency(finalTotal) : '€ --'}</span>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tight">Per Unit</span>
                                <span className="text-[12px] font-bold text-[var(--text-main)] italic">{formatCurrency(unitPrice)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SPEC GRID */}
                {showSpecs && !compact && (
                    <div className="mt-8 pt-8 border-t border-[var(--border-subtle)] border-dashed animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-2 mb-6">
                            <Settings2 size={16} className="text-[var(--primary)]" />
                            <h5 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-[0.1em]">Technical Specifications</h5>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                            {specKeys.map(spec => (
                                <div key={spec.key} className="space-y-2">
                                    <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest block ml-0.5">{spec.label}</label>
                                    <Select
                                        value={selections[spec.key] || ''}
                                        className="w-full"
                                        triggerStyle={{ height: '40px', padding: '0 12px', fontSize: '13px', borderRadius: '12px' }}
                                        placeholder="None"
                                        options={[
                                            { value: '', label: 'None' },
                                            ...(groupedParams[spec.key] || []).map(v => ({ value: v, label: v })),
                                            { value: '__new__', label: '+ Add Value...', color: 'var(--primary)' }
                                        ]}
                                        onChange={(e) => {
                                            if (e.target.value === '__new__') {
                                                setIsAddingNew({ key: spec.key, value: '' });
                                            } else {
                                                onUpdateSpec(spec.key, e.target.value);
                                            }
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Inline Add Value UI */}
            {isAddingNew && (
                <div className="px-6 py-4 bg-[var(--primary-bg)] flex items-center justify-between border-t-2 border-[var(--primary)]/20 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 bg-white rounded-lg text-[var(--primary)]">
                            <Plus size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em] mb-1">Catalog Expansion: {isAddingNew.key}</span>
                            <input
                                autoFocus
                                className="bg-white border-2 border-[var(--primary)]/30 rounded-xl px-4 h-10 text-[14px] font-bold outline-none flex-1 min-w-[300px] focus:border-[var(--primary)] transition-all"
                                value={isAddingNew.value}
                                onChange={(e) => setIsAddingNew({ ...isAddingNew, value: e.target.value })}
                                placeholder="Enter new specification value..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateValue(isAddingNew.key, isAddingNew.value);
                                    if (e.key === 'Escape') setIsAddingNew(null);
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 ml-8">
                        <Button variant="ghost" size="sm" onClick={() => setIsAddingNew(null)} className="h-10 text-[--text-muted] px-6 font-bold uppercase tracking-widest">Cancel</Button>
                        <Button variant="primary" size="sm" onClick={() => handleCreateValue(isAddingNew.key, isAddingNew.value)} className="h-10 px-8 font-black uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20">Add & Save</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

const OfferWizardPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const { editId } = useParams();
    const id = editId;

    const [searchParams, setSearchParams] = useSearchParams();
    const urlStep = parseInt(searchParams.get('step')) || 1;
    const [step, _setStep] = useState(urlStep);

    const setStep = (newStep) => {
        _setStep(newStep);
        setSearchParams(prev => {
            prev.set('step', newStep);
            return prev;
        }, { replace: true });
        logger.route('OfferWizard Step Transition', { step: newStep, offerId: id });
    };

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Data handling
    const [customers, setCustomers] = useState([]);
    const [servicesList, setServicesList] = useState([]);
    const [printList, setPrintList] = useState([]);
    const [packagesList, setPackagesList] = useState([]);
    const [printParameters, setPrintParameters] = useState([]);

    // Form State
    const [offerName, setOfferName] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedPackage, setSelectedPackage] = useState('custom');
    const [offerLanguage, setOfferLanguage] = useState('en');
    const [dueDate, setDueDate] = useState('');
    const [internalNotes, setInternalNotes] = useState('');
    const [strategicNotes, setStrategicNotes] = useState('');
    const [selectedServices, setSelectedServices] = useState([]);
    const [discountPercent, setDiscountPercent] = useState(0);
    const [versionInfo, setVersionInfo] = useState(null);
    const [offerStatus, setOfferStatus] = useState('draft');
    const [showVersionModal, setShowVersionModal] = useState(false);
    const [showUnsetPriceModal, setShowUnsetPriceModal] = useState(false);
    const [expandedSections, setExpandedSections] = useState([]);
    const isInitialMount = React.useRef(true);
    const lastSavedState = React.useRef(null);

    const loadData = useCallback(async () => {
        try {
            const [cData, sData, settingsData, pData, printData, paramsData] = await Promise.all([
                dataService.getCustomers(),
                dataService.getServices(),
                dataService.getSettings(),
                dataService.getPackages(),
                dataService.getPrintProducts(),
                dataService.getPrintParameters()
            ]);
            setCustomers(cData);
            setServicesList(sData);
            setPackagesList(pData || []);
            setPrintList(printData || []);
            setPrintParameters(paramsData || []);

            if (id) {
                logger.data('Loading existing offer', { offerId: id });
                const offer = await dataService.getOfferById(id);
                if (offer) {
                    setOfferName(offer.name || '');
                    setSelectedCustomer(offer.customer_id);
                    setDueDate(offer.valid_until ? offer.valid_until.split('T')[0] : '');
                    setInternalNotes(offer.internal_notes || '');
                    setStrategicNotes(offer.strategic_notes || '');
                    setOfferLanguage(offer.language || 'en');
                    setDiscountPercent(offer.discount_total || 0);
                    setOfferStatus(offer.status || 'draft');

                    // Map items
                    const mappedItems = (offer.items || []).map(item => ({
                        ...item,
                        id: item.id, // Keep backend ID
                        type: item.type,
                        item_name: item.item_name,
                        print_id: item.print_id,
                        price: item.price,
                        quantity: item.quantity,
                        variant_id: item.variant_id,
                        group_id: item.group_id,
                        group_type: item.group_type,
                        print_selections: item.print_specs ? JSON.parse(item.print_specs) : {},
                        supplier_price: item.supplier_price,
                        margin: item.margin,
                        is_selected: true
                    }));
                    setSelectedServices(mappedItems);
                    lastSavedState.current = JSON.stringify({
                        name: offer.name,
                        customer_id: offer.customer_id,
                        valid_until: offer.valid_until,
                        internal_notes: offer.internal_notes,
                        strategic_notes: offer.strategic_notes,
                        language: offer.language,
                        discount_total: offer.discount_total,
                        items: mappedItems
                    });
                } else {
                    logger.error('DATA', 'Offer not found', { offerId: id });
                    toast.error('Offer not found');
                    navigate('/offers');
                }
            } else {
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
        } catch (err) {
            logger.error('DATA', 'Failed to load wizard data', err);
            toast.error('Failed to load offer data');
        } finally {
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const executeSave = async (isAutosave = false) => {
        if (!editId && isAutosave) return; // Don't autosave' new offers until first manual save
        if (isSaving) return;

        const currentTotals = calculateTotals(selectedServices, discountPercent, selectedCustomer?.country || 'DE');

        const offerData = {
            customer_id: selectedCustomer?.id || null,
            offer_name: offerName,
            language: offerLanguage,
            due_date: dueDate,
            status: offerStatus,
            internal_notes: internalNotes,
            strategic_notes: strategicNotes,
            discount_percent: discountPercent,
            ...currentTotals,
            items: selectedServices.map(s => {
                const base = {
                    service_id: s.type === 'print' ? s.print_id : s.id,
                    variant_id: s.variant_id || null,
                    quantity: s.quantity,
                    unit_price: s.unit_price || 0,
                    total_price: (s.quantity || 1) * (s.unit_price || 0),
                    billing_cycle: s.billing_cycle || 'one_time',
                    item_name: s.item_name || (offerLanguage === 'de' ? s.name_de : s.name_fr),
                    item_description: s.item_description || (offerLanguage === 'de' ? s.description_de : s.description_fr),
                    type: s.type || 'service',
                    group_id: s.group_id || null,
                    group_type: s.group_type || null,
                    price_mode: s.price_mode || 'CALCULATED',
                    is_selected: s.is_selected === undefined ? true : s.is_selected,
                    specs: s.type === 'print' ? s.print_selections : null,
                    supplier_price: s.supplier_price || 0,
                    margin: s.margin || 0
                };

                if (s.type === 'print') {
                    base.print_note = s.print_note;
                    // Calculate correct prices for storage
                    const up = base.supplier_price * (1 + base.margin / 100);
                    base.unit_price = up;
                    base.total_price = up * (s.quantity || 0);
                }

                return base;
            })
        };

        // Deep check to avoid redundant saves
        const stateString = JSON.stringify(offerData);
        if (lastSavedState.current === stateString) return;

        if (!isAutosave) setIsSaving(true);

        try {
            if (editId) {
                await dataService.updateOffer(editId, offerData);
                lastSavedState.current = stateString;
                if (!isAutosave) navigate(`/offer/preview/${editId}`);
            } else if (!isAutosave) {
                const res = await dataService.saveOffer(offerData);
                navigate(`/offer/preview/${res.id}`);
            }
        } catch (error) {
            console.error(isAutosave ? "Autosave failed:" : "Save failed:", error);
        } finally {
            if (!isAutosave) setIsSaving(false);
        }
    };

    // Silent Autosave Effect
    useEffect(() => {
        if (isInitialMount.current) {
            if (!isLoading) isInitialMount.current = false;
            return;
        }

        const timer = setTimeout(() => {
            executeSave(true);
        }, 1500); // 1.5s debounce

        return () => clearTimeout(timer);
    }, [selectedServices, selectedCustomer, offerName, offerLanguage, dueDate, internalNotes, strategicNotes, discountPercent, isLoading]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();

        // Validation Logging
        if (process.env.NODE_ENV === 'development') {
            console.log('[OfferWizard] Save attempted. State:', {
                offerName,
                selectedCustomer: selectedCustomer?.company_name,
                servicesCount: selectedServices.length,
                internalNotes: internalNotes?.length,
                strategicNotes: strategicNotes?.length,
                discountPercent
            });
        }

        if (editId && (offerStatus === 'sent' || offerStatus === 'signed')) {
            setShowVersionModal(true);
            return;
        }

        if (!selectedCustomer) {
            toast.error("Please select a Strategic Client in Step 1 before generating.");
            return;
        }

        await executeSave(false);
    };

    const handlePackageChange = (pkgId) => {
        setSelectedPackage(pkgId);
        if (pkgId !== 'custom') {
            const pkg = packagesList.find(p => p.id === parseInt(pkgId));
            if (!pkg || !pkg.items) return;

            const pkgServices = pkg.items.map(item => {
                const baseService = servicesList.find(s => s.id === item.service_id);
                if (!baseService) return null;
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
        const hasWebsite = selectedServices.some(s => s.id === 1);
        const hasHosting = selectedServices.some(s => s.id === 3);
        if (hasWebsite && !hasHosting) {
            newSuggestions.push({
                id: 3,
                text: 'Recommendation: Add hosting services?'
            });
        }
        return newSuggestions;
    }, [selectedServices, offerLanguage]);

    const toggleService = (service) => {
        setSelectedServices(prev => {
            const exists = prev.find(s => s.id === service.id && s.type !== 'print');
            if (exists) return prev.filter(s => s.id !== service.id || s.type === 'print');

            if (service.variants && service.variants.length > 0) {
                const v = service.variants.find(v => v.is_default) || service.variants[0];
                return [...prev, {
                    ...service,
                    variant_id: v.id,
                    quantity: 1,
                    unit_price: v.price,
                    item_name: `${offerLanguage === 'de' ? service.name_de : service.name_fr}: ${v.name}`,
                    billing_cycle: v.billing_cycle,
                    item_description: v.description,
                    type: 'service'
                }];
            }
            return [...prev, { ...service, quantity: 1, unit_price: service.price, type: 'service' }];
        });
    };

    const addPrintItem = (product, group_type = null, group_id = null) => {
        const newItem = {
            id: `print-${Date.now()}-${Math.random()}`,
            type: 'print',
            print_id: product.id,
            item_name: product.name,
            quantity: 1,
            price: 0,
            unit_price: 0,
            print_selections: {},
            group_id,
            group_type,
            is_selected: true,
            supplier_price: 0,
            margin: 0
        };
        setSelectedServices(prev => [...prev, newItem]);
        toast.success(`${product.name} added to configuration`);
        logger.info('WIZARD', 'Print item added', { productId: product.id, group_id });

        // Scroll to deliverables section
        setTimeout(() => {
            const el = document.getElementById('print-deliverables-header');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };
    const removePrintItem = (itemId) => {
        setSelectedServices(prev => prev.filter(s => s.id !== itemId));
    };

    const togglePrintProduct = (product) => {
        const isSelected = !!selectedServices.find(ss => ss.print_id === product.id && ss.type === 'print');
        if (isSelected) {
            setSelectedServices(prev => prev.filter(ss => !(ss.print_id === product.id && ss.type === 'print')));
        } else {
            addPrintItem(product);
        }
    };

    const duplicatePrintItem = (item) => {
        setSelectedServices(prev => {
            const { id, group_id, group_type, ...rest } = item;
            const newItem = {
                ...rest,
                id: `print-${Date.now()}-${Math.random()}`,
                group_id: null,
                group_type: null,
                is_selected: true
            };
            return [...prev, newItem];
        });
    };

    const comparePrintItem = (item) => {
        if (!item.group_id) {
            const groupId = `group-${Date.now()}`;
            setSelectedServices(prev => {
                const newItem = {
                    ...item,
                    id: `print-${Date.now()}-${Math.random()}`,
                    group_id: groupId,
                    group_type: 'OR',
                    is_selected: false
                };
                return prev.map(s => s.id === item.id ? { ...s, group_id: groupId, group_type: 'OR', is_selected: true } : s).concat(newItem);
            });
        }
    };

    const updatePrintSpec = (offerItemId, key, value) => {
        setSelectedServices(prev => prev.map(s => {
            if (s.id === offerItemId) {
                return {
                    ...s,
                    print_selections: { ...s.print_selections, [key]: value }
                };
            }
            return s;
        }));
    };


    const selectVariant = (service, variant) => {
        setSelectedServices(prev => {
            const existing = prev.find(s => s.id === service.id && s.type !== 'print');
            const others = prev.filter(s => !(s.id === service.id && s.type !== 'print'));
            return [...others, {
                ...service,
                variant_id: variant.id,
                quantity: existing ? existing.quantity : 1,
                unit_price: variant.price,
                item_name: `${offerLanguage === 'de' ? service.name_de : service.name_fr}: ${variant.name}`,
                billing_cycle: variant.billing_cycle,
                item_description: variant.description,
                type: 'service'
            }].sort((a, b) => a.id - b.id);
        });
    };

    const updateQuantity = (id, newQty) => {
        const qty = Math.max(1, parseInt(newQty) || 1);
        setSelectedServices(prev => prev.map(s => {
            if (s.id === id) {
                return { ...s, quantity: qty };
            }
            return s;
        }));
    };

    const totals = calculateTotals(selectedServices, discountPercent, selectedCustomer?.country || 'DE');

    const groupedServices = useMemo(() => {
        const sections = {
            'Design': [],
            'Web': [],
            'Maintenance': []
        };

        servicesList.forEach(s => {
            const cat = (s.category || '').toLowerCase();
            if (cat.includes('maintenance') || cat.includes('support')) {
                sections['Maintenance'].push(s);
            } else if (cat.includes('web') || cat.includes('hosting') || cat.includes('dev')) {
                sections['Web'].push(s);
            } else {
                // Default to Design for everything else (Branding, Strategy etc)
                sections['Design'].push(s);
            }
        });

        // Sort items in each section
        Object.keys(sections).forEach(key => {
            sections[key].sort((a, b) => {
                const nameA = (offerLanguage === 'de' ? a.name_de : a.name_fr) || '';
                const nameB = (offerLanguage === 'de' ? b.name_de : b.name_fr) || '';
                return nameA.localeCompare(nameB);
            });
        });

        return sections;
    }, [servicesList, offerLanguage]);

    const groupedPrintItems = useMemo(() => {
        const prints = selectedServices.filter(s => s.type === 'print');
        const groups = {};
        const individualItems = [];

        prints.forEach(p => {
            if (p.group_id) {
                if (!groups[p.group_id]) groups[p.group_id] = { items: [], type: p.group_type };
                groups[p.group_id].items.push(p);
            } else {
                individualItems.push(p);
            }
        });

        const finalGroups = [];
        Object.entries(groups).forEach(([id, data]) => {
            if (data.items.length <= 1) {
                individualItems.push(...data.items.map(it => ({ ...it, group_id: null, group_type: null })));
            } else {
                finalGroups.push({ id, ...data });
            }
        });

        return {
            groups: finalGroups,
            individualItems: individualItems.sort((a, b) => (a.id < b.id ? -1 : 1))
        };
    }, [selectedServices]);

    if (isLoading) {
        return (
            <div className="page-container animate-pulse" style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <div className="flex gap-12 pt-4">
                    <main className="flex-1 min-w-0">
                        <div className="h-20 bg-slate-100 rounded-2xl mb-12" />
                        <div className="space-y-8">
                            <div className="h-64 bg-slate-50 rounded-[calc(var(--radius-lg)*2)]" />
                            <div className="h-64 bg-slate-50 rounded-[calc(var(--radius-lg)*2)]" />
                        </div>
                    </main>
                    <aside className="w-[400px] shrink-0 hidden xl:block">
                        <div className="h-96 bg-slate-50 rounded-[calc(var(--radius-lg)*2)]" />
                    </aside>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div className="flex gap-12 pt-4">
                <main className="flex-1 min-w-0">
                    {/* Stepper Header */}
                    <div className="flex flex-wrap items-center justify-between gap-y-6 mb-12 border-b border-[var(--border)] pb-8">
                        {[1, 2, 3, 4].map(s => (
                            <React.Fragment key={s}>
                                <div className={`flex items-center gap-3 transition-all shrink-0 ${step >= s ? 'opacity-100' : 'opacity-40'}`}>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-[14px] shadow-sm transition-all ${step >= s ? 'bg-[var(--primary)] text-white scale-110' : 'bg-[var(--bg-main)] text-[var(--text-muted)] border border-[var(--border)]'}`}>
                                        {s}
                                    </div>
                                    <span className={`font-bold text-[14px] uppercase tracking-wider ${step >= s ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                                        {s === 1 ? "Basics" : s === 2 ? "Context" : s === 3 ? "Services" : "Finalize"}
                                    </span>
                                </div>
                                {s < 4 && (
                                    <div className="flex-1 min-w-[20px] max-w-[60px] h-[2px] bg-[var(--border)] mx-2 opacity-30 hidden sm:block" />
                                )}
                            </React.Fragment>
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

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <Select
                                                label="Strategic Client"
                                                value={selectedCustomer?.id || ''}
                                                onChange={(e) => {
                                                    const customer = customers.find(c => c.id === parseInt(e.target.value));
                                                    setSelectedCustomer(customer);
                                                    if (customer && customer.language) {
                                                        setOfferLanguage(customer.language);
                                                    }
                                                }}
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

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
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
                                        <Textarea
                                            className="bg-[var(--bg-main)] border border-[var(--border)] rounded-[var(--radius-md)] py-4 px-6 text-[15px] font-medium min-h-[240px] focus:bg-white focus:ring-4 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)] transition-all outline-none leading-relaxed"
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
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--primary-light)] border border-[var(--primary)]/10">
                                            <Zap size={18} className="text-[var(--primary)]" />
                                            <span className="text-[13px] text-[var(--primary)] font-bold">{suggestions[0].text}</span>
                                            <Button variant="primary" size="sm" className="h-8 py-0 shadow-sm" onClick={() => toggleService(servicesList.find(s => s.id === suggestions[0].id))}>
                                                Add Now
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* COLLAPSIBLE SECTIONS */}
                                {['Design', 'Web', 'Maintenance', 'Print'].map(sectionName => {
                                    const isExpanded = expandedSections.includes(sectionName);
                                    const services = sectionName === 'Print' ? [] : groupedServices[sectionName];
                                    const printProducts = sectionName === 'Print' ? printList : [];

                                    const totalSelected = sectionName === 'Print'
                                        ? selectedServices.filter(s => s.type === 'print').length
                                        : selectedServices.filter(s => s.type !== 'print' && services.some(serv => serv.id === s.id)).length;

                                    if (sectionName !== 'Print' && services.length === 0) return null;
                                    if (sectionName === 'Print' && printProducts.length === 0) return null;

                                    return (
                                        <div key={sectionName} className="space-y-4 mb-4">
                                            <button
                                                onClick={() => setExpandedSections(prev => prev.includes(sectionName) ? prev.filter(s => s !== sectionName) : [...prev, sectionName])}
                                                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all group shadow-sm ${isExpanded ? 'bg-white border-[var(--primary)]' : 'bg-[var(--bg-surface)] border-[var(--border-medium)] hover:border-[var(--primary)]/50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-6 rounded-full transition-colors ${isExpanded ? 'bg-[var(--primary)]' : 'bg-[var(--border-medium)] group-hover:bg-[var(--primary)]/30'}`} />
                                                    <h3 className={`text-[15px] font-black uppercase tracking-[0.1em] transition-colors ${isExpanded ? 'text-[var(--text-main)]' : 'text-[var(--text-secondary)]'}`}>{sectionName}</h3>
                                                    <Badge variant={isExpanded ? "primary" : "neutral"} className="text-[10px] py-0 px-2 font-black">{totalSelected} selected</Badge>
                                                </div>
                                                <div className={`p-1.5 rounded-lg transition-all ${isExpanded ? 'bg-[var(--primary-light)] text-[var(--primary)]' : 'bg-[var(--bg-app)] text-[var(--text-muted)] group-hover:bg-[var(--primary-light)] group-hover:text-[var(--primary)]'}`}>
                                                    <ChevronDown size={18} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                    {sectionName !== 'Print' ? (
                                                        <div className="space-y-3 pt-2">
                                                            {services.map(s => {
                                                                const isSelected = !!selectedServices.find(ss => ss.id === s.id && ss.type !== 'print');
                                                                const selectedVariantId = isSelected ? selectedServices.find(ss => ss.id === s.id && ss.type !== 'print').variant_id : null;
                                                                const hasVariants = s.variants && s.variants.length > 0;

                                                                return (
                                                                    <div key={s.id} className={`group border-[2px] rounded-2xl transition-all duration-300 ${isSelected ? 'border-[var(--primary)] bg-[var(--primary-light)]/30 shadow-md' : 'border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--bg-main)]'}`}>
                                                                        <div className="p-6 flex items-center gap-6">
                                                                            <div onClick={() => toggleService(s)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border)] bg-white group-hover:border-[var(--primary)]/50'}`}>
                                                                                {isSelected && <Check size={16} className="text-white" />}
                                                                            </div>
                                                                            <div className="flex-1 cursor-pointer" onClick={() => toggleService(s)}>
                                                                                <div className="font-extrabold text-[var(--text-main)] text-[16px] mb-1">{offerLanguage === 'de' ? s.name_de : s.name_fr}</div>
                                                                                <div className="text-[12px] text-[var(--text-muted)] font-bold flex items-center gap-2 uppercase tracking-tight">
                                                                                    {!hasVariants && <span className="text-[var(--primary)] font-extrabold">{formatCurrency(s.price)}</span>}
                                                                                    {hasVariants && <span className="text-[var(--text-muted)] italic">Multiple tiers available</span>}
                                                                                </div>
                                                                            </div>
                                                                            {isSelected && !hasVariants && (
                                                                                <div className="flex items-center gap-3">
                                                                                    <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Quantity</span>
                                                                                    <input type="number" min="1" className="w-20 bg-white border border-[var(--border)] rounded-lg py-2 px-3 text-[14px] font-bold" value={selectedServices.find(ss => ss.id === s.id && ss.type !== 'print').quantity} onChange={(e) => updateQuantity(s.id, e.target.value)} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        {hasVariants && isSelected && (
                                                                            <div className="px-14 pb-6 space-y-4">
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                    {s.variants.map(v => (
                                                                                        <div key={v.id} onClick={() => selectVariant(s, v)} className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all border-[2px] ${selectedVariantId === v.id ? 'bg-white border-[var(--primary)] shadow-sm' : 'bg-transparent border-transparent hover:bg-white/50'}`}>
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
                                                                                    <input type="number" min="1" className="w-20 bg-white border border-[var(--border)] rounded-lg py-2 px-3 text-[14px] font-bold" value={selectedServices.find(ss => ss.id === s.id && ss.type !== 'print').quantity} onChange={(e) => updateQuantity(s.id, e.target.value)} />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-2">
                                                            {printProducts.map(product => (
                                                                <Card key={product.id} className="flex flex-col h-full shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all group border-[var(--border-medium)] hover:border-[var(--primary)]/50 p-5 bg-white rounded-2xl">
                                                                    <div className="mb-6">
                                                                        <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                                                            <Plus size={20} />
                                                                        </div>
                                                                        <h3 className="text-[15px] font-black text-[var(--text-main)] mb-1 uppercase tracking-tight">{product.name}</h3>
                                                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{product.unit_label || 'pcs'}</span>
                                                                    </div>
                                                                    <div className="mt-auto">
                                                                        <Button
                                                                            variant="primary"
                                                                            size="sm"
                                                                            className="w-full text-[11px] font-black h-10 bg-[var(--bg-app)] text-[var(--text-main)] border-[var(--border-medium)] hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-white transition-all uppercase tracking-widest shadow-none hover:shadow-lg hover:shadow-[var(--primary)]/20"
                                                                            onClick={() => addPrintItem(product)}
                                                                        >
                                                                            Add
                                                                        </Button>
                                                                    </div>
                                                                </Card>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}


                                {/* Configured Deliverables Section */}
                                {(groupedPrintItems.individualItems?.length > 0 || groupedPrintItems.groups?.length > 0) && (
                                    <div className="space-y-10 mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center gap-2 mb-8 mt-16 scroll-mt-24">
                                            <div className="w-1.5 h-6 bg-[var(--primary)] rounded-full" />
                                            <h4 id="print-deliverables-header" className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-[0.1em]">Print Deliverables</h4>
                                            <div className="h-[1px] flex-1 bg-[var(--border)] ml-2" />
                                        </div>

                                        <div className="space-y-6">
                                            {/* Individual Items */}
                                            {groupedPrintItems.individualItems?.map(item => (
                                                <PrintItemCard
                                                    key={item.id}
                                                    item={item}
                                                    product={printList.find(p => p.id === item.print_id)}
                                                    globalParams={printParameters}
                                                    onRefreshParams={loadData}
                                                    onUpdateSpec={(key, val) => updatePrintSpec(item.id, key, val)}
                                                    onUpdateQuantity={(val) => updateQuantity(item.id, val)}
                                                    onUpdateItem={(updates) => setSelectedServices(prev => prev.map(s => s.id === item.id ? { ...s, ...updates } : s))}
                                                    onRemove={() => removePrintItem(item.id)}
                                                    onDuplicate={duplicatePrintItem}
                                                    onCompare={comparePrintItem}
                                                />
                                            ))}

                                            {/* Groups (Variants) */}
                                            {groupedPrintItems.groups?.map(group => (
                                                <div key={group.id} className="p-8 rounded-[calc(var(--radius-lg)*2)] border-2 border-[var(--primary)]/10 bg-[var(--primary-light)]/5 shadow-xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                                    <div className="flex items-center justify-between border-b-2 border-dashed border-[var(--primary)]/10 pb-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center">
                                                                <GitCompare size={20} />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-[16px] font-black text-[var(--text-main)] uppercase tracking-widest">Variant Group</h4>
                                                                <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tight">Client will be forced to select one option</p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            className="h-10 px-6 text-[11px] font-black uppercase tracking-widest"
                                                            onClick={() => {
                                                                const firstItem = group.items[0];
                                                                const product = printList.find(p => p.id === firstItem.print_id);
                                                                addPrintItem(product, group.type, group.id);
                                                            }}
                                                        >
                                                            <Plus size={14} className="mr-2" /> Add Variation
                                                        </Button>
                                                    </div>

                                                    <div className="space-y-8">
                                                        {group.items.map((item, idx) => (
                                                            <div key={item.id} className="relative">
                                                                {idx > 0 && (
                                                                    <div className="flex items-center gap-4 py-4 opacity-50">
                                                                        <div className="h-[1px] flex-1 bg-[var(--primary)]/20" />
                                                                        <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.3em]">OR Variation</span>
                                                                        <div className="h-[1px] flex-1 bg-[var(--primary)]/20" />
                                                                    </div>
                                                                )}
                                                                <PrintItemCard
                                                                    item={item}
                                                                    product={printList.find(p => p.id === item.print_id)}
                                                                    globalParams={printParameters}
                                                                    onRefreshParams={loadData}
                                                                    onUpdateSpec={(key, val) => updatePrintSpec(item.id, key, val)}
                                                                    onUpdateQuantity={(val) => updateQuantity(item.id, val)}
                                                                    onUpdateItem={(updates) => setSelectedServices(prev => prev.map(s => s.id === item.id ? { ...s, ...updates } : s))}
                                                                    onRemove={() => removePrintItem(item.id)}
                                                                    onDuplicate={duplicatePrintItem}
                                                                    onCompare={comparePrintItem}
                                                                    compact={true}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
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
                                    <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Previous Step
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
                        <Card className="border-[var(--border)] shadow-xl overflow-hidden bg-white">
                            <div className="p-8 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[12px] font-black text-[var(--text-main)] uppercase tracking-[0.2em]">Live Configuration Metrics</h3>
                                    <div className="px-3 py-1 bg-[var(--primary-light)] text-[var(--primary)] rounded-full text-[11px] font-black uppercase tracking-wider">
                                        Real-time
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-[14px]">
                                        <span className="text-[var(--text-secondary)] font-bold">Volume Total</span>
                                        <span className="font-extrabold text-[var(--text-main)] tabular-nums">{formatCurrency(totals.subtotal)}</span>
                                    </div>
                                    {discountPercent > 0 && (
                                        <div className="flex justify-between items-center text-[14px] text-[var(--danger)]">
                                            <span className="font-bold flex items-center gap-2">
                                                Strategic Rebate <span className="text-[11px] px-1.5 py-0.5 bg-red-50 rounded-lg">-{discountPercent}%</span>
                                            </span>
                                            <span className="font-extrabold tabular-nums">-{formatCurrency(totals.discount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-[14px] text-[var(--text-secondary)]">
                                        <span className="font-bold">Taxation ({selectedCustomer?.country === 'BE' ? '21%' : '0%'})</span>
                                        <span className="font-extrabold tabular-nums">{formatCurrency(totals.vat)}</span>
                                    </div>
                                    <div className="pt-6 border-t border-[var(--border)] flex justify-between items-end">
                                        <div>
                                            <div className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Strategic Value</div>
                                            <div className="text-4xl font-black text-[var(--text-main)] tabular-nums tracking-tighter">
                                                {formatCurrency(totals.total)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[var(--bg-main)] p-8 border-t border-[var(--border)]">
                                <h4 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-6">Manifest Summary</h4>
                                <div className="space-y-6">
                                    {selectedServices.length === 0 ? (
                                        <div className="py-4 text-center border-2 border-dashed border-[var(--border)] rounded-2xl">
                                            <p className="text-[13px] text-[var(--text-muted)] font-bold">No modules selected.</p>
                                        </div>
                                    ) : (
                                        selectedServices.map(s => (
                                            <div key={s.id} className="flex justify-between items-start group">
                                                <div className="flex-1">
                                                    <div className="text-[14px] font-extrabold text-[var(--text-main)] mb-0.5 leading-tight">{s.item_name || (offerLanguage === 'de' ? s.name_de : s.name_fr)}</div>
                                                    <div className="text-[12px] text-[var(--text-muted)] font-bold uppercase tracking-tight">
                                                        {s.quantity}x {formatCurrency(s.unit_price)} <span className="opacity-40 select-none mx-1">•</span> {s.billing_cycle || 'one_time'}
                                                    </div>
                                                </div>
                                                <div className="text-[14px] font-black text-[var(--text-main)] tabular-nums">
                                                    {formatCurrency(s.quantity * s.unit_price)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {selectedCustomer && (
                                    <div className="mt-8 pt-8 border-t border-[var(--border)] border-dashed">
                                        <div className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Client Engagement</div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-[var(--border)] flex items-center justify-center text-[var(--primary)] font-black text-[14px] shadow-sm">
                                                {selectedCustomer.company_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="text-[14px] font-extrabold text-[var(--text-main)]">{selectedCustomer.company_name}</div>
                                                <div className="text-[12px] text-[var(--text-muted)] font-bold">{selectedCustomer.contact_person}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Validation helper */}
                        <div className="px-4 flex items-center gap-3 text-[12px] text-[var(--text-muted)] font-bold">
                            <div className={`w-2 h-2 rounded-full ${selectedCustomer ? 'bg-[var(--success)] shadow-[0_0_8px_var(--success)]' : 'bg-[var(--danger)] animate-pulse'}`} />
                            {selectedCustomer ? 'Configuration valid for sync' : 'Selection required for sync'}
                        </div>
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
            <ConfirmationDialog
                isOpen={showUnsetPriceModal}
                onClose={() => setShowUnsetPriceModal(false)}
                onConfirm={async () => {
                    setShowUnsetPriceModal(false);
                    if (editId && (offerStatus === 'sent' || offerStatus === 'signed')) {
                        setShowVersionModal(true);
                    } else {
                        await executeSave();
                    }
                }}
                title="Items with Pending Price"
                message="You have print items with 'Price TBD'. These will not be included in the financial totals. Proceed with generating the proposal anyway?"
                confirmText="Proceed Anyway"
                cancelText="Adjust Prices"
                type="warning"
            />
        </div>
    );
};

export default OfferWizardPage;
