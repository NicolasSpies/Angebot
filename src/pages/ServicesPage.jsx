import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import Modal from '../components/ui/Modal';
import ServiceForm from '../components/services/ServiceForm';

const ServicesPage = () => {
    const { t, locale } = useI18n();
    const [services, setServices] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadServices = useCallback(async () => {
        // setIsLoading(true);
        const data = await dataService.getServices();
        setServices(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadServices();
    }, [loadServices]);

    const handleSave = async (serviceData) => {
        setIsLoading(true);
        await dataService.saveService(serviceData);
        loadServices();
        setIsModalOpen(false);
        setEditingService(null);
    };

    const handleEdit = (service) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>{t('nav.services')}</h1>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setEditingService(null);
                        setIsModalOpen(true);
                    }}
                >+ {t('common.add')}</button>
            </div>

            <div className="grid grid-3">
                {isLoading ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>Loading services...</div>
                ) : services.length > 0 ? services.map(service => (
                    <div key={service.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>{service.category}</span>
                                {!service.active && <span className="status-badge" style={{ background: '#fee2e2', color: '#dc2626' }}>Inactive</span>}
                            </div>
                            <h3 style={{ marginBottom: '0.5rem' }}>{locale === 'de' ? service.name_de : service.name_fr}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                                {locale === 'de' ? service.description_de : service.description_fr}
                            </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{service.price} €</span>
                            <button
                                onClick={() => handleEdit(service)}
                                style={{ background: 'transparent', color: 'var(--primary)', fontWeight: 600 }}
                            >{t('common.edit')}</button>
                        </div>
                    </div>
                )) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No services found.</div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingService ? t('common.edit') : t('common.add')}
            >
                <ServiceForm
                    initialData={editingService}
                    onSave={handleSave}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
        </div>
    );
};

export default ServicesPage;
