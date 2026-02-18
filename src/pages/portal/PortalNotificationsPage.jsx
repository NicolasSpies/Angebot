import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Bell, Trash2, CheckCircle, ChevronRight, X, Clock } from 'lucide-react';
import { dataService } from '../../data/dataService';
import { toast } from 'react-hot-toast';

const PortalNotificationsPage = () => {
    const { t } = useI18n();
    const { portalData, loadPortalData } = useOutletContext();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState(portalData?.notifications || []);
    const customerId = portalData?.customer?.id;

    useEffect(() => {
        if (portalData?.notifications) {
            setNotifications(portalData.notifications);
        }
    }, [portalData]);

    const handleMarkAllRead = async () => {
        try {
            await dataService.markPortalNotificationsRead(customerId);
            await loadPortalData();
            toast.success('All notifications marked as read');
        } catch (err) {
            toast.error('Failed to mark all as read');
        }
    };

    const handleClearAll = async () => {
        try {
            await dataService.clearPortalNotifications(customerId);
            await loadPortalData();
            toast.success('All notifications cleared');
        } catch (err) {
            toast.error('Failed to clear notifications');
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        try {
            await dataService.deleteNotification(id);
            await loadPortalData();
        } catch (err) {
            toast.error('Failed to delete notification');
        }
    };

    const handleNotificationClick = async (n) => {
        try {
            await dataService.markNotificationAsRead(n.id);
            await loadPortalData();
            if (n.link) navigate(n.link);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">Notifications</h1>
                    <p className="text-[var(--text-secondary)] mt-1 font-medium">Keep track of updates regarding your projects and agreements.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMarkAllRead}
                        className="font-black text-[11px] uppercase tracking-widest text-[var(--primary)]"
                        disabled={!notifications.some(n => !n.is_read)}
                    >
                        <CheckCircle size={16} className="mr-2" />
                        Mark All Read
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        className="font-black text-[11px] uppercase tracking-widest text-[var(--danger)]"
                        disabled={notifications.length === 0}
                    >
                        <Trash2 size={16} className="mr-2" />
                        Clear All
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                {notifications.length > 0 ? notifications.map(n => (
                    <Card
                        key={n.id}
                        className={`p-6 hover:shadow-lg transition-all cursor-pointer group flex items-center justify-between bg-white shadow-sm border-[var(--border-subtle)] ${!n.is_read ? 'border-l-4 border-l-[var(--primary)] bg-[var(--primary-bg)]/20' : ''
                            }`}
                        onClick={() => handleNotificationClick(n)}
                    >
                        <div className="flex items-center gap-6 flex-1">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${!n.is_read ? 'bg-white text-[var(--primary)] shadow-sm' : 'bg-[var(--bg-app)] text-[var(--text-secondary)]'
                                }`}>
                                <Bell size={24} />
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0 pr-6">
                                <div className="flex items-center gap-3">
                                    <h3 className={`font-black text-[17px] truncate ${!n.is_read ? 'text-[var(--text-main)]' : 'text-[var(--text-secondary)]'
                                        }`}>
                                        {n.title}
                                    </h3>
                                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />}
                                </div>
                                <p className="text-[14px] text-[var(--text-secondary)] font-medium line-clamp-2">{n.message}</p>
                                <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                                    <Clock size={12} />
                                    {new Date(n.created_at).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={(e) => handleDelete(e, n.id)}
                                className="p-2.5 rounded-full text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <X size={18} />
                            </button>
                            <div className="p-2 rounded-full bg-[var(--bg-app)] text-[var(--text-muted)] group-hover:bg-[var(--primary)] group-hover:text-white transition-all shadow-sm">
                                <ChevronRight size={20} />
                            </div>
                        </div>
                    </Card>
                )) : (
                    <div className="py-24 text-center bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] border-dashed">
                        <div className="w-20 h-20 bg-[var(--bg-app)] rounded-full flex items-center justify-center mx-auto mb-6 text-[var(--text-muted)]">
                            <Bell size={32} />
                        </div>
                        <h3 className="text-xl font-black text-[var(--text-main)]">No notifications</h3>
                        <p className="text-[var(--text-secondary)] max-w-sm mx-auto mt-2 font-medium">
                            You're all caught up! New updates will appear here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PortalNotificationsPage;
