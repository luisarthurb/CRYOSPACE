import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    // Fetch profile from DB
    const fetchProfile = useCallback(async (userId) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            if (error) {
                // Profile doesn't exist yet (new user) — that's OK, skip silently
                console.warn('Profile fetch:', error.message);
                return;
            }
            if (mountedRef.current) setProfile(data);
        } catch (err) {
            if (err?.name === 'AbortError') return;
            console.error('fetchProfile error:', err);
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        // Safety timeout: never get stuck on loading screen for more than 8s
        const timeout = setTimeout(() => {
            if (mountedRef.current && loading) {
                console.warn('Auth loading timed out — showing login page');
                setLoading(false);
            }
        }, 8000);

        // 1. Set up auth listener FIRST (before getSession, per Supabase docs)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!mountedRef.current) return;
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                if (currentUser) {
                    await fetchProfile(currentUser.id);
                } else {
                    setProfile(null);
                }
                setLoading(false);
            }
        );

        // 2. Then get the current session
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                if (!mountedRef.current) return;
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                if (currentUser) {
                    fetchProfile(currentUser.id);
                }
                setLoading(false);
            })
            .catch((err) => {
                // Supabase unreachable, project paused, network issue, etc.
                console.error('getSession failed:', err);
                if (mountedRef.current) setLoading(false);
            });

        return () => {
            mountedRef.current = false;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const signInWithEmail = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const signUpWithEmail = async (email, password, displayName) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: displayName },
            },
        });
        if (error) throw error;
        return data;
    };

    const signInWithDiscord = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
        setProfile(null);
    };

    const updateProfile = async (updates) => {
        if (!user) return;
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
            .select()
            .single();
        if (error) throw error;
        if (mountedRef.current) setProfile(data);
        return data;
    };

    return {
        user,
        profile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithDiscord,
        signOut,
        updateProfile,
    };
}
