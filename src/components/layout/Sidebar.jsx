import React from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { LayoutDashboard, FileText, Briefcase, Users, Zap, Settings, Command, Trash2, Activity, ShieldCheck } from 'lucide-react';

const Sidebar = () => {
    const { t } = useI18n();

    const workspaceItems = [
        { to: "/dashboard", icon: LayoutDashboard, label: t('nav.dashboard') },
        { to: "/activity", icon: Activity, label: t('nav.activity') || 'Activity' },
        { to: "/offers", icon: FileText, label: t('nav.offers') },
        { to: "/projects", icon: Briefcase, label: t('nav.projects') },
        { to: "/customers", icon: Users, label: t('nav.customers') },
        { to: "/services", icon: Zap, label: t('nav.services') },
    ];

    const systemItems = [
        { to: "/settings/audit", icon: ShieldCheck, label: 'Audit Mode' },
        { to: "/trash", icon: Trash2, label: t('nav.trash') || 'Trash' },
        { to: "/settings", icon: Settings, label: t('nav.settings') },
    ];

    return (
        <div className="flex flex-col h-full bg-[var(--bg-sidebar)]">
            {/* Logo Area */}
            <div className="h-[64px] flex items-center px-6 border-b border-[var(--border-subtle)] flex-shrink-0">
                <div className="flex items-center gap-3 text-[var(--text-main)]">
                    <div className="w-8 h-8 bg-[var(--primary)] rounded-[var(--radius-md)] text-white flex items-center justify-center shadow-sm">
                        <Command size={18} />
                    </div>
                    <span className="font-bold text-[15px] tracking-tight">Angebot</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-8 custom-scrollbar">
                <div>
                    <div className="px-2 mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Workspace
                    </div>
                    <div className="flex flex-col gap-1">
                        {workspaceItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-[14px] font-medium transition-all
                                    ${isActive
                                        ? 'bg-[var(--bg-app)] text-[var(--text-main)] font-semibold shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-app)]/50 hover:text-[var(--text-main)]'}
                                `}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="px-2 mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        System
                    </div>
                    <div className="flex flex-col gap-1">
                        {systemItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-[14px] font-medium transition-all
                                    ${isActive
                                        ? 'bg-[var(--bg-app)] text-[var(--text-main)] font-semibold shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-app)]/50 hover:text-[var(--text-main)]'}
                                `}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Profile Footer */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <div className="flex items-center gap-3 p-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-app)] transition-colors cursor-pointer">
                    <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-[13px] shadow-sm">
                        NS
                    </div>
                    <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="text-[13px] font-bold text-[var(--text-main)] truncate">Nicolas Spies</span>
                        <span className="text-[11px] text-[var(--text-secondary)] truncate">Administrator</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
