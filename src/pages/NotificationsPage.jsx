import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { dataService } from '../data/dataService';
import { Bell, Trash2, CheckCircle, X, Info, AlertTriangle, Clock } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ListPageHeader from '../components/layout/ListPageHeader';
import { formatDate } from '../utils/dateUtils';
import { toast } from 'react-hot-toast';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';

const NotificationsPage = () => {
    const { t } = useI18n();
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);

    const loadNotifications = async () => {
        setIsLoading(true);
        try {
            const data = await dataService.getNotifications();
            setNotifications(data.notifications || []);
        } catch (err) {
            console.error('Failed to load notifications:', err);
            toast.error('Failed to load notifications');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            await dataService.markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const handleDelete = async (id) => {
        try {
            await dataService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            toast.success('Notification deleted');
        } catch (err) {
            console.error('Failed to delete notification:', err);
            toast.error('Failed to delete notification');
        }
    };

    const handleClearAll = async () => {
        try {
            await dataService.clearAllNotifications();
            setNotifications([]);
            setIsClearAllDialogOpen(false);
            toast.success('All notifications cleared');
        } catch (err) {
            console.error('Failed to clear all:', err);
            toast.error('Failed to clear all notifications');
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle className="text-emerald-500" size={18} />;
            case 'warning': return <AlertTriangle className="text-amber-500" size={18} />;
            case 'error': return <X className="text-red-500" size={18} />;
            default: return <Info className="text-blue-500" size={18} />;
        }
    };

    return (
        <div className="page-container animate-in fade-in duration-500">
            <ListPageHeader
                title="Notifications"
                description="View and manage your system alerts and activity."
                icon={Bell}
                actions={
                    notifications.length > 0 && (
                        <Button
                            variant="ghost"
                            className="text-red-500 hover:bg-red-50 font-bold"
                            onClick={() => setIsClearAllDialogOpen(true)}
                        >
                            <Trash2 size={16} className="mr-2" /> Clear All
                        </Button>
                    )
                }
            />

            <div className="max-w-[800px] mt-8">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <Card key={i} className="animate-pulse h-24 bg-[var(--bg-app)]/50" />
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <Card className="p-12 text-center bg-white/50 border-dashed border-2">
                        <div className="w-16 h-16 bg-[var(--bg-app)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
                            <Bell size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">No notifications</h3>
                        <p className="text-[var(--text-secondary)]">You're all caught up! New alerts will appear here.</p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {notifications.map(n => (
                            <Card
                                key={n.id}
                                className={`group p-5 hover:shadow-md transition-all border-[var(--border-subtle)] relative ${!n.is_read ? 'bg-white border-l-4 border-l-[var(--primary)]' : 'bg-white opacity-80'}`}
                            >
                                <div className="flex gap-4">
                                    <div className="mt-1">{getIcon(n.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className={`text-[15px] font-bold ${!n.is_read ? 'text-[var(--text-main)]' : 'text-[var(--text-secondary)]'}`}>
                                                {n.title}
                                            </h4>
                                            <span className="text-[11px] text-[var(--text-muted)] font-medium flex items-center gap-1">
                                                <Clock size={12} /> {formatDate(n.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-[14px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                                            {n.message}
                                        </p>
                                        <div className="flex gap-4 mt-4">
                                            {!n.is_read && (
                                                <button
                                                    onClick={() => handleMarkAsRead(n.id)}
                                                    className="text-[11px] font-extrabold text-[var(--primary)] uppercase tracking-wider hover:underline"
                                                >
                                                    Mark as Read
                                                </button>
                                            )}
                                            {n.link && (
                                                <a
                                                    href={n.link}
                                                    className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider hover:text-[var(--primary)] hover:underline"
                                                >
                                                    View Details
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(n.id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <ConfirmationDialog
                isOpen={isClearAllDialogOpen}
                onClose={() => setIsClearAllDialogOpen(false)}
                onConfirm={handleClearAll}
                title="Clear All Notifications"
                message="Are you sure you want to delete all notifications? This action cannot be undone."
                confirmText="Clear All"
                isDestructive={true}
            />
        </div>
    );
};

export default NotificationsPage;
