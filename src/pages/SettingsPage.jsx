import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { Building2, MapPin, FileText, Tags, Database, Save, Download, Upload, Box, Plus, X, Trash2, Edit2, Globe, Phone, Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';

const SettingsPage = () => {
    const { t } = useI18n();
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
    const [packages, setPackages] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [editingPackage, setEditingPackage] = useState(null);

    const loadSettings = useCallback(async () => {
        try {
            const [settingsRes, packagesRes, servicesRes] = await Promise.allSettled([
                dataService.getSettings(),
                dataService.getPackages(),
                dataService.getServices()
            ]);
            if (settingsRes.status === 'fulfilled') setSettings(settingsRes.value);
            if (packagesRes.status === 'fulfilled') setPackages(packagesRes.value);
            if (servicesRes.status === 'fulfilled') setAllServices(servicesRes.value);
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

    const handleSavePackage = async (e) => {
        e.preventDefault();
        await dataService.savePackage(editingPackage);
        setEditingPackage(null);
        loadSettings();
    };

    const handleDeletePackage = async (id) => {
        if (!window.confirm('Delete package?')) return;
        await dataService.deletePackage(id);
        loadSettings();
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
        { id: 'packages', label: 'Bundles', icon: Box },
        { id: 'categories', label: 'Categories', icon: Tags },
        { id: 'data', label: 'System', icon: Database },
    ];

    return (
        <div className="page-container" style={{ maxWidth: '1000px' }}>
            <h1 className="page-title">{t('nav.settings')}</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
                {/* Vertical Tabs */}
                <div className="flex flex-column gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={activeTab === tab.id ? 'nav-link active' : 'nav-link'}
                            style={{ background: activeTab === tab.id ? 'var(--primary-light)' : 'transparent', border: 'none', justifyContent: 'flex-start', padding: '0.75rem 1rem' }}
                        >
                            <tab.icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Panel */}
                <form onSubmit={handleSave} className="flex flex-column gap-4">
                    <Card style={{ minHeight: '500px' }}>
                        {activeTab === 'general' && (
                            <div className="flex flex-column gap-6">
                                <h3 className="text-sm font-bold uppercase text-muted mb-2">General Company Info</h3>
                                <Input label="Company Name" value={settings.company_name} onChange={e => setSettings({ ...settings, company_name: e.target.value })} />
                                <Input label="Website" value={settings.website} onChange={e => setSettings({ ...settings, website: e.target.value })} placeholder="https://" />

                                <div className="pt-4 border-t">
                                    <label className="form-label mb-3">Brand Identity</label>
                                    <div className="flex gap-4 items-start">
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
                            <div className="flex flex-column gap-6">
                                <h3 className="text-sm font-bold uppercase text-muted mb-2">Legal & Contact</h3>
                                <Textarea label="Physical Address" rows={3} value={settings.address} onChange={e => setSettings({ ...settings, address: e.target.value })} />
                                <div className="grid grid-2 gap-4">
                                    <Input label="VAT ID" value={settings.vat_number} onChange={e => setSettings({ ...settings, vat_number: e.target.value })} />
                                    <Input label="Email" type="email" value={settings.email} onChange={e => setSettings({ ...settings, email: e.target.value })} />
                                    <Input label="Phone" value={settings.phone} onChange={e => setSettings({ ...settings, phone: e.target.value })} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'offers' && (
                            <div className="flex flex-column gap-6">
                                <h3 className="text-sm font-bold uppercase text-muted mb-2">Finance Defaults</h3>
                                <div className="grid grid-2 gap-4">
                                    <Select label="Currency" value={settings.default_currency} onChange={e => setSettings({ ...settings, default_currency: e.target.value })} options={[{ value: 'EUR', label: 'EUR (€)' }, { value: 'USD', label: 'USD ($)' }]} />
                                    <Input label="Hourly Rate (€)" type="number" step="0.01" value={settings.default_hourly_rate} onChange={e => setSettings({ ...settings, default_hourly_rate: e.target.value })} />
                                    <Input label="Validity (Days)" type="number" value={settings.default_validity_days} onChange={e => setSettings({ ...settings, default_validity_days: e.target.value })} />
                                    <Input label="Payment Terms" value={settings.default_payment_terms} onChange={e => setSettings({ ...settings, default_payment_terms: e.target.value })} placeholder="14 days net" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'packages' && (
                            <div className="flex flex-column gap-4">
                                {!editingPackage ? (
                                    <>
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-sm font-bold uppercase text-muted">Service Bundles</h3>
                                            <Button size="sm" onClick={() => setEditingPackage({ name: '', description: '', items: [] })}><Plus size={16} /> Add</Button>
                                        </div>
                                        <div className="flex flex-column gap-2">
                                            {packages.map(p => (
                                                <div key={p.id} className="flex justify-between items-center p-3 bg-main rounded-md border">
                                                    <div>
                                                        <div className="font-bold text-sm">{p.name}</div>
                                                        <div className="text-xs text-muted">{p.items?.length || 0} services</div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => setEditingPackage(p)}><Edit2 size={14} /></Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDeletePackage(p.id)} className="text-danger"><Trash2 size={14} /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-column gap-4">
                                        <Input label="Bundle Name" value={editingPackage.name} onChange={e => setEditingPackage({ ...editingPackage, name: e.target.value })} />
                                        <div>
                                            <label className="form-label">Services in Bundle</label>
                                            <div className="border rounded-md bg-white p-2 flex flex-column gap-1" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                {allServices.map(s => (
                                                    <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-main rounded cursor-pointer text-sm">
                                                        <input type="checkbox" checked={editingPackage.items?.includes(s.id)} onChange={e => {
                                                            const items = editingPackage.items || [];
                                                            setEditingPackage({ ...editingPackage, items: e.target.checked ? [...items, s.id] : items.filter(id => id !== s.id) });
                                                        }} />
                                                        {s.name_de}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end pt-2 border-t">
                                            <Button variant="ghost" size="sm" onClick={() => setEditingPackage(null)}>Cancel</Button>
                                            <Button size="sm" onClick={handleSavePackage}>Save Bundle</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'categories' && (
                            <div className="flex flex-column gap-4">
                                <h3 className="text-sm font-bold uppercase text-muted mb-2">Service Categories</h3>
                                <div className="flex gap-2">
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
                                <div className="flex flex-wrap gap-2 mt-4">
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
                            <div className="flex flex-column gap-6">
                                <h3 className="text-sm font-bold uppercase text-muted mb-2">Database Management</h3>
                                <div className="p-4 bg-info-bg rounded-lg border border-info">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-info-text mb-2"><Download size={18} /> Export Data</h4>
                                    <p className="text-sm text-info-text opacity-80 mb-4">Export all your settings, customers, and offers into a secure JSON file.</p>
                                    <Button variant="info" onClick={handleExportData}>Create Backup</Button>
                                </div>
                                <div className="p-4 bg-main rounded-lg border border-dashed opacity-60">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-secondary mb-2"><Upload size={18} /> Import Data</h4>
                                    <p className="text-sm text-secondary mb-4">Restore from a previous backup file. (Development Mode)</p>
                                    <Button variant="secondary" disabled>Import JSON</Button>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Bottom Action Bar inside main column */}
                    {activeTab !== 'data' && !editingPackage && (
                        <div className="mt-4 flex justify-end">
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
        </div>
    );
};

export default SettingsPage;
