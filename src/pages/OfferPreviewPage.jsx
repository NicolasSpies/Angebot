import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../data/dataService';
import { useI18n } from '../i18n/I18nContext';
import OfferLayout from '../components/offers/OfferLayout';

const OfferPreviewPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useI18n();
    const [offer, setOffer] = useState(null);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = useCallback(async () => {
        const [oData, sData] = await Promise.all([
            dataService.getOffer(id),
            dataService.getSettings()
        ]);
        setOffer(oData);
        setSettings(sData);
        setIsLoading(false);
    }, [id]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData();
    }, [loadData]);

    if (isLoading) return <div className="page-container">Loading preview...</div>;
    if (!offer) return <div className="page-container">Offer not found.</div>;

    return (
        <div className="page-container preview-page">
            <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn-secondary" onClick={() => navigate('/offers')}>← {t('common.back')}</button>
                <button className="btn-primary" onClick={() => window.print()}>{t('common.print')} / PDF</button>
            </div>

            <OfferLayout offer={offer} settings={settings} />
        </div>
    );
};

export default OfferPreviewPage;
