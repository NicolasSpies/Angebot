import React from 'react';
import { useI18n } from '../../i18n/I18nContext';

const TopBar = () => {
    const { locale, setLocale } = useI18n();

    return (
        <header className="topbar">
            <div style={{ fontWeight: 600 }}>Internal Portal</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <select
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '10px', border: '1px solid var(--border)' }}
                >
                    <option value="de">Deutsch</option>
                    <option value="fr">Français</option>
                </select>
            </div>
        </header>
    );
};

export default TopBar;
