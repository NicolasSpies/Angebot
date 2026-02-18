import React, { useState, useEffect, useCallback } from 'react';
import { dataService } from '../data/dataService';
import { Building2, MapPin, FileText, Tags, Database, Save, Download, Upload, Box, Plus, X, Trash2, Edit2, Globe, Phone, Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';

const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({
        company_name: '', address: '', vat_number: '', logo_url: '',
        email: '', phone: '', website: '', default_currency: 'EUR',
        default_vat_rules: '', default_payment_terms: '', default_hourly_rate: 0,
        work_categories: '["Web Development", "Design", "Marketing", "Hosting"]',
        default_validity_days: 14
    });
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const loadSettings = useCallback(async () => {
        try {
            const [settingsRes] = await Promise.allSettled([
                dataService.getSettings()
            ]);
            if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value);
        } catch (err) {
            console.error('Error loading settings page data:', err);
        }
    }, []);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            await dataService.saveSettings(settings);
            setMsg('Changes saved!');
            setTimeout(() => setMsg(''), 3000);
        } catch (err) {
            setMsg('Error saving changes');
        }
        setIsSaving(false);
    };



    const handleExportData = async () => {
        const exportData = {
            timestamp: new Date().toISOString(),
            settings: await dataService.getSettings(),
            customers: await dataService.getCustomers(),
            projects: await dataService.getProjects(),
            services: await dataService.getServices(),
            packages: await dataService.getPackages()
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const dl = document.createElement('a');
        dl.href = dataStr;
        dl.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        dl.click();
    };

    const tabs = [
        { id: 'general', label: 'Company', icon: Building2 },
        { id: 'contact', label: 'Contact', icon: Mail },
        { id: 'offers', label: 'Offer Rules', icon: FileText },
        { id: 'categories', label: 'Categories', icon: Tags },
        { id: 'data', label: 'System', icon: Database },
    ];

    return (
        <div className="page-container" style={{ maxWidth: '1000px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-sm text-muted mt-1">Manage your company profile, preferences, and system configurations.</p>
            </div>

            {/* Horizontal Tabs */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] pb-0 mb-8">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 text-[13px] font-bold transition-all border-b-2 -mb-[1px] ${activeTab === tab.id
                            ? 'border-[var(--primary)] text-[var(--primary)]'
                            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:border-[var(--border)]'
                            }`}
                    >
                        <tab.icon size={16} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content Panel */}
            <form onSubmit={handleSave}>
                <Card className="p-10">
                    {activeTab === 'general' && (
                        <div className="flex flex-column gap-8">
                            <h3 className="text-sm font-bold uppercase text-muted mb-0">General Company Info</h3>
                            <Input label="Company Name" value={settings.company_name} onChange={e => setSettings({ ...settings, company_name: e.target.value })} />
                            <Input label="Website" value={settings.website} onChange={e => setSettings({ ...settings, website: e.target.value })} placeholder="https://" />

                            <div className="pt-6 border-t">
                                <label className="form-label mb-4">Brand Identity</label>
                                <div className="flex gap-5 items-start">
                                    <div style={{ width: '80px', height: '80px', border: '2px dashed var(--border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', overflow: 'hidden' }}>
                                        {settings.logo_url ? <img src={settings.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <Building2 size={24} className="text-muted" />}
                                    </div>
                                    <div className="flex-1">
                                        <input type="file" onChange={async (e) => {
                                            const f = e.target.files[0];
                                            if (!f) return;
                                            const fd = new FormData(); fd.append('logo', f);
                                            const res = await fetch('/api/upload', { method: 'POST', body: fd });
                                            const d = await res.json();
                                            setSettings({ ...settings, logo_url: d.url });
                                        }} className="text-xs mb-2" />
                                        <p className="text-xs text-muted">Upload high-res PNG or SVG.</p>
                                        {settings.logo_url && <Button variant="ghost" size="sm" onClick={() => setSettings({ ...settings, logo_url: '' })} className="text-danger mt-2">Remove</Button>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contact' && (
                        <div className="flex flex-column gap-8">
                            <h3 className="text-sm font-bold uppercase text-muted mb-0">Legal & Contact</h3>
                            <Textarea label="Physical Address" rows={3} value={settings.address} onChange={e => setSettings({ ...settings, address: e.target.value })} />
                            <div className="grid grid-2 gap-6">
                                <Input label="VAT ID" value={settings.vat_number} onChange={e => setSettings({ ...settings, vat_number: e.target.value })} />
                                <Input label="Email" type="email" value={settings.email} onChange={e => setSettings({ ...settings, email: e.target.value })} />
                                <Input label="Phone" value={settings.phone} onChange={e => setSettings({ ...settings, phone: e.target.value })} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'offers' && (
                        <div className="flex flex-column gap-8">
                            <h3 className="text-sm font-bold uppercase text-muted mb-0">Finance Defaults</h3>
                            <div className="grid grid-2 gap-6">
                                <Select label="Currency" value={settings.default_currency} onChange={e => setSettings({ ...settings, default_currency: e.target.value })} options={[{ value: 'EUR', label: 'EUR (€)' }, { value: 'USD', label: 'USD ($)' }]} />
                                <Input label="Hourly Rate (€)" type="number" step="0.01" value={settings.default_hourly_rate} onChange={e => setSettings({ ...settings, default_hourly_rate: e.target.value })} />
                                <Input label="Validity (Days)" type="number" value={settings.default_validity_days} onChange={e => setSettings({ ...settings, default_validity_days: e.target.value })} />
                                <Input label="Payment Terms" value={settings.default_payment_terms} onChange={e => setSettings({ ...settings, default_payment_terms: e.target.value })} placeholder="14 days net" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'categories' && (
                        <div className="flex flex-column gap-6">
                            <h3 className="text-sm font-bold uppercase text-muted mb-0">Service Categories</h3>
                            <div className="flex gap-3">
                                <Input placeholder="New Category..." id="new-cat" className="w-full" style={{ marginBottom: 0 }} />
                                <Button onClick={() => {
                                    const input = document.getElementById('new-cat');
                                    const val = input.value.trim();
                                    if (val) {
                                        const cats = JSON.parse(settings.work_categories || '[]');
                                        if (!cats.includes(val)) setSettings({ ...settings, work_categories: JSON.stringify([...cats, val]) });
                                        input.value = '';
                                    }
                                }}>Add</Button>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2">
                                {JSON.parse(settings.work_categories || '[]').map(c => (
                                    <Badge key={c} variant="neutral" showDot={true} className="flex items-center gap-2 py-1.5 px-3">
                                        {c} <X size={14} className="cursor-pointer hover:text-danger" onClick={() => {
                                            const cats = JSON.parse(settings.work_categories || '[]');
                                            setSettings({ ...settings, work_categories: JSON.stringify(cats.filter(x => x !== c)) });
                                        }} />
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="flex flex-column gap-8">
                            <h3 className="text-sm font-bold uppercase text-muted mb-0">Database Management</h3>
                            <div className="p-6 bg-info-bg rounded-lg border border-info">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-info-text mb-3"><Download size={18} /> Export Data</h4>
                                <p className="text-sm text-info-text opacity-80 mb-5">Export all your settings, customers, and offers into a secure JSON file.</p>
                                <Button variant="info" onClick={handleExportData}>Create Backup</Button>
                            </div>
                            <div className="p-6 bg-main rounded-lg border border-dashed opacity-60">
                                <h4 className="flex items-center gap-2 text-sm font-bold text-secondary mb-3"><Upload size={18} /> Import Data</h4>
                                <p className="text-sm text-secondary mb-5">Restore from a previous backup file. (Development Mode)</p>
                                <Button variant="secondary" disabled>Import JSON</Button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Bottom Action Bar */}
                {activeTab !== 'data' && (
                    <div className="mt-6 flex justify-end">
                        <div className="flex items-center gap-3">
                            {msg && <span className="text-sm font-medium text-success-text fade-in">{msg}</span>}
                            <Button type="submit" disabled={isSaving}>
                                <Save size={18} /> {isSaving ? 'Saving...' : 'Save Settings'}
                            </Button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
};

export default SettingsPage;

