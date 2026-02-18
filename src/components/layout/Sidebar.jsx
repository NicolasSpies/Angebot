import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Briefcase, Users, Zap, Settings, Command, Trash2, Activity, ShieldCheck, FileCheck } from 'lucide-react';

const Sidebar = () => {
    const workspaceItems = [
        { to: "/dashboard", icon: LayoutDashboard, label: 'Dashboard' },
        { to: "/offers", icon: FileText, label: 'Offers' },
        { to: "/projects", icon: Briefcase, label: 'Projects' },
        { to: "/reviews", icon: FileCheck, label: 'Reviews' },
        { to: "/customers", icon: Users, label: 'Customers' },
        { to: "/portals", icon: ShieldCheck, label: 'Portals' },
    ];

    const systemItems = [
        { to: "/services", icon: Zap, label: 'Services' },
        { to: "/trash", icon: Trash2, label: 'Trash' },
        { to: "/settings", icon: Settings, label: 'Settings' },
    ];

    const navItemClasses = ({ isActive }) => `
        flex items-center gap-3 px-[14px] py-[10px] rounded-[12px] text-[14px] font-medium transition-all duration-150 ease-in-out border-l-[3px]
        ${isActive
            ? 'bg-[rgba(15,23,42,0.06)] text-[var(--primary)] font-semibold border-[var(--primary)] shadow-none'
            : 'bg-transparent text-[var(--text-secondary)] border-transparent hover:bg-[rgba(0,0,0,0.04)] hover:text-[var(--text-main)] hover:scale-[1.01] hover:shadow-[0_2px_6px_rgba(0,0,0,0.04)]'}
    `;

    const iconClasses = (isActive) => `
        transition-all duration-150 ease-in-out
        ${isActive ? 'opacity-100 text-[var(--primary)]' : 'opacity-70 group-hover:opacity-100'}
    `;

    return (
        <div className="flex flex-col h-full bg-[var(--bg-sidebar)]">
            {/* Logo Area */}
            <div className="h-[64px] flex items-center px-6 border-b border-[rgba(0,0,0,0.06)] flex-shrink-0">
                <div className="flex items-center gap-3 text-[var(--text-main)]">
                    <div className="w-8 h-8 bg-[var(--primary)] rounded-[var(--radius-md)] text-white flex items-center justify-center shadow-sm">
                        <Command size={18} />
                    </div>
                    <span className="font-bold text-[15px] tracking-tight text-[var(--text-main)]">Angebot</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-8 px-3 flex flex-col gap-8 custom-scrollbar">
                <div>
                    <div className="px-3 mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-80">
                        Workspace
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {workspaceItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={navItemClasses}
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon size={18} className={iconClasses(isActive)} />
                                        <span>{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </div>

                <div className="h-px bg-[rgba(0,0,0,0.06)] mx-2" />

                <div>
                    <div className="px-3 mb-3 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-80">
                        System
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {systemItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={navItemClasses}
                            >
                                {({ isActive }) => (
                                    <>
                                        <item.icon size={18} className={iconClasses(isActive)} />
                                        <span>{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Profile Footer */}
            <div className="p-4 border-t border-[rgba(0,0,0,0.06)] bg-transparent">
                <div className="flex items-center gap-3 p-2.5 rounded-[12px] hover:bg-[rgba(0,0,0,0.04)] transition-all duration-150 cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-[14px] shadow-sm transform transition-transform group-hover:scale-105">
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
