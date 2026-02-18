import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, CheckSquare, Trash2, ChevronRight } from 'lucide-react';
import { dataService } from '../../data/dataService';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';

const PortalNotificationBell = ({ customerId, initialNotifications = [] }) => {
    const { t } = useI18n();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState(initialNotifications);
    const [unreadCount, setUnreadCount] = useState(initialNotifications.filter(n => !n.is_read).length);
    const [showNotifications, setShowNotifications] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => {
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, [customerId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                triggerRef.current && !triggerRef.current.contains(event.target) &&
                menuRef.current && !menuRef.current.contains(event.target)
            ) {
                setShowNotifications(false);
            }
        };
        if (showNotifications) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications]);

    const loadNotifications = async () => {
        try {
            const data = await dataService.getPortalNotifications(customerId);
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        } catch (err) {
            console.error('Failed to load portal notifications:', err);
        }
    };

    const toggleNotifications = () => {
        if (!showNotifications && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        }
        setShowNotifications(!showNotifications);
    };

    const handleMarkAllRead = async () => {
        await dataService.markPortalNotificationsRead(customerId);
        loadNotifications();
    };

    const handleClearAll = async () => {
        if (window.confirm(t('portal.notifications.clear_confirm') || 'Are you sure you want to clear all notifications?')) {
            await dataService.clearPortalNotifications(customerId);
            loadNotifications();
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            await dataService.markNotificationAsRead(notification.id);
            loadNotifications();
            if (notification.link) {
                navigate(notification.link);
                setShowNotifications(false);
            }
        } catch (err) {
            console.error('Failed to handle notification click:', err);
        }
    };

    return (
        <div className="relative">
            <div ref={triggerRef}>
                <button
                    onClick={toggleNotifications}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--bg-app)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-all relative"
                >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[var(--danger)] border-2 border-[var(--bg-surface)] rounded-full animate-pulse" />
                    )}
                </button>
            </div>

            {showNotifications && createPortal(
                <div
                    ref={menuRef}
                    className="fixed w-[340px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        top: dropdownPos.top,
                        right: dropdownPos.right,
                        zIndex: 1000,
                    }}
                >
                    <div className="p-4 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-app)]/30">
                        <span className="text-[12px] font-black uppercase tracking-widest text-[var(--text-main)]">Notifications</span>
                        <div className="flex gap-4">
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="text-[10px] font-black text-[var(--primary)] hover:opacity-70 flex items-center gap-1 uppercase">
                                    <CheckSquare size={12} />
                                    Read All
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={handleClearAll} className="text-[10px] font-black text-[var(--danger)] hover:opacity-70 flex items-center gap-1 uppercase">
                                    <Trash2 size={12} />
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                            <div className="divide-y divide-[var(--border-subtle)]">
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        className={`p-4 hover:bg-[var(--bg-app)] transition-colors cursor-pointer group relative ${!n.is_read ? 'bg-[var(--primary)]/5' : ''}`}
                                        onClick={() => handleNotificationClick(n)}
                                    >
                                        <div className="flex gap-3">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <div className="text-[13px] font-bold text-[var(--text-main)] mb-0.5 flex items-center gap-2">
                                                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0" />}
                                                    {n.title}
                                                </div>
                                                <div className="text-[12px] text-[var(--text-secondary)] leading-snug line-clamp-2">{n.message}</div>
                                                <div className="text-[10px] text-[var(--text-muted)] mt-2 font-medium">
                                                    {new Date(n.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity text-[var(--primary)]">
                                                <ChevronRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <div className="w-12 h-12 bg-[var(--bg-app)] rounded-full flex items-center justify-center mx-auto mb-3 text-[var(--text-muted)]">
                                    <Bell size={24} />
                                </div>
                                <p className="text-[13px] font-bold text-[var(--text-main)]">No notifications</p>
                                <p className="text-[11px] text-[var(--text-muted)] mt-1">We'll let you know when something happens.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-app)]/20">
                        <Link
                            to={`/portal/preview/${customerId}/notifications`}
                            className="text-[11px] font-black text-[var(--text-secondary)] hover:text-[var(--primary)] tracking-widest uppercase text-center block py-1"
                            onClick={() => setShowNotifications(false)}
                        >
                            View All Notifications
                        </Link>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default PortalNotificationBell;
