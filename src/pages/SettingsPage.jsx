import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';

const SettingsPage = () => {
    const { t } = useI18n();
    const [settings, setSettings] = useState({
        company_name: '',
        address: '',
        vat_number: '',
        logo_url: '',
        email: '',
        phone: '',
        website: '',
        default_currency: 'EUR',
        default_vat_rules: '',
        default_payment_terms: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const loadSettings = useCallback(async () => {
        const data = await dataService.getSettings();
        if (data) setSettings(data);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadSettings();
    }, [loadSettings]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await dataService.saveSettings(settings);
            setMsg('Settings saved successfully!');
            setTimeout(() => setMsg(''), 3000);
        } catch (err) {
            console.error(err);
            setMsg('Error saving settings.');
        }
        setIsSaving(false);
    };

    return (
        <div className="page-container">
            <h1 style={{ marginBottom: '2rem' }}>{t('nav.settings')}</h1>

            <div className="card" style={{ maxWidth: '800px' }}>
                <form onSubmit={handleSave} className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{t('settings.company_name')}</label>
                        <input
                            type="text"
                            style={{ width: '100%' }}
                            value={settings.company_name}
                            onChange={e => setSettings({ ...settings, company_name: e.target.value })}
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{t('settings.address')}</label>
                        <textarea
                            rows="3"
                            style={{ width: '100%' }}
                            value={settings.address}
                            onChange={e => setSettings({ ...settings, address: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{t('settings.vat_number')}</label>
                        <input
                            type="text"
                            style={{ width: '100%' }}
                            value={settings.vat_number}
                            onChange={e => setSettings({ ...settings, vat_number: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{t('settings.email')}</label>
                        <input
                            type="email"
                            style={{ width: '100%' }}
                            value={settings.email}
                            onChange={e => setSettings({ ...settings, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Phone</label>
                        <input
                            type="tel"
                            style={{ width: '100%' }}
                            value={settings.phone || ''}
                            onChange={e => setSettings({ ...settings, phone: e.target.value })}
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Website</label>
                        <input
                            type="url"
                            style={{ width: '100%' }}
                            value={settings.website || ''}
                            onChange={e => setSettings({ ...settings, website: e.target.value })}
                            placeholder="https://example.com"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{t('settings.currency')}</label>
                        <input
                            type="text"
                            style={{ width: '100%' }}
                            value={settings.default_currency}
                            onChange={e => setSettings({ ...settings, default_currency: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>{t('settings.payment_terms')}</label>
                        <input
                            type="text"
                            style={{ width: '100%' }}
                            value={settings.default_payment_terms}
                            onChange={e => setSettings({ ...settings, default_payment_terms: e.target.value })}
                        />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Company Logo</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            {settings.logo_url && (
                                <div style={{
                                    width: '100px',
                                    height: '100px',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: '#f8fafc'
                                }}>
                                    <img src={settings.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/svg+xml"
                                    onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;

                                        const formData = new FormData();
                                        formData.append('logo', file);

                                        try {
                                            const res = await fetch('http://localhost:3001/api/upload', {
                                                method: 'POST',
                                                body: formData
                                            });
                                            if (!res.ok) throw new Error('Upload failed');
                                            const data = await res.json();
                                            setSettings({ ...settings, logo_url: data.url });
                                        } catch (err) {
                                            console.error(err);
                                            alert('Error uploading logo');
                                        }
                                    }}
                                    style={{ marginTop: '0.5rem' }}
                                />
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Recommended: PNG, JPG, or SVG. Max 5MB.
                                </p>
                            </div>
                            {settings.logo_url && (
                                <button
                                    type="button"
                                    onClick={() => setSettings({ ...settings, logo_url: '' })}
                                    style={{ color: 'var(--destructive)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Remove Logo
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                        <button type="submit" className="btn-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Settings'}
                        </button>
                        {msg && <span style={{ marginLeft: '1rem', color: msg.includes('Error') ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>{msg}</span>}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SettingsPage;
