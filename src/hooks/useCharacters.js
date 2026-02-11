import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useCharacters(userId) {
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const fetchCharacters = useCallback(async () => {
        if (!userId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .eq('owner_id', userId)
                .order('created_at', { ascending: false });
            if (!error && mountedRef.current) setCharacters(data || []);
        } catch (err) {
            if (err?.name === 'AbortError') return; // Ignore React StrictMode aborts
            console.error('fetchCharacters error:', err);
        }
        if (mountedRef.current) setLoading(false);
    }, [userId]);

    useEffect(() => { fetchCharacters(); }, [fetchCharacters]);

    const createCharacter = async (character) => {
        const { data, error } = await supabase
            .from('characters')
            .insert({ ...character, owner_id: userId })
            .select()
            .single();
        if (error) throw error;
        if (mountedRef.current) setCharacters((prev) => [data, ...prev]);
        return data;
    };

    const updateCharacter = async (id, updates) => {
        const { data, error } = await supabase
            .from('characters')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        if (mountedRef.current) setCharacters((prev) => prev.map((c) => (c.id === id ? data : c)));
        return data;
    };

    const deleteCharacter = async (id) => {
        const { error } = await supabase
            .from('characters')
            .delete()
            .eq('id', id);
        if (error) throw error;
        if (mountedRef.current) setCharacters((prev) => prev.filter((c) => c.id !== id));
    };

    return { characters, loading, fetchCharacters, createCharacter, updateCharacter, deleteCharacter };
}
