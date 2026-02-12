import React from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext';

const Sidebar = () => {
    const { t } = useI18n();

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                Angebot.io
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    {t('nav.dashboard')}
                </NavLink>
                <NavLink to="/offers" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    {t('nav.offers')}
                </NavLink>
                <NavLink to="/customers" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    {t('nav.customers')}
                </NavLink>
                <NavLink to="/services" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    {t('nav.services')}
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    {t('nav.settings')}
                </NavLink>
            </nav>
        </aside>
    );
};

export default Sidebar;
