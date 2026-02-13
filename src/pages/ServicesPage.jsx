import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import Modal from '../components/ui/Modal';
import ServiceForm from '../components/services/ServiceForm';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Plus, Edit2, Trash2, Zap } from 'lucide-react';

const ServicesPage = () => {
    const { t, locale } = useI18n();
    const [services, setServices] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const loadServices = useCallback(async () => {
        const data = await dataService.getServices();
        setServices(data);
        setIsLoading(false);
    }, []);

    useEffect(() => { loadServices(); }, [loadServices]);

    const handleSave = async (serviceData) => {
        setIsLoading(true);
        try {
            await dataService.saveService(serviceData);
            loadServices();
            setIsModalOpen(false);
            setEditingService(null);
        } catch (error) {
            console.error('Failed to save service', error);
            setIsLoading(false);
        }
    };

    const handleEdit = (service) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (service) => {
        setDeleteTarget(service);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsLoading(true);
        try {
            await dataService.deleteService(deleteTarget.id);
            setDeleteTarget(null);
            loadServices();
        } catch (error) {
            console.error('Failed to delete service', error);
            setIsLoading(false);
        }
        setIsDeleteDialogOpen(false);
    };

    return (
        <div className="page-container">
            <div className="flex justify-between items-center mb-4">
                <h1 className="page-title" style={{ marginBottom: 0 }}>{t('nav.services')}</h1>
                <Button
                    onClick={() => {
                        setEditingService(null);
                        setIsModalOpen(true);
                    }}
                    size="default"
                >
                    <Plus size={18} /> {t('common.add')}
                </Button>
            </div>

            <div className="grid grid-3">
                {isLoading ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>Loading services...</div>
                ) : services.length > 0 ? services.map(service => (
                    <Card key={service.id} className="flex flex-column justify-between h-full">
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <Badge variant="primary" showDot={true} style={{ fontSize: '10px' }}>{service.category}</Badge>
                                {!service.active && <Badge variant="danger" showDot={true}>Inactive</Badge>}
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                {locale === 'de' ? service.name_de : service.name_fr}
                            </h3>
                            <p className="text-secondary text-sm mb-4" style={{ minHeight: '3em' }}>
                                {locale === 'de' ? service.description_de : service.description_fr}
                            </p>
                        </div>

                        <div className="flex justify-between items-center mt-auto pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-2">
                                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)' }}>{service.price}€</span>
                                {service.billing_cycle && service.billing_cycle !== 'one_time' && (
                                    <Badge variant="info" style={{ fontSize: '0.65rem' }}>
                                        {service.billing_cycle}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(service)} className="text-primary">
                                    <Edit2 size={16} />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(service)} className="text-danger">
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                    </Card>
                )) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                        <Zap size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                        <p>No services found. Start by adding your first service!</p>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingService(null);
                }}
                title={editingService ? 'Edit Service' : 'Add New Service'}
            >
                <ServiceForm
                    initialData={editingService}
                    onSave={handleSave}
                    onCancel={() => {
                        setIsModalOpen(false);
                        setEditingService(null);
                    }}
                />
            </Modal>

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Service"
                message={`Are you sure you want to delete "${deleteTarget ? (locale === 'de' ? deleteTarget.name_de : deleteTarget.name_fr) : ''}"? This cannot be undone.`}
                confirmText={t('common.delete')}
                isDestructive={true}
            />
        </div>
    );
};

export default ServicesPage;
