import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AuthPage from './AuthPage';

export default function AuthGuard({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="auth-loading">
                <div className="loading-spinner" />
                <p>Loading your adventure...</p>
            </div>
        );
    }

    if (!user) {
        return <AuthPage />;
    }

    return children;
}
