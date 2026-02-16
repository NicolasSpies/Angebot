import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n/I18nContext';
import { Globe, Bell, X, ShieldCheck, AlertTriangle, ChevronRight, Info, RefreshCw, CheckCircle2 } from 'lucide-react';
import { dataService } from '../../data/dataService';
import { useNavigate, Link } from 'react-router-dom';
import Select from '../ui/Select';
import Badge from '../ui/Badge';

const TopBar = () => {
    const { locale, setLocale } = useI18n();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAuditPanel, setShowAuditPanel] = useState(false);
    const [auditIssues, setAuditIssues] = useState([]);
    const [isAuditLoading, setIsAuditLoading] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

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
                <div className="relative">
                    <button
                        onClick={() => setShowAuditPanel(true)}
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

                {/* Audit Slide-over Panel — Portal */}
                {showAuditPanel && createPortal(
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[var(--z-modal, 1000)] animate-in fade-in duration-300"
                            onClick={() => setShowAuditPanel(false)}
                        />
                        {/* Panel */}
                        <div
                            className="fixed top-0 right-0 h-full w-[400px] bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] shadow-[var(--shadow-modal)] z-[var(--z-modal, 1000)] flex flex-col animate-in slide-in-from-right duration-500"
                        >
                            {/* Panel Header */}
                            <div className="h-[64px] flex items-center justify-between px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-app)]/30">
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="text-[var(--primary)]" size={20} />
                                    <h2 className="text-[14px] font-black uppercase tracking-wider text-[var(--text-main)]">System Health Audit</h2>
                                </div>
                                <button
                                    onClick={() => setShowAuditPanel(false)}
                                    className="p-2 hover:bg-[var(--bg-app)] rounded-full transition-colors text-[var(--text-muted)]"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Panel Content */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-[12px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                        {auditIssues.length} Issue{auditIssues.length !== 1 ? 's' : ''} Detected
                                    </span>
                                    <button
                                        onClick={runAuditRefresh}
                                        className={`flex items-center gap-2 text-[11px] font-black text-[var(--primary)] hover:underline uppercase tracking-tight ${isAuditLoading ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        <RefreshCw size={12} className={isAuditLoading ? 'animate-spin' : ''} />
                                        Refresh
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {auditIssues.length > 0 ? (
                                        auditIssues.map((issue, idx) => (
                                            <div
                                                key={idx}
                                                className={`group flex items-stretch border rounded-[var(--radius-lg)] overflow-hidden transition-all hover:shadow-md cursor-pointer ${issue.type === 'critical'
                                                    ? 'bg-red-50 border-red-100 hover:border-red-200'
                                                    : 'bg-amber-50 border-amber-100 hover:border-amber-200'
                                                    }`}
                                                onClick={() => {
                                                    if (issue.offerId) navigate(`/offer/preview/${issue.offerId}`);
                                                    else if (issue.projectId) navigate(`/projects/${issue.projectId}`);
                                                    else if (issue.customerId) navigate(`/customers`);
                                                    setShowAuditPanel(false);
                                                }}
                                            >
                                                <div className={`w-1.5 shrink-0 ${issue.type === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                                                <div className="p-4 flex-1">
                                                    <div className="flex items-start gap-3 mb-2">
                                                        <div className={`p-1.5 rounded-lg ${issue.type === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            <AlertTriangle size={16} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <h3 className={`text-[13px] font-black truncate ${issue.type === 'critical' ? 'text-red-900' : 'text-amber-900'}`}>
                                                                    {issue.title || 'Data Discrepancy'}
                                                                </h3>
                                                                <Badge variant={issue.type === 'critical' ? 'danger' : 'warning'} className="text-[8px] h-3.5 px-1 py-0 font-black">
                                                                    {issue.type.toUpperCase()}
                                                                </Badge>
                                                            </div>
                                                            <p className={`text-[12px] font-medium leading-relaxed ${issue.type === 'critical' ? 'text-red-700/80' : 'text-amber-700/80'}`}>
                                                                {issue.description}
                                                            </p>
                                                        </div>
                                                        <div className="self-center text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ChevronRight size={16} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-12 flex flex-col items-center text-center px-4">
                                            <div className="w-16 h-16 rounded-full bg-[var(--success-bg)]/20 flex items-center justify-center text-[var(--success)] mb-4 shadow-inner">
                                                <CheckCircle2 size={32} />
                                            </div>
                                            <h3 className="text-[16px] font-black text-[var(--text-main)] mb-2">System Healthy</h3>
                                            <p className="text-[13px] text-[var(--text-secondary)] font-medium leading-relaxed">
                                                No logical discrepancies detected. All data relationships are currently synchronized.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Panel Footer */}
                            <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-app)]/10">
                                <div className="flex gap-3">
                                    <Info size={16} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-[var(--text-secondary)] font-semibold leading-relaxed">
                                        Audit mode scans for logical gaps like signed offers without projects or orphaned data records.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )}
            </div>
        </div >
    );
};

export default TopBar;
