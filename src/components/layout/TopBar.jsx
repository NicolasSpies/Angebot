import React from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { Globe, Bell, Search } from 'lucide-react';

const TopBar = () => {
    const { locale, setLocale } = useI18n();

    return (
        <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                <Search size={16} />
                <span>Search everything...</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Globe size={18} />
                    <select
                        value={locale}
                        onChange={(e) => setLocale(e.target.value)}
                        style={{
                            padding: '0.25rem 0.5rem',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            color: 'inherit'
                        }}
                    >
                        <option value="de">Deutsch</option>
                        <option value="fr">Français</option>
                    </select>
                </div>

                <div style={{ color: 'var(--text-secondary)', position: 'relative', cursor: 'pointer' }}>
                    <Bell size={20} />
                    <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '8px',
                        height: '8px',
                        background: 'var(--danger)',
                        borderRadius: '50%',
                        border: '2px solid #fff'
                    }} />
                </div>
            </div>
        </header>
    );
};

export default TopBar;
