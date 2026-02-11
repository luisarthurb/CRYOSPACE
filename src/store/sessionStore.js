import { create } from 'zustand';

export const useSessionStore = create((set, get) => ({
    // Session data
    session: null,
    tokens: [],
    logs: [],
    initiativeOrder: [],
    currentTurn: 0,
    roundNumber: 1,
    fogState: {},
    isGm: false,

    // UI state
    selectedTokenId: null,
    highlightedTiles: [],

    // Session management
    setSession: (session) => set({ session }),
    setIsGm: (isGm) => set({ isGm }),

    // Token management
    setTokens: (tokens) => set({ tokens }),
    addToken: (token) => set((s) => ({ tokens: [...s.tokens, token] })),
    removeToken: (id) => set((s) => ({ tokens: s.tokens.filter((t) => t.id !== id) })),
    updateToken: (id, updates) => set((s) => ({
        tokens: s.tokens.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
    moveToken: (id, x, y) => set((s) => ({
        tokens: s.tokens.map((t) => (t.id === id ? { ...t, x, y } : t)),
    })),
    selectToken: (id) => set({ selectedTokenId: id }),
    getSelectedToken: () => {
        const state = get();
        return state.tokens.find((t) => t.id === state.selectedTokenId) || null;
    },

    // Log management
    setLogs: (logs) => set({ logs }),
    addLog: (log) => set((s) => ({ logs: [...s.logs, log] })),

    // Initiative
    setInitiativeOrder: (order) => set({ initiativeOrder: order }),
    setCurrentTurn: (turn) => set({ currentTurn: turn }),
    setRoundNumber: (round) => set({ roundNumber: round }),
    nextTurn: () => set((s) => {
        const next = s.currentTurn + 1;
        if (next >= s.initiativeOrder.length) {
            return { currentTurn: 0, roundNumber: s.roundNumber + 1 };
        }
        return { currentTurn: next };
    }),

    // Fog of war
    setFogState: (fog) => set({ fogState: fog }),
    revealTile: (key) => set((s) => ({
        fogState: { ...s.fogState, [key]: true },
    })),
    hideTile: (key) => set((s) => ({
        fogState: { ...s.fogState, [key]: false },
    })),
    revealArea: (keys) => set((s) => {
        const fog = { ...s.fogState };
        keys.forEach((k) => { fog[k] = true; });
        return { fogState: fog };
    }),

    // Highlighted tiles (for movement range, spell range, etc.)
    setHighlightedTiles: (tiles) => set({ highlightedTiles: tiles }),
    clearHighlightedTiles: () => set({ highlightedTiles: [] }),

    // Reset
    resetSession: () => set({
        session: null,
        tokens: [],
        logs: [],
        initiativeOrder: [],
        currentTurn: 0,
        roundNumber: 1,
        fogState: {},
        isGm: false,
        selectedTokenId: null,
        highlightedTiles: [],
    }),
}));
