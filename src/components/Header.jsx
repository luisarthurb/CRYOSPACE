import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
    { path: '/', label: '🗺️ Map Forge' },
    { path: '/characters', label: '⚔️ Characters' },
    { path: '/loreweaver', label: '📖 Lore Weaver' },
];

export default function Header() {
    const { user, profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <header className="app-header">
            <div className="header-brand">
                <div className="header-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <span className="logo-icon">❄️</span>
                    <h1 className="logo-text">
                        Cryo<span className="logo-accent">Space</span>
                    </h1>
                </div>
            </div>

            <nav className="header-nav">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.path}
                        className={`nav-btn ${location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)) ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="header-actions">
                {user && (
                    <div className="user-menu">
                        <span className="user-name">{profile?.display_name || user.email?.split('@')[0]}</span>
                        <button className="sign-out-btn" onClick={signOut} title="Sign out">
                            🚪
                        </button>
                    </div>
                )}
                <span className="version-badge">v0.2</span>
            </div>
        </header>
    );
}
