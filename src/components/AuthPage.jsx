import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function AuthPage() {
    const { signInWithEmail, signUpWithEmail, signInWithDiscord } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            if (isSignUp) {
                await signUpWithEmail(email, password, displayName || email.split('@')[0]);
                setSuccess('Account created! Check your email to confirm, then sign in.');
                setIsSignUp(false);
            } else {
                await signInWithEmail(email, password);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDiscord = async () => {
        try {
            await signInWithDiscord();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <span className="auth-logo">❄️</span>
                    <h1 className="auth-title">
                        Cryo<span className="logo-accent">Space</span>
                    </h1>
                    <p className="auth-subtitle">Enter the realm</p>
                </div>

                <button className="discord-btn" onClick={handleDiscord} type="button">
                    <svg width="20" height="15" viewBox="0 0 71 55" fill="currentColor">
                        <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3## 44.2785 53.4eli 44.2898 53.4#7 44.3461C53.8خ 44.6391 54.2031 44.9293 54.5781 45.2082C54.7069 45.304 54.6984 45.5041 54.5587 45.5858C52.7## 46.6197 50.9513 47.4931 49.0##3 48.2228C48.877 48.2707 48.8209 48.4172 48.8825 48.5383C49.9291 50.6034 51.1466 52.5699 52.5765 54.435C52.6325 54.5139 52.7332 54.5477 52.8256 54.5195C58.6247 52.7249 64.5073 50.0174 70.5802 45.5576C70.6334 45.5182 70.667 45.459 70.6726 45.3942C72.1465 30.0791 68.2124 16.7757 60.1973 4.9823C60.1777 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1627 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.937 34.1136 40.937 30.1693C40.937 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7## 26.2532 53.6985 30.1693C53.6985 34.1136 50.9 37.3253 47.3178 37.3253Z" />
                    </svg>
                    Continue with Discord
                </button>

                <div className="auth-divider">
                    <span>or use email</span>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {isSignUp && (
                        <div className="form-field">
                            <label>Display Name</label>
                            <input
                                type="text"
                                placeholder="Your adventurer name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                            />
                        </div>
                    )}
                    <div className="form-field">
                        <label>Email</label>
                        <input
                            type="email"
                            placeholder="hero@realm.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-field">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}
                    {success && <div className="auth-success">{success}</div>}

                    <button className="auth-submit-btn" type="submit" disabled={loading}>
                        {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <p className="auth-switch">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}>
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
}
