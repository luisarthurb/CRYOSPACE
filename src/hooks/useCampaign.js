import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useCampaigns(userId) {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const fetchCampaigns = useCallback(async () => {
        if (!userId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('gm_id', userId)
                .order('created_at', { ascending: false });
            if (!error && mountedRef.current) setCampaigns(data || []);
        } catch (err) {
            if (err?.name === 'AbortError') return;
            console.error('fetchCampaigns error:', err);
        }
        if (mountedRef.current) setLoading(false);
    }, [userId]);

    useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

    const createCampaign = async (campaign) => {
        const { data, error } = await supabase
            .from('campaigns')
            .insert({ ...campaign, gm_id: userId })
            .select()
            .single();
        if (error) throw error;
        if (mountedRef.current) setCampaigns((prev) => [data, ...prev]);
        return data;
    };

    const updateCampaign = async (id, updates) => {
        const { data, error } = await supabase
            .from('campaigns')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        if (mountedRef.current) setCampaigns((prev) => prev.map((c) => (c.id === id ? data : c)));
        return data;
    };

    const deleteCampaign = async (id) => {
        const { error } = await supabase.from('campaigns').delete().eq('id', id);
        if (error) throw error;
        if (mountedRef.current) setCampaigns((prev) => prev.filter((c) => c.id !== id));
    };

    return { campaigns, loading, fetchCampaigns, createCampaign, updateCampaign, deleteCampaign };
}

// Hook for a single campaign's nested entities
export function useCampaignEntities(campaignId, table) {
    const [entities, setEntities] = useState([]);
    const [loading, setLoading] = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const fetchEntities = useCallback(async () => {
        if (!campaignId) { setLoading(false); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .eq('campaign_id', campaignId)
                .order('created_at', { ascending: false });
            if (!error && mountedRef.current) setEntities(data || []);
        } catch (err) {
            if (err?.name === 'AbortError') return;
            console.error(`fetch ${table} error:`, err);
        }
        if (mountedRef.current) setLoading(false);
    }, [campaignId, table]);

    useEffect(() => { fetchEntities(); }, [fetchEntities]);

    const createEntity = async (entity) => {
        const { data, error } = await supabase
            .from(table)
            .insert({ ...entity, campaign_id: campaignId })
            .select()
            .single();
        if (error) throw error;
        if (mountedRef.current) setEntities((prev) => [data, ...prev]);
        return data;
    };

    const updateEntity = async (id, updates) => {
        const { data, error } = await supabase
            .from(table)
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        if (mountedRef.current) setEntities((prev) => prev.map((e) => (e.id === id ? data : e)));
        return data;
    };

    const deleteEntity = async (id) => {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        if (mountedRef.current) setEntities((prev) => prev.filter((e) => e.id !== id));
    };

    return { entities, loading, fetchEntities, createEntity, updateEntity, deleteEntity };
}
