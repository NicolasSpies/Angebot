import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n/I18nContext';
import { Globe, Bell, X } from 'lucide-react';
import { dataService } from '../../data/dataService';
import { useNavigate } from 'react-router-dom';

const TopBar = () => {
    const { locale, setLocale } = useI18n();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

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

    // Close on scroll/resize
    useEffect(() => {
        if (!showNotifications) return;
        const close = () => setShowNotifications(false);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [showNotifications]);

    const loadNotifications = async () => {
        try {
            // Trigger check for expiring offers & urgent projects
            await dataService.checkExpiringNotifications();
            const data = await dataService.getNotifications();
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        } catch (err) {
            console.error('Failed to load notifications:', err);
        }
    };

    const handleMarkAllRead = async () => {
        await dataService.markAllNotificationsRead();
        loadNotifications();
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

    const handleNotificationClick = async (notification) => {
        try {
            await dataService.markNotificationAsRead(notification.id);
            loadNotifications(); // Refresh badge
            if (notification.link) {
                navigate(notification.link);
                setShowNotifications(false);
            }
        } catch (err) {
            console.error('Failed to handle notification click:', err);
        }
    };



    return (
        <div className="flex items-center justify-between w-full h-full">
            {/* Title / Breadcrumb Area */}
            <div className="flex-1" />

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                {/* Locale Selector */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-app)] transition-colors cursor-pointer border border-transparent hover:border-[var(--border-subtle)]">
                    <Globe size={16} className="text-[var(--text-secondary)]" />
                    <select
                        value={locale}
                        onChange={(e) => setLocale(e.target.value)}
                        className="bg-transparent border-none text-[13px] font-medium text-[var(--text-main)] cursor-pointer focus:outline-none appearance-none"
                    >
                        <option value="de">Deutsch</option>
                        <option value="fr">Français</option>
                    </select>
                </div>

                {/* Notifications */}
                <div ref={triggerRef}>
                    <button
                        onClick={toggleNotifications}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-app)] text-[var(--text-secondary)] transition-colors relative"
                    >
                        <Bell size={18} />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-[var(--danger)] border border-white rounded-full" />
                        )}
                    </button>
                </div>




                {/* ... (rest of the component structure) ... */}

                {/* Notification Dropdown — Portal */}
                {showNotifications && createPortal(
                    <div
                        ref={menuRef}
                        className="fixed w-[320px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-floating)] overflow-hidden"
                        style={{
                            top: dropdownPos.top,
                            right: dropdownPos.right,
                            zIndex: 'var(--z-dropdown, 100)',
                        }}
                    >
                        <div className="p-3 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-app)]/50">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Notifications</span>
                            {unreadCount > 0 && <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-[var(--accent)] hover:underline">MARK ALL READ</button>}
                        </div>
                        <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`p-4 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-app)] transition-colors cursor-pointer ${!n.is_read ? 'bg-[var(--accent)]/5' : ''}`}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <div className="flex gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-[var(--accent)]' : 'bg-transparent'}`} />
                                        <div>
                                            <div className="text-[13px] font-semibold text-[var(--text-main)] mb-1">{n.title}</div>
                                            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{n.message}</div>
                                        </div>
                                    </div>
                                </div>
                            )) : <div className="p-8 text-center text-[13px] text-[var(--text-muted)]">No new notifications</div>}
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
};

export default TopBar;
