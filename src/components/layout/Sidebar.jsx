import React from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';
import { LayoutDashboard, FileText, Briefcase, Users, Zap, Settings, Command } from 'lucide-react';

const Sidebar = () => {
    const { t } = useI18n();

    const navItems = [
        { to: "/dashboard", icon: LayoutDashboard, label: t('nav.dashboard') },
        { to: "/offers", icon: FileText, label: t('nav.offers') },
        { to: "/projects", icon: Briefcase, label: t('nav.projects') },
        { to: "/customers", icon: Users, label: t('nav.customers') },
        { to: "/services", icon: Zap, label: t('nav.services') },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div style={{ background: 'var(--primary)', padding: '5px', borderRadius: '6px', color: 'white', display: 'flex' }}>
                    <Command size={18} />
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>Angebot</span>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingBottom: '1.5rem' }}>
                <div style={{ padding: '0 1.5rem 0.75rem', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Menu
                </div>
                {navItems.map((item) => (
                    <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        {({ isActive }) => (
                            <>
                                <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                                <span>{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}

                <div style={{ marginTop: 'auto' }}>
                    <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        {({ isActive }) => (
                            <>
                                <Settings size={18} strokeWidth={isActive ? 2 : 1.5} />
                                <span>{t('nav.settings')}</span>
                            </>
                        )}
                    </NavLink>

                    {/* User Profile Section - Dash Style */}
                    <div style={{
                        marginTop: '1rem',
                        margin: '0 1rem 1.5rem',
                        padding: '1rem',
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--bg-main)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        border: '1px solid var(--border)',
                        cursor: 'pointer'
                    }} className="sidebar-user">
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'var(--primary)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '14px'
                        }}>
                            NS
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>Nicolas Spies</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Admin</span>
                        </div>
                    </div>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;
