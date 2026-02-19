import React, { useState, useEffect, useCallback } from 'react';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import Modal from '../components/ui/Modal';
import ServiceForm from '../components/services/ServiceForm';
import BundleForm from '../components/services/BundleForm';
import PrintProductForm from '../components/services/PrintProductForm';
import WebSupportPackageForm from '../components/services/SupportPackageForm';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/common/EmptyState';
import { Plus, Edit2, Trash2, Zap, Box, Layers, AlertTriangle, RefreshCw, Pencil, Cloud, Monitor, Code, Clock, Settings, Search, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ServicesPage = () => {
    const locale = 'en'; // Admin is English-only
    const [activeTab, setActiveTab] = useState('services');
    const [services, setServices] = useState([]);
    const [bundles, setBundles] = useState([]);
    const [printProducts, setPrintProducts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // Service, Bundle, or Print Product
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [printParameters, setPrintParameters] = useState([]);
    const [isParamModalOpen, setIsParamModalOpen] = useState(false);
    const [editingParam, setEditingParam] = useState(null);
    const [error, setError] = useState(null);
    const [settings, setSettings] = useState(null);
    const [supportPackages, setSupportPackages] = useState([]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (statusFilter !== 'all') params.status = statusFilter;

            const [servicesData, bundlesData, printData, paramsData, settingsData, supportData] = await Promise.all([
                dataService.getServices(),
                dataService.getBundles(),
                dataService.getPrintProducts(params),
                dataService.getPrintParameters(),
                dataService.getSettings(),
                dataService.getSupportPackages()
            ]);
            setServices(servicesData || []);
            setBundles(bundlesData || []);
            setPrintProducts(printData || []);
            setPrintParameters(paramsData || []);
            setSupportPackages(supportData || []);
            setSettings(settingsData);
            setError(null);

            // Auto-seed packages if empty
            if ((supportData || []).length === 0 && activeTab === 'support') {
                console.log('Seeding default support packages...');
                const defaults = [
                    { name: '5 Stunden Paket', included_hours: 5, price: 300, is_pay_as_you_go: 0, description: 'Basic support package', category: 'Web', variant_name: 'Standard' },
                    { name: '10 Stunden Paket', included_hours: 10, price: 550, is_pay_as_you_go: 0, description: 'Standard support package', category: 'Web', variant_name: 'Premium' },
                    { name: '20 Stunden Paket', included_hours: 20, price: 1000, is_pay_as_you_go: 0, description: 'Professional support package', category: 'Web', variant_name: 'Enterprise' },
                    { name: '40 Stunden Paket', included_hours: 40, price: 1600, is_pay_as_you_go: 0, description: 'Enterprise support package', category: 'Web', variant_name: 'Ultimate' },
                    { name: 'Pay as you go', is_pay_as_you_go: 1, description: 'Abrechnung nach hinterlegtem Stundenlohn', category: 'Web', variant_name: 'Flex' }
                ];
                for (const pkg of defaults) {
                    await dataService.saveSupportPackage(pkg);
                }
                const freshSupportData = await dataService.getSupportPackages();
                setSupportPackages(freshSupportData);
            }
        } catch (err) {
            console.error("Failed to load data", err);
            setError(err.message || "Failed to load services from the server.");
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, statusFilter, activeTab]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSaveService = async (serviceData) => {
        setIsLoading(true);
        try {
            await dataService.saveService(serviceData);
            loadData();
            setIsModalOpen(false);
            setEditingItem(null);
            toast.success('Service saved successfully!');
        } catch (error) {
            console.error('Failed to save service', error);
            toast.error('Failed to save service.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveBundle = async (bundleData) => {
        setIsLoading(true);
        try {
            await dataService.saveBundle(bundleData);
            loadData();
            setIsModalOpen(false);
            setEditingItem(null);
            toast.success('Bundle saved successfully!');
        } catch (error) {
            console.error('Failed to save bundle', error);
            toast.error('Failed to save bundle.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSavePrintProduct = async (productData) => {
        setIsLoading(true);
        try {
            await dataService.savePrintProduct(productData);
            await loadData();
            setIsModalOpen(false);
            setEditingItem(null);
            toast.success('Print product saved successfully!');
        } catch (error) {
            console.error('Failed to save print product', error);
            toast.error('Failed to save print product.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveParameter = async (paramData) => {
        setIsLoading(true);
        try {
            await dataService.savePrintParameter(paramData);
            await loadData();
            setIsParamModalOpen(false);
            setEditingParam(null);
            toast.success('Parameter saved successfully!');
        } catch (error) {
            console.error('Failed to save parameter', error);
            toast.error('Failed to save parameter.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSupportPackage = async (pkgData) => {
        setIsLoading(true);
        try {
            await dataService.saveSupportPackage(pkgData);
            await loadData();
            setIsModalOpen(false);
            setEditingItem(null);
            toast.success('Package saved successfully!');
        } catch (error) {
            console.error('Failed to save support package', error);
            toast.error('Failed to save support package.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (item, type) => {
        setDeleteTarget({ ...item, type });
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsLoading(true);
        try {
            if (deleteTarget.type === 'service') {
                await dataService.deleteService(deleteTarget.id);
            } else if (deleteTarget.type === 'bundle') {
                await dataService.deleteBundle(deleteTarget.id);
            } else if (deleteTarget.type === 'print') {
                await dataService.deletePrintProduct(deleteTarget.id);
            } else if (deleteTarget.type === 'support') {
                await dataService.deleteSupportPackage(deleteTarget.id);
            }
            setDeleteTarget(null);
            await loadData();
            toast.success('Item deleted successfully!');
        } catch (error) {
            console.error('Failed to delete item', error);
            toast.error('Failed to delete item.');
        } finally {
            setIsLoading(false);
        }
        setIsDeleteDialogOpen(false);
    };

    const handleDeleteParameter = async (id) => {
        setIsLoading(true);
        try {
            await dataService.deletePrintParameter(id);
            await loadData();
            toast.success('Parameter deleted successfully!');
        } catch (error) {
            console.error('Failed to delete parameter', error);
            toast.error('Failed to delete parameter.');
        } finally {
            setIsLoading(false);
        }
    };

    const openModal = (item = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const renderPrintParameters = () => {
        const groups = (printParameters || []).reduce((acc, param) => {
            if (!acc[param.spec_key]) acc[param.spec_key] = [];
            acc[param.spec_key].push(param);
            return acc;
        }, {});

        const specLabels = {
            format: 'Format',
            paper_type: 'Paper Type',
            weight: 'Weight / Grammage',
            finish: 'Finish',
            color_mode: 'Color Mode',
            sides: 'Sides',
            lamination: 'Lamination',
            round_corners: 'Round Corners',
            fold: 'Fold',
            binding: 'Binding',
            other: 'Other Custom'
        };

        if (printParameters.length === 0 && Object.keys(groups).length === 0) {
            return (
                <div className="col-span-3">
                    <EmptyState
                        icon={Box}
                        title="No parameters defined"
                        description="Global print parameters define the dropdown options for print specifications."
                    />
                </div>
            );
        }

        return Object.entries(specLabels).map(([key, label]) => {
            const items = groups[key] || [];
            return (
                <Card key={key} className="flex flex-col h-full border-[var(--border-subtle)]">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-[var(--bg-app)] text-[var(--text-muted)]">
                                <Zap size={14} />
                            </div>
                            <h3 className="text-[14px] font-black text-[var(--text-main)] uppercase tracking-wider">{label}</h3>
                            <Badge variant="neutral" className="text-[9px] py-0 px-1.5">{items.length}</Badge>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => { setEditingParam({ spec_key: key, value: '', sort_order: items.length }); setIsParamModalOpen(true); }}
                            className="text-[var(--primary)]"
                        >
                            <Plus size={14} />
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {items.length === 0 ? (
                            <span className="text-[11px] text-[var(--text-muted)] italic pl-1">No values defined</span>
                        ) : (
                            items.map(item => (
                                <div key={item.id} className="group flex items-center gap-1.5 bg-[var(--bg-app)] border border-[var(--border-subtle)] pl-2 pr-1 py-1 rounded-md text-[12px] font-medium text-[var(--text-main)] hover:border-[var(--primary)]/30 transition-all">
                                    {item.value}
                                    <button
                                        onClick={() => handleDeleteParameter(item.id)}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--danger)] hover:bg-[var(--danger-bg)] rounded transition-all"
                                    >
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            );
        });
    };

    const renderServices = () => {
        if (services.length === 0) {
            return (
                <div className="col-span-3">
                    <EmptyState
                        icon={Zap}
                        title="No services found"
                        description="Get started by adding your first service to the catalog."
                    />
                </div>
            );
        }

        const categories = settings?.work_categories ? JSON.parse(settings.work_categories) : ["Web Development", "Design", "Marketing", "Hosting"];

        const groupedServices = categories.reduce((acc, cat) => {
            acc[cat] = services.filter(s => s.category === cat);
            return acc;
        }, {});

        const uncategorized = services.filter(s => !categories.includes(s.category));
        if (uncategorized.length > 0) groupedServices['Other'] = uncategorized;

        const categoryIcons = {
            "Web Development": Globe,
            "Design": Pencil,
            "Marketing": Zap,
            "Hosting": Cloud,
            "Other": Layers
        };

        return Object.entries(groupedServices).map(([category, items]) => {
            if (items.length === 0) return null;
            const Icon = categoryIcons[category] || categoryIcons.Other;

            return (
                <div key={category} className="col-span-3 space-y-6 mb-10">
                    <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-subtle)]">
                        <div className="w-8 h-8 rounded-lg bg-[var(--primary-bg)] text-[var(--primary)] flex items-center justify-center">
                            <Icon size={18} />
                        </div>
                        <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]">
                            {category}
                        </h2>
                        <Badge variant="neutral" className="text-[10px] py-0">{items.length}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {items.map(service => (
                            <Card key={service.id} className="flex flex-col h-full hover:shadow-[var(--shadow-lg)] transition-all group border-[var(--border-subtle)] hover:border-[var(--border-medium)]">
                                <div className="flex justify-between items-start mb-5">
                                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg-app)] text-[var(--primary)] flex items-center justify-center shadow-sm border border-[var(--border-subtle)]">
                                        <Icon size={20} />
                                    </div>
                                    <div className="flex gap-2">
                                        {!service.active && <Badge variant="danger" className="text-[10px]">Inactive</Badge>}
                                    </div>
                                </div>
                                <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-1">{locale === 'de' ? service.name_de : service.name_fr || service.name_de}</h3>
                                <p className="text-[12px] text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                                    {locale === 'de' ? service.description_de : service.description_fr || service.description_de}
                                </p>
                                <div className="mt-auto pt-4 flex justify-between items-center border-t border-[var(--border-subtle)] border-dashed">
                                    <div className="font-extrabold text-[var(--text-main)] text-[14px]">
                                        {formatCurrency(service.price)}
                                        <span className="text-[10px] text-[var(--text-muted)] font-bold ml-1 uppercase">/ {service.unit_type === 'hourly' ? 'hr' : 'flat'}</span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="xs" onClick={() => openModal(service)} className="text-[var(--primary)] hover:bg-[var(--bg-app)]">
                                            <Edit2 size={14} />
                                        </Button>
                                        <Button variant="ghost" size="xs" onClick={() => handleDeleteClick(service, 'service')} className="text-[var(--danger)] hover:bg-[var(--danger-bg)]">
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            );
        });
    };

    const renderBundles = () => {
        if (bundles.length === 0) {
            return (
                <div className="col-span-3">
                    <EmptyState
                        icon={Box}
                        title="No bundles found"
                        description="Create bundles to offer combined services at a special price."
                    />
                </div>
            );
        }
        return bundles.map(bundle => (
            <Card key={bundle.id} className="flex flex-col h-full hover:shadow-[var(--shadow-lg)] transition-all group border-[var(--border-subtle)] hover:border-[var(--border-medium)]">
                <div className="flex justify-between items-start mb-5">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--warning-bg)] text-[var(--warning)] flex items-center justify-center shadow-sm border border-[var(--warning)]/20">
                        <Box size={20} />
                    </div>
                    <Badge variant="neutral" className="bg-[var(--bg-app)] text-[var(--text-secondary)] border-[var(--border-subtle)] text-[10px]">
                        {bundle.items?.length || 0} items
                    </Badge>
                </div>

                <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-2">{bundle.name}</h3>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-6 line-clamp-3">
                    {bundle.description || 'No description provided for this bundle.'}
                </p>

                <div className="mt-auto pt-5 flex justify-between items-center border-t border-[var(--border-subtle)] border-dashed">
                    <div className="flex flex-col">
                        {bundle.discount_amount > 0 && (
                            <span className="text-[11px] text-[var(--text-muted)] line-through font-bold">
                                {bundle.original_total?.toFixed(2)}€
                            </span>
                        )}
                        <span className="text-[18px] font-extrabold text-[var(--text-main)]">
                            {bundle.final_total?.toFixed(2)}€
                        </span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="xs" onClick={() => openModal(bundle)} className="text-[var(--primary)] hover:bg-[var(--bg-app)]">
                            <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => handleDeleteClick(bundle, 'bundle')} className="text-[var(--danger)] hover:bg-[var(--danger-bg)]">
                            <Trash2 size={14} />
                        </Button>
                    </div>
                </div>
            </Card>
        ));
    };

    const renderPrintProducts = () => {
        if (printProducts.length === 0) {
            return (
                <div className="col-span-3">
                    <EmptyState
                        icon={Box}
                        title="No print products found"
                        description="Physical deliverables like flyers or business cards appear here."
                    />
                </div>
            );
        }
        return printProducts.map(product => (
            <Card key={product.id} className="flex flex-col h-full hover:shadow-[var(--shadow-lg)] transition-all group border-[var(--border-subtle)] hover:border-[var(--border-medium)]">
                <div className="flex justify-between items-start mb-5">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm border border-blue-100">
                        <Box size={20} />
                    </div>
                    <div className="flex gap-2">
                        {!product.active && <Badge variant="danger" className="text-[10px]">Inactive</Badge>}
                    </div>
                </div>

                <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-1">{product.name}</h3>
                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    {product.unit_label || 'pcs'}
                </div>

                <div className="mt-auto pt-5 flex justify-between items-center border-t border-[var(--border-subtle)] border-dashed">
                    <div className="flex items-center gap-2">
                        {product.allowed_specs && Object.keys(product.allowed_specs).length > 0 && (
                            <Badge variant="neutral" className="bg-blue-50 text-blue-600 border-blue-100 text-[9px] py-1">
                                {Object.keys(product.allowed_specs).length} spec fields
                            </Badge>
                        ) || (
                                <span className="text-[10px] text-[var(--text-muted)] italic">No specs defined</span>
                            )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="xs" onClick={() => openModal(product)} className="text-[var(--primary)] hover:bg-[var(--bg-app)]">
                            <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => handleDeleteClick(product, 'print')} className="text-[var(--danger)] hover:bg-[var(--danger-bg)]">
                            <Trash2 size={14} />
                        </Button>
                    </div>
                </div>
            </Card>
        ));
    };

    const renderSupport = () => {
        if ((supportPackages || []).length === 0) {
            return (
                <div className="col-span-3">
                    <EmptyState
                        icon={Globe}
                        title="No support packages found"
                        description="Configure web support packages to offer dedicated maintenance plans."
                    />
                </div>
            );
        }

        return supportPackages.map(pkg => (
            <Card key={pkg.id} className="flex flex-col h-full hover:shadow-[var(--shadow-lg)] transition-all group border-[var(--border-subtle)] hover:border-[var(--border-medium)]">
                <div className="flex justify-between items-start mb-5">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--primary-bg)] text-[var(--primary)] flex items-center justify-center shadow-sm border border-[var(--primary)]/10">
                        <Globe size={20} />
                    </div>
                    <div className="flex gap-2">
                        {!pkg.active && <Badge variant="danger" className="text-[10px]">Inactive</Badge>}
                        {pkg.is_pay_as_you_go ? <Badge variant="primary" className="text-[10px]">Pay As You Go</Badge> : <Badge variant="neutral" className="text-[10px]">{pkg.included_hours} Hours</Badge>}
                    </div>
                </div>

                <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-2">{pkg.name}</h3>
                <p className="text-[12px] text-[var(--text-secondary)] line-clamp-3 mb-6 leading-relaxed">
                    {pkg.description || 'No description provided for this package.'}
                </p>

                <div className="mt-auto pt-5 flex justify-between items-center border-t border-[var(--border-subtle)] border-dashed">
                    <div className="font-extrabold text-[var(--text-main)] text-[18px]">
                        {pkg.is_pay_as_you_go ? 'On request' : formatCurrency(pkg.price)}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="xs" onClick={() => openModal(pkg)} className="text-[var(--primary)] hover:bg-[var(--bg-app)]">
                            <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="xs" onClick={() => handleDeleteClick(pkg, 'web-support')} className="text-[var(--danger)] hover:bg-[var(--danger-bg)]">
                            <Trash2 size={14} />
                        </Button>
                    </div>
                </div>
            </Card>
        ));
    };

    return (
        <div className="page-container">
            {/* Block 1: Standardized Top Bar */}
            <div className="flex flex-col gap-6 mb-10">
                <div className="flex items-center justify-between gap-6">
                    <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Service Catalog</h1>
                    <Button onClick={() => openModal(null)} className="bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm hover:shadow-md transition-all font-bold px-6 h-10">
                        <Plus size={18} className="mr-2" /> {activeTab === 'services' ? 'Add Service' : activeTab === 'bundles' ? 'Create Bundle' : activeTab === 'print' ? 'Add Print Product' : 'Add Parameter'}
                    </Button>
                </div>

                <div className="flex items-center justify-between gap-6">
                    {/* LEFT: Segmented control for tabs */}
                    <div className="flex bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-subtle)]">
                        <button
                            onClick={() => { setActiveTab('services'); setSearchTerm(''); setStatusFilter('all'); }}
                            className={`flex items-center gap-2.5 px-6 h-9 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'services' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <Layers size={16} /> Services
                        </button>
                        <button
                            onClick={() => { setActiveTab('bundles'); setSearchTerm(''); setStatusFilter('all'); }}
                            className={`flex items-center gap-2.5 px-6 h-9 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'bundles' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <Box size={16} /> Product Bundles
                        </button>
                        <button
                            onClick={() => { setActiveTab('print'); setSearchTerm(''); setStatusFilter('all'); }}
                            className={`flex items-center gap-2.5 px-6 h-9 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'print' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <Box size={16} /> Print Products
                        </button>
                        <button
                            onClick={() => { setActiveTab('support'); setSearchTerm(''); setStatusFilter('all'); }}
                            className={`flex items-center gap-2.5 px-6 h-9 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'support' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <Clock size={16} /> Support Packages
                        </button>
                        <button
                            onClick={() => { setActiveTab('parameters'); setSearchTerm(''); setStatusFilter('all'); }}
                            className={`flex items-center gap-2.5 px-6 h-9 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'parameters' ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <Zap size={16} /> Print Parameters
                        </button>
                    </div>

                    {/* RIGHT: Filters (only for print products as per requirement, but useful for all) */}
                    {activeTab === 'print' && (
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    className="bg-white border border-[var(--border-subtle)] rounded-lg py-2 px-4 text-[13px] w-64 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex bg-[var(--bg-subtle)] p-1 rounded-lg border border-[var(--border-subtle)]">
                                {['all', 'active', 'inactive'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setStatusFilter(f)}
                                        className={`px-4 h-7 rounded-md text-[11px] font-black uppercase tracking-wider transition-all ${statusFilter === f ? 'bg-white shadow-sm text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className={activeTab === 'services' ? "" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
                {isLoading ? (
                    <div className="col-span-3 py-20 text-center text-[var(--text-muted)] font-medium">
                        Loading catalog...
                    </div>
                ) : error ? (
                    <div className="col-span-3 py-20 px-6 max-w-md mx-auto text-center">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Failed to load services</h3>
                        <p className="text-[13px] text-[var(--text-secondary)] mb-6 leading-relaxed">{error}</p>
                        <Button onClick={loadData} variant="primary" className="w-full">
                            <RefreshCw size={16} className="mr-2" /> Retry Connection
                        </Button>
                    </div>
                ) : (
                    <>
                        {activeTab === 'services' && renderServices()}
                        {activeTab === 'bundles' && renderBundles()}
                        {activeTab === 'print' && renderPrintProducts()}
                        {activeTab === 'support' && renderSupport()}
                        {activeTab === 'parameters' && renderPrintParameters()}
                    </>
                )}
            </div>

            {/* Parameter Modal (Mini modal for adding values) */}
            {isParamModalOpen && (
                <Modal
                    isOpen={isParamModalOpen}
                    onClose={() => setIsParamModalOpen(false)}
                    title={`Add ${editingParam?.spec_key} Value`}
                    size="sm"
                >
                    <div className="space-y-6">
                        <Input
                            label="Value Name"
                            value={editingParam?.value}
                            onChange={(e) => setEditingParam({ ...editingParam, value: e.target.value })}
                            placeholder="e.g. A4, 300g, Matte..."
                            autoFocus
                        />
                        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                            <Button variant="ghost" onClick={() => setIsParamModalOpen(false)}>Cancel</Button>
                            <Button
                                variant="primary"
                                onClick={() => handleSaveParameter(editingParam)}
                                disabled={!editingParam?.value}
                            >
                                Add Value
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                }}
                title={editingItem ?
                    (activeTab === 'services' ? 'Edit Service' : activeTab === 'bundles' ? 'Edit Bundle' : activeTab === 'print' ? 'Edit Print Product' : 'Edit Support Package') :
                    (activeTab === 'services' ? 'Add New Service' : activeTab === 'bundles' ? 'Add New Bundle' : activeTab === 'print' ? 'Add New Print Product' : 'Add Support Package')}
            >
                {activeTab === 'services' ? (
                    <ServiceForm
                        initialData={editingItem}
                        onSave={handleSaveService}
                        onCancel={() => {
                            setIsModalOpen(false);
                            setEditingItem(null);
                        }}
                    />
                ) : activeTab === 'bundles' ? (
                    <BundleForm
                        initialData={editingItem}
                        onSave={handleSaveBundle}
                        onCancel={() => {
                            setIsModalOpen(false);
                            setEditingItem(null);
                        }}
                    />
                ) : activeTab === 'support' ? (
                    <WebSupportPackageForm
                        initialData={editingItem}
                        onSave={handleSaveSupportPackage}
                        onCancel={() => {
                            setIsModalOpen(false);
                            setEditingItem(null);
                        }}
                    />
                ) : (
                    <PrintProductForm
                        initialData={editingItem}
                        onSave={handleSavePrintProduct}
                        onCancel={() => {
                            setIsModalOpen(false);
                            setEditingItem(null);
                        }}
                    />
                )}
            </Modal>

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title={deleteTarget?.type === 'service' ? "Delete Service" : deleteTarget?.type === 'bundle' ? "Delete Bundle" : "Delete Print Product"}
                message={`Are you sure you want to delete "${deleteTarget?.name || (deleteTarget?.name_de) || 'this item'}"?`}
                confirmText="Delete"
                isDestructive={true}
            />
        </div >
    );
};

export default ServicesPage;
