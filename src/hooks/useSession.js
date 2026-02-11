import { useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useSessionStore } from '../store/sessionStore';
import { formatRoll } from '../engine/diceEngine';

/**
 * useSession hook — connects to a Supabase session with Realtime.
 * Uses granular Zustand selectors to prevent unnecessary re-renders.
 * Caches the current user to avoid repeated auth calls.
 */
export function useSession(sessionId) {
    const mountedRef = useRef(true);
    const cachedUserIdRef = useRef(null);

    // Use GRANULAR selectors — only subscribe to state we actually need.
    // This prevents the 300-cell grid from re-rendering when unrelated state changes.
    const session = useSessionStore((s) => s.session);
    const tokens = useSessionStore((s) => s.tokens);
    const logs = useSessionStore((s) => s.logs);
    const initiativeOrder = useSessionStore((s) => s.initiativeOrder);
    const currentTurn = useSessionStore((s) => s.currentTurn);
    const roundNumber = useSessionStore((s) => s.roundNumber);
    const fogState = useSessionStore((s) => s.fogState);
    const isGm = useSessionStore((s) => s.isGm);
    const selectedTokenId = useSessionStore((s) => s.selectedTokenId);
    const highlightedTiles = useSessionStore((s) => s.highlightedTiles);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Cache the current user ID on mount
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            cachedUserIdRef.current = data?.user?.id || null;
        });
    }, []);

    // Fetch session data
    const fetchSession = useCallback(async () => {
        if (!sessionId) return;
        try {
            const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
            if (data && mountedRef.current) {
                const store = useSessionStore.getState();
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
            if (data && mountedRef.current) useSessionStore.getState().setTokens(data);
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
            if (data && mountedRef.current) useSessionStore.getState().setLogs(data);
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
        return () => {
            // Reset session on unmount
            useSessionStore.getState().resetSession();
        };
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
            const store = useSessionStore.getState();
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
            useSessionStore.getState().addLog(payload.new);
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
            const store = useSessionStore.getState();
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

    // === ACTIONS (all use getState() to avoid stale closures) ===

    const moveToken = useCallback(async (tokenId, x, y) => {
        useSessionStore.getState().moveToken(tokenId, x, y); // Optimistic
        await supabase.from('session_tokens').update({ x, y }).eq('id', tokenId);
    }, []);

    const updateTokenHp = useCallback(async (tokenId, hp) => {
        useSessionStore.getState().updateToken(tokenId, { hp });
        await supabase.from('session_tokens').update({ hp }).eq('id', tokenId);
    }, []);

    const addTokenCondition = useCallback(async (tokenId, condition) => {
        const token = useSessionStore.getState().tokens.find((t) => t.id === tokenId);
        if (!token) return;
        const conditions = [...(token.conditions || [])];
        if (!conditions.includes(condition)) conditions.push(condition);
        useSessionStore.getState().updateToken(tokenId, { conditions });
        await supabase.from('session_tokens').update({ conditions }).eq('id', tokenId);
    }, []);

    const removeTokenCondition = useCallback(async (tokenId, condition) => {
        const token = useSessionStore.getState().tokens.find((t) => t.id === tokenId);
        if (!token) return;
        const conditions = (token.conditions || []).filter((c) => c !== condition);
        useSessionStore.getState().updateToken(tokenId, { conditions });
        await supabase.from('session_tokens').update({ conditions }).eq('id', tokenId);
    }, []);

    const spawnToken = useCallback(async (tokenData) => {
        const { data } = await supabase
            .from('session_tokens')
            .insert({ ...tokenData, session_id: sessionId })
            .select()
            .single();
        return data;
    }, [sessionId]);

    const removeTokenFromSession = useCallback(async (tokenId) => {
        await supabase.from('session_tokens').delete().eq('id', tokenId);
    }, []);

    const sendLog = useCallback(async (type, content, rollResult = null, metadata = {}) => {
        await supabase.from('session_logs').insert({
            session_id: sessionId,
            user_id: cachedUserIdRef.current,
            type,
            content,
            roll_result: rollResult,
            metadata,
        });
    }, [sessionId]);

    const updateInitiative = useCallback(async (order, turn = 0, round = 1) => {
        const store = useSessionStore.getState();
        store.setInitiativeOrder(order);
        store.setCurrentTurn(turn);
        store.setRoundNumber(round);
        await supabase.from('sessions').update({
            initiative_order: order,
            current_turn: turn,
            round_number: round,
        }).eq('id', sessionId);
    }, [sessionId]);

    const advanceTurn = useCallback(async () => {
        const { initiativeOrder, currentTurn, roundNumber } = useSessionStore.getState();
        const next = currentTurn + 1;
        if (next >= initiativeOrder.length) {
            await updateInitiative(initiativeOrder, 0, roundNumber + 1);
        } else {
            await updateInitiative(initiativeOrder, next, roundNumber);
        }
    }, [updateInitiative]);

    const updateFog = useCallback(async (newFogState) => {
        useSessionStore.getState().setFogState(newFogState);
        await supabase.from('sessions').update({ fog_state: newFogState }).eq('id', sessionId);
    }, [sessionId]);

    const revealTile = useCallback(async (key) => {
        const store = useSessionStore.getState();
        const newFog = { ...store.fogState, [key]: true };
        store.setFogState(newFog);
        await supabase.from('sessions').update({ fog_state: newFog }).eq('id', sessionId);
    }, [sessionId]);

    const selectToken = useCallback((id) => {
        useSessionStore.getState().selectToken(id);
    }, []);

    const setIsGm = useCallback((val) => {
        useSessionStore.getState().setIsGm(val);
    }, []);

    const updateSessionStatus = useCallback(async (status) => {
        await supabase.from('sessions').update({ status }).eq('id', sessionId);
    }, [sessionId]);

    // Stable actions object — only recreated if sessionId changes
    const actions = useMemo(() => ({
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
        revealTile,
        selectToken,
        setIsGm,
        updateSessionStatus,
    }), [
        fetchSession, fetchTokens, fetchLogs,
        moveToken, updateTokenHp, addTokenCondition, removeTokenCondition,
        spawnToken, removeTokenFromSession, sendLog,
        updateInitiative, advanceTurn, updateFog, revealTile,
        selectToken, setIsGm, updateSessionStatus,
    ]);

    return {
        // State (granular)
        session,
        tokens,
        logs,
        initiativeOrder,
        currentTurn,
        roundNumber,
        fogState,
        isGm,
        selectedTokenId,
        highlightedTiles,
        // Actions
        ...actions,
    };
}
