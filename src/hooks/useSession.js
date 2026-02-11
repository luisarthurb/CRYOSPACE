import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSessionStore } from '../store/sessionStore';

export function useSession(sessionId) {
    const store = useSessionStore();
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Fetch session data
    const fetchSession = useCallback(async () => {
        if (!sessionId) return;
        try {
            const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
            if (data && mountedRef.current) {
                store.setSession(data);
                store.setFogState(data.fog_state || {});
                store.setInitiativeOrder(data.initiative_order || []);
                store.setCurrentTurn(data.current_turn || 0);
                store.setRoundNumber(data.round_number || 1);
            }
        } catch (err) {
            if (err?.name === 'AbortError') return;
            console.error('fetchSession error:', err);
        }
    }, [sessionId]);

    // Fetch tokens
    const fetchTokens = useCallback(async () => {
        if (!sessionId) return;
        try {
            const { data } = await supabase.from('session_tokens').select('*').eq('session_id', sessionId);
            if (data && mountedRef.current) store.setTokens(data);
        } catch (err) {
            if (err?.name === 'AbortError') return;
        }
    }, [sessionId]);

    // Fetch logs
    const fetchLogs = useCallback(async () => {
        if (!sessionId) return;
        try {
            const { data } = await supabase
                .from('session_logs')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true })
                .limit(200);
            if (data && mountedRef.current) store.setLogs(data);
        } catch (err) {
            if (err?.name === 'AbortError') return;
        }
    }, [sessionId]);

    // Initial fetch
    useEffect(() => {
        if (sessionId) {
            fetchSession();
            fetchTokens();
            fetchLogs();
        }
    }, [sessionId, fetchSession, fetchTokens, fetchLogs]);

    // Realtime subscriptions
    useEffect(() => {
        if (!sessionId) return;

        const channel = supabase.channel(`session:${sessionId}`);

        // Listen for token changes
        channel.on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'session_tokens',
            filter: `session_id=eq.${sessionId}`,
        }, (payload) => {
            if (!mountedRef.current) return;
            if (payload.eventType === 'INSERT') {
                store.addToken(payload.new);
            } else if (payload.eventType === 'UPDATE') {
                store.updateToken(payload.new.id, payload.new);
            } else if (payload.eventType === 'DELETE') {
                store.removeToken(payload.old.id);
            }
        });

        // Listen for log changes
        channel.on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'session_logs',
            filter: `session_id=eq.${sessionId}`,
        }, (payload) => {
            if (!mountedRef.current) return;
            store.addLog(payload.new);
        });

        // Listen for session changes (initiative, turn, fog, status)
        channel.on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'sessions',
            filter: `id=eq.${sessionId}`,
        }, (payload) => {
            if (!mountedRef.current) return;
            const s = payload.new;
            store.setSession(s);
            store.setFogState(s.fog_state || {});
            store.setInitiativeOrder(s.initiative_order || []);
            store.setCurrentTurn(s.current_turn || 0);
            store.setRoundNumber(s.round_number || 1);
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    // === ACTIONS ===

    const moveToken = async (tokenId, x, y) => {
        store.moveToken(tokenId, x, y); // Optimistic
        await supabase.from('session_tokens').update({ x, y }).eq('id', tokenId);
    };

    const updateTokenHp = async (tokenId, hp) => {
        store.updateToken(tokenId, { hp });
        await supabase.from('session_tokens').update({ hp }).eq('id', tokenId);
    };

    const addTokenCondition = async (tokenId, condition) => {
        const token = store.tokens.find((t) => t.id === tokenId);
        if (!token) return;
        const conditions = [...(token.conditions || [])];
        if (!conditions.includes(condition)) conditions.push(condition);
        store.updateToken(tokenId, { conditions });
        await supabase.from('session_tokens').update({ conditions }).eq('id', tokenId);
    };

    const removeTokenCondition = async (tokenId, condition) => {
        const token = store.tokens.find((t) => t.id === tokenId);
        if (!token) return;
        const conditions = (token.conditions || []).filter((c) => c !== condition);
        store.updateToken(tokenId, { conditions });
        await supabase.from('session_tokens').update({ conditions }).eq('id', tokenId);
    };

    const spawnToken = async (tokenData) => {
        const { data } = await supabase
            .from('session_tokens')
            .insert({ ...tokenData, session_id: sessionId })
            .select()
            .single();
        return data;
    };

    const removeTokenFromSession = async (tokenId) => {
        await supabase.from('session_tokens').delete().eq('id', tokenId);
    };

    const sendLog = async (type, content, rollResult = null, metadata = {}) => {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('session_logs').insert({
            session_id: sessionId,
            user_id: user?.id,
            type,
            content,
            roll_result: rollResult,
            metadata,
        });
    };

    const updateInitiative = async (order, currentTurn = 0, roundNumber = 1) => {
        store.setInitiativeOrder(order);
        store.setCurrentTurn(currentTurn);
        store.setRoundNumber(roundNumber);
        await supabase.from('sessions').update({
            initiative_order: order,
            current_turn: currentTurn,
            round_number: roundNumber,
        }).eq('id', sessionId);
    };

    const advanceTurn = async () => {
        const { initiativeOrder, currentTurn, roundNumber } = useSessionStore.getState();
        const next = currentTurn + 1;
        if (next >= initiativeOrder.length) {
            await updateInitiative(initiativeOrder, 0, roundNumber + 1);
        } else {
            await updateInitiative(initiativeOrder, next, roundNumber);
        }
    };

    const updateFog = async (fogState) => {
        store.setFogState(fogState);
        await supabase.from('sessions').update({ fog_state: fogState }).eq('id', sessionId);
    };

    const updateSessionStatus = async (status) => {
        await supabase.from('sessions').update({ status }).eq('id', sessionId);
    };

    return {
        ...store,
        fetchSession,
        fetchTokens,
        fetchLogs,
        moveToken,
        updateTokenHp,
        addTokenCondition,
        removeTokenCondition,
        spawnToken,
        removeTokenFromSession,
        sendLog,
        updateInitiative,
        advanceTurn,
        updateFog,
        updateSessionStatus,
    };
}
