import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import Modal from '../components/ui/Modal';
import ServiceForm from '../components/services/ServiceForm';
import BundleForm from '../components/services/BundleForm';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/common/EmptyState';
import { Plus, Edit2, Trash2, Zap, Box, Layers } from 'lucide-react';
import ListPageHeader from '../components/layout/ListPageHeader';

const ServicesPage = () => {
    const { t, locale } = useI18n();
    const [activeTab, setActiveTab] = useState('services');
    const [services, setServices] = useState([]);
    const [bundles, setBundles] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // Service or Bundle
    const [isLoading, setIsLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [servicesData, bundlesData] = await Promise.all([
                dataService.getServices(),
                dataService.getPackages()
            ]);
            setServices(servicesData || []);
            setBundles(bundlesData || []);
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
            } else {
                await dataService.deletePackage(deleteTarget.id);
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

    return (
        <div className="page-container">
            <ListPageHeader
                title={t('nav.services')}
                description="Configure your service catalog and create value-driven bundles."
                action={
                    <Button onClick={() => openModal(null)} size="lg" className="btn-primary shadow-sm">
                        <Plus size={20} className="mr-2" /> {activeTab === 'services' ? 'Add Service' : 'Create Bundle'}
                    </Button>
                }
            />

            {/* Tabs */}
            <div className="flex items-center gap-8 mb-8 border-b border-[var(--border-subtle)]">
                <button
                    className={`pb-4 px-1 flex items-center gap-2.5 font-bold text-[14px] transition-all relative ${activeTab === 'services' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                    onClick={() => setActiveTab('services')}
                >
                    <Layers size={18} /> Services
                    {activeTab === 'services' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full" />}
                </button>
                <button
                    className={`pb-4 px-1 flex items-center gap-2.5 font-bold text-[14px] transition-all relative ${activeTab === 'bundles' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                    onClick={() => setActiveTab('bundles')}
                >
                    <Box size={18} /> Product Bundles
                    {activeTab === 'bundles' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] rounded-full" />}
                </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-3 py-20 text-center text-[var(--text-muted)] font-medium">
                        Loading catalog...
                    </div>
                ) : activeTab === 'services' ? renderServices() : renderBundles()}
            </div >

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                }}
                title={editingItem ? (activeTab === 'services' ? 'Edit Service' : 'Edit Bundle') : (activeTab === 'services' ? 'Add New Service' : 'Add New Bundle')}
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
                ) : (
                    <BundleForm
                        initialData={editingItem}
                        onSave={handleSaveBundle}
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
                title={deleteTarget?.type === 'service' ? "Delete Service" : "Delete Bundle"}
                message={`Are you sure you want to delete "${deleteTarget?.name || (deleteTarget?.name_de) || 'this item'}"?`}
                confirmText={t('common.delete')}
                isDestructive={true}
            />
        </div >
    );
};

export default ServicesPage;
