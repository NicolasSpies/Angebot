import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate, NavLink } from 'react-router-dom';
import { dataService } from '../../data/dataService';
import { useI18n } from '../../i18n/I18nContext';
import { LayoutDashboard, Briefcase, FileCheck, LogOut, UserCircle, Settings, X, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { toast } from 'react-hot-toast';

import PortalNotificationBell from '../portal/PortalNotificationBell';

const PortalLayout = () => {
    const { t, setLocale } = useI18n();
    const { customerId } = useParams();
    const navigate = useNavigate();
    const [portalData, setPortalData] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileForm, setProfileForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        company: ''
    });

    useEffect(() => {
        loadData();
    }, [customerId]);

    useEffect(() => {
        if (portalData?.profile) {
            setProfileForm({
                first_name: portalData.profile.first_name || '',
                last_name: portalData.profile.last_name || '',
                email: portalData.profile.email || '',
                company: portalData.profile.company || ''
            });
        }
    }, [portalData]);

    const loadData = async () => {
        try {
            const [data, s] = await Promise.all([
                dataService.getPortalData(customerId),
                dataService.getSettings()
            ]);
            setPortalData(data);
            setSettings(s);
            if (data?.customer?.language) {
                setLocale(data.customer.language);
            }
        } catch (err) {
            console.error('Failed to load portal data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            await dataService.savePortalProfile(customerId, profileForm);
            setIsProfileModalOpen(false);
            await loadData();
            toast.success('Profile saved successfully');
        } catch (err) {
            console.error('Failed to save profile:', err);
            toast.error('Failed to save profile');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[var(--bg-app)] text-[var(--text-muted)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)] mr-3" />
                {t('public_offer.loading')}
            </div>
        );
    }

    // Greeting logic: First Name > Company Name
    const greetingName = portalData?.profile?.first_name || portalData?.customer?.company_name || 'there';

    return (
        <div className="flex flex-col min-h-screen bg-[var(--bg-app)] overflow-x-hidden">
            {/* Action-Focused Portal Header */}
            <header className="h-[72px] bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-8 flex items-center justify-between sticky top-0 z-[100] shadow-sm">
                <div className="flex items-center gap-10">
                    {/* Brand Logo */}
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/portal/preview/${customerId}`)}>
                        {settings?.logo_url ? (
                            <img src={settings.logo_url} alt="Logo" className="h-9 w-auto object-contain" />
                        ) : (
                            <div className="w-9 h-9 bg-[var(--primary)] rounded-lg flex items-center justify-center text-white shadow-sm">
                                <Settings size={20} />
                            </div>
                        )}
                        {!settings?.logo_url && (
                            <span className="font-bold text-[18px] text-[var(--text-main)] tracking-tight">
                                {settings?.company_name || 'Portal'}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <PortalNotificationBell customerId={customerId} initialNotifications={portalData?.notifications} />

                    <button
                        onClick={() => setIsProfileModalOpen(true)}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--bg-app)] text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-all"
                    >
                        <UserCircle size={22} />
                    </button>
                </div>
            </header>

            {/* Portal Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-7xl mx-auto py-10 px-8">
                    <Outlet context={{ portalData, loadPortalData: loadData, greetingName }} />
                </div>
            </main>
            {/* Profile Modal */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <Card className="w-full max-w-md bg-[var(--bg-surface)] shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
                            <h3 className="text-xl font-bold text-[var(--text-main)]">Set Your Profile</h3>
                            <button
                                onClick={() => setIsProfileModalOpen(false)}
                                className="p-2 hover:bg-[var(--bg-app)] rounded-full transition-colors"
                            >
                                <X size={20} className="text-[var(--text-muted)]" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">First Name</label>
                                    <Input
                                        required
                                        value={profileForm.first_name}
                                        onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                                        placeholder="John"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Last Name</label>
                                    <Input
                                        required
                                        value={profileForm.last_name}
                                        onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Email Address</label>
                                <Input
                                    required
                                    type="email"
                                    value={profileForm.email}
                                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Company (Optional)</label>
                                <Input
                                    value={profileForm.company}
                                    onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                                    placeholder="Acme Corp"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="flex-1"
                                    onClick={() => setIsProfileModalOpen(false)}
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="flex-1 gap-2"
                                >
                                    <Save size={18} />
                                    {t('common.save')} Profile
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PortalLayout;
