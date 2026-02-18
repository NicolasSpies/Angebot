import React, { useState, useEffect, useCallback } from 'react';
import { dataService } from '../data/dataService';
import { formatCurrency } from '../utils/pricingEngine';
import Modal from '../components/ui/Modal';
import ServiceForm from '../components/services/ServiceForm';
import BundleForm from '../components/services/BundleForm';
import PrintProductForm from '../components/services/PrintProductForm';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/common/EmptyState';
import { Plus, Edit2, Trash2, Zap, Box, Layers } from 'lucide-react';

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

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = {};
            if (searchTerm) params.search = searchTerm;
            if (statusFilter !== 'all') params.status = statusFilter;

            const [servicesData, bundlesData, printData, paramsData] = await Promise.all([
                dataService.getServices(),
                dataService.getPackages(),
                dataService.getPrintProducts(params),
                dataService.getPrintParameters()
            ]);
            setServices(servicesData || []);
            setBundles(bundlesData || []);
            setPrintProducts(printData || []);
            setPrintParameters(paramsData || []);
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, statusFilter]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSaveService = async (serviceData) => {
        setIsLoading(true);
        try {
            await dataService.saveService(serviceData);
            loadData();
            setIsModalOpen(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Failed to save service', error);
            setIsLoading(false);
        }
    };

    const handleSaveBundle = async (bundleData) => {
        setIsLoading(true);
        try {
            await dataService.savePackage(bundleData);
            loadData();
            setIsModalOpen(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Failed to save bundle', error);
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
        } catch (error) {
            console.error('Failed to save print product', error);
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
        } catch (error) {
            console.error('Failed to save parameter', error);
            setIsLoading(false);
        }
    };

    const handleDeleteParameter = async (id) => {
        setIsLoading(true);
        try {
            await dataService.deletePrintParameter(id);
            await loadData();
        } catch (error) {
            console.error('Failed to delete parameter', error);
            setIsLoading(false);
        }
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
                await dataService.deletePackage(deleteTarget.id);
            } else if (deleteTarget.type === 'print') {
                await dataService.deletePrintProduct(deleteTarget.id);
            }
            setDeleteTarget(null);
            loadData();
        } catch (error) {
            console.error('Failed to delete item', error);
            setIsLoading(false);
        }
        setIsDeleteDialogOpen(false);
    };

    const openModal = (item = null) => {
        setEditingItem(item);
        setIsModalOpen(true);
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
        return services.map(service => (
            <Card key={service.id} className="flex flex-col h-full hover:shadow-[var(--shadow-lg)] transition-all group border-[var(--border-subtle)] hover:border-[var(--border-medium)]">
                <div className="flex justify-between items-start mb-5">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--bg-app)] text-[var(--primary)] flex items-center justify-center shadow-sm border border-[var(--border-subtle)]">
                        <Zap size={20} />
                    </div>
                    <div className="flex gap-2">
                        {!service.active && <Badge variant="danger" className="text-[10px]">Inactive</Badge>}
                        <Badge variant="neutral" className="bg-[var(--bg-app)] border-[var(--border-subtle)] text-[10px] text-[var(--text-secondary)]">
                            {service.category}
                        </Badge>
                    </div>
                </div>

                <h3 className="text-[15px] font-bold text-[var(--text-main)] mb-2">
                    {locale === 'de' ? service.name_de : service.name_fr}
                </h3>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-6 line-clamp-3">
                    {locale === 'de' ? service.description_de : service.description_fr}
                </p>

                <div className="mt-auto pt-5 flex justify-between items-center border-t border-[var(--border-subtle)] border-dashed">
                    <div className="flex items-baseline gap-1">
                        <span className="text-[18px] font-extrabold text-[var(--text-main)]">{service.price}€</span>
                        {service.billing_cycle && service.billing_cycle !== 'one_time' && (
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">/ {service.billing_cycle}</span>
                        )}
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
        ));
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-3 py-20 text-center text-[var(--text-muted)] font-medium">
                        Loading catalog...
                    </div>
                ) : activeTab === 'services' ? renderServices() : activeTab === 'bundles' ? renderBundles() : activeTab === 'print' ? renderPrintProducts() : renderPrintParameters()}
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
                title={editingItem ? (activeTab === 'services' ? 'Edit Service' : activeTab === 'bundles' ? 'Edit Bundle' : 'Edit Print Product') : (activeTab === 'services' ? 'Add New Service' : activeTab === 'bundles' ? 'Add New Bundle' : 'Add New Print Product')}
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
