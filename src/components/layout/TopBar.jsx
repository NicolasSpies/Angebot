import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n/I18nContext';
import { Globe, Bell, X, ShieldCheck, AlertTriangle, ChevronRight, Info, RefreshCw, CheckCircle2 } from 'lucide-react';
import { dataService } from '../../data/dataService';
import { useNavigate, Link } from 'react-router-dom';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import { toast } from 'react-hot-toast';

const TopBar = () => {
    const { locale, setLocale } = useI18n();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAuditPanel, setShowAuditPanel] = useState(false);
    const [auditIssues, setAuditIssues] = useState([]);
    const [isAuditLoading, setIsAuditLoading] = useState(false);
    const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const [auditDropdownPos, setAuditDropdownPos] = useState({ top: 0, right: 0 });
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const auditTriggerRef = useRef(null);
    const auditMenuRef = useRef(null);

    useEffect(() => {
        loadNotifications();
        loadAuditIssues();
        const interval = setInterval(() => {
            loadNotifications();
            loadAuditIssues();
        }, 30000);
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
            if (
                auditTriggerRef.current && !auditTriggerRef.current.contains(event.target) &&
                auditMenuRef.current && !auditMenuRef.current.contains(event.target)
            ) {
                setShowAuditPanel(false);
            }
        };
        if (showNotifications || showAuditPanel) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications, showAuditPanel]);

    // Close on scroll/resize
    useEffect(() => {
        if (!showNotifications && !showAuditPanel) return;
        const close = () => {
            setShowNotifications(false);
            setShowAuditPanel(false);
        };
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [showNotifications, showAuditPanel]);

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

    const loadAuditIssues = async () => {
        try {
            const data = await dataService.getAuditChecks();
            if (data && !data.error) {
                setAuditIssues(data.issues || []);
            }
        } catch (err) {
            console.error('Failed to load audit issues:', err);
        }
    };

    const runAuditRefresh = async () => {
        setIsAuditLoading(true);
        await loadAuditIssues();
        setIsAuditLoading(false);
    };

    const handleMarkAllRead = async () => {
        await dataService.markAllNotificationsRead();
        loadNotifications();
    };

    const handleClearAll = () => {
        setIsClearAllDialogOpen(true);
    };

    const handleClearAllClick = () => {
        setIsClearAllDialogOpen(true);
    };

    const confirmClearAll = async () => {
        try {
            await dataService.clearAllNotifications();
            loadNotifications();
        } catch (err) {
            console.error('Clear notifications failed', err);
        } finally {
            setIsClearAllDialogOpen(false);
        }
    };

    const handleDeleteNotification = async (e, id) => {
        e.stopPropagation();
        await dataService.deleteNotification(id);
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
        setShowAuditPanel(false);
    };

    const toggleAuditPanel = () => {
        if (!showAuditPanel && auditTriggerRef.current) {
            const rect = auditTriggerRef.current.getBoundingClientRect();
            setAuditDropdownPos({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            });
        }
        setShowAuditPanel(!showAuditPanel);
        setShowNotifications(false);
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
                <div className="flex items-center gap-2">
                    <Globe size={16} className="text-[var(--text-secondary)]" />
                    <Select
                        className="w-28"
                        containerStyle={{ gap: 0 }}
                        value={locale}
                        onChange={(e) => setLocale(e.target.value)}
                        options={[
                            { value: 'de', label: 'Deutsch' },
                            { value: 'fr', label: 'Français' }
                        ]}
                    />
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

                {/* Audit Shield */}
                <div ref={auditTriggerRef}>
                    <button
                        onClick={toggleAuditPanel}
                        className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--bg-app)] transition-colors relative ${auditIssues.length > 0 ? 'text-amber-500' : 'text-[var(--text-secondary)]'}`}
                    >
                        <ShieldCheck size={18} />
                        {auditIssues.length > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center bg-amber-500 text-white text-[9px] font-black rounded-full border-2 border-white shadow-sm">
                                {auditIssues.length}
                            </span>
                        )}
                    </button>
                </div>

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
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-main)]">Notifications</span>
                            <div className="flex gap-3">
                                {unreadCount > 0 && <button onClick={handleMarkAllRead} className="text-[10px] font-bold text-[var(--primary)] hover:underline">MARK ALL READ</button>}
                                {notifications.length > 0 && <button onClick={handleClearAllClick} className="text-[10px] font-bold text-red-500 hover:underline">CLEAR ALL</button>}
                            </div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`p-4 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-app)] transition-colors cursor-pointer group/item relative ${!n.is_read ? 'bg-[var(--primary)]/5' : ''}`}
                                    onClick={() => handleNotificationClick(n)}
                                >
                                    <div className="flex gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-[var(--primary)]' : 'bg-transparent'}`} />
                                        <div className="flex-1 min-w-0 pr-6">
                                            <div className="text-[13px] font-semibold text-[var(--text-main)] mb-1 leading-tight">{n.title}</div>
                                            <div className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{n.message}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteNotification(e, n.id)}
                                        className="absolute right-4 top-4 p-1 hover:bg-red-50 rounded text-[var(--text-muted)] hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-all"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )) : <div className="p-12 text-center text-[13px] text-[var(--text-muted)]">No new notifications</div>}
                        </div>
                        <div className="p-2 border-t border-[var(--border-subtle)] bg-[var(--bg-app)]/30 text-center">
                            <Link
                                to="/notifications"
                                className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--primary)] tracking-wide uppercase px-3 py-1 block"
                                onClick={() => setShowNotifications(false)}
                            >
                                View All
                            </Link>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Audit Dropdown — Portal */}
                {showAuditPanel && createPortal(
                    <div
                        ref={auditMenuRef}
                        className="fixed w-[340px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-floating)] overflow-hidden"
                        style={{
                            top: auditDropdownPos.top,
                            right: auditDropdownPos.right,
                            zIndex: 'var(--z-dropdown, 100)',
                        }}
                    >
                        <div className="p-3 border-b border-[var(--border-subtle)] flex justify-between items-center bg-[var(--bg-app)]/50">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="text-amber-500" size={16} />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-main)]">System Health</span>
                            </div>
                            <button
                                onClick={runAuditRefresh}
                                className={`text-[10px] font-black text-[var(--primary)] hover:underline uppercase flex items-center gap-1 ${isAuditLoading ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <RefreshCw size={10} className={isAuditLoading ? 'animate-spin' : ''} />
                                REFRESH
                            </button>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {auditIssues.length > 0 ? (
                                <div className="divide-y divide-[var(--border-subtle)]">
                                    {auditIssues.map((issue, idx) => (
                                        <div key={idx} className="p-4 hover:bg-[var(--bg-app)] transition-colors group/audit bg-amber-50/30">
                                            <div className="flex gap-3 mb-3">
                                                <div className={`p-1.5 rounded-lg shrink-0 h-fit ${issue.type === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    <AlertTriangle size={14} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-[13px] font-bold text-[var(--text-main)] truncate">{issue.title || 'Data Discrepancy'}</h4>
                                                        <Badge variant={issue.type === 'critical' ? 'danger' : 'warning'} className="text-[8px] h-3.5 px-1 py-0 font-black">
                                                            {issue.type?.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                                                        {issue.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end pr-1">
                                                <button
                                                    onClick={() => {
                                                        if (issue.offerId) navigate(`/offer/preview/${issue.offerId}`);
                                                        else if (issue.projectId) navigate(`/projects/${issue.projectId}`);
                                                        else if (issue.customerId) navigate(`/customers`);
                                                        else navigate(`/settings/audit`);
                                                        setShowAuditPanel(false);
                                                    }}
                                                    className="flex items-center gap-1.5 text-[11px] font-black text-[var(--primary)] hover:translate-x-1 transition-transform uppercase"
                                                >
                                                    Fix Issue <ChevronRight size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center text-center px-6">
                                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-500 mb-4 shadow-sm">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <h4 className="text-[14px] font-bold text-[var(--text-main)] mb-1">All Systems Healthy</h4>
                                    <p className="text-[11px] text-[var(--text-secondary)] font-medium">No logical discrepancies detected.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-2 border-t border-[var(--border-subtle)] bg-[var(--bg-app)]/30 text-center">
                            <Link
                                to="/settings/audit"
                                className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--primary)] tracking-wide uppercase px-3 py-1 block"
                                onClick={() => setShowAuditPanel(false)}
                            >
                                Open Full Audit
                            </Link>
                        </div>
                    </div>,
                    document.body
                )}
            </div>

            <ConfirmationDialog
                isOpen={isClearAllDialogOpen}
                onClose={() => setIsClearAllDialogOpen(false)}
                onConfirm={confirmClearAll}
                title="Clear All Notifications"
                message="Are you sure you want to delete all notifications? This action cannot be undone."
                confirmText="Clear All"
                isDestructive={true}
            />
        </div>
    );
};

export default TopBar;
