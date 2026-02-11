import React, { useEffect, useMemo, useCallback, memo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSession } from '../../hooks/useSession';
import TurnTracker from './TurnTracker';
import SessionChat from './SessionChat';
import ActionBar from './ActionBar';
import GMDashboard from './GMDashboard';
import DiceRoller from './DiceRoller';
import { useSessionStore } from '../../store/sessionStore';
import { formatRoll } from '../../engine/diceEngine';

// Memoized grid cell to prevent re-rendering 300 cells on every state change
const GridCell = memo(function GridCell({ col, row, token, isFogged, isHighlighted, isSelected, isGm, onCellClick }) {
    return (
        <div
            className={`grid-cell ${isFogged ? 'fogged' : ''} ${isHighlighted ? 'highlighted' : ''} ${token ? 'has-token' : ''}`}
            onClick={() => onCellClick(col, row, token)}
        >
            {token && !isFogged && (
                <div
                    className={`session-token ${isSelected ? 'selected' : ''} ${token.hp <= 0 ? 'downed' : ''}`}
                    style={{ '--token-color': token.token_color }}
                    title={`${token.label} (HP: ${token.hp}/${token.max_hp})`}
                >
                    <span className="token-label">{token.label.charAt(0)}</span>
                    <div className="token-hp-pip">
                        <div
                            className="token-hp-fill"
                            style={{ width: `${Math.max(0, (token.hp / (token.max_hp || 1)) * 100)}%` }}
                        />
                    </div>
                    {token.conditions?.length > 0 && (
                        <div className="token-conditions">
                            {token.conditions.slice(0, 3).map((c) => (
                                <span key={c} className="token-condition-dot" title={c}>●</span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default function SessionView() {
    const { sessionId } = useParams();
    const { user } = useAuth();
    const session = useSession(sessionId);

    // Use local state for active panel to avoid re-creating the entire session object
    const [activePanel, setActivePanel] = React.useState('chat');

    // Set GM status once session and user are available
    useEffect(() => {
        if (session.session && user) {
            session.setIsGm(session.session.gm_id === user.id);
        }
    }, [session.session?.gm_id, user?.id, session.setIsGm]);

    // Find player's token by matching the user ID to the character owner
    const myToken = useMemo(() => {
        if (!user || !session.tokens.length) return null;
        // Match by user_id on the token, or fall back to first non-NPC token
        return session.tokens.find((t) => t.user_id === user.id && !t.is_npc)
            || session.tokens.find((t) => !t.is_npc)
            || null;
    }, [session.tokens, user]);

    // Build a lookup map of tokens by position for O(1) access instead of O(n) per cell
    const tokensByPosition = useMemo(() => {
        const map = {};
        for (const t of session.tokens) {
            map[`${t.x},${t.y}`] = t;
        }
        return map;
    }, [session.tokens]);

    // Grid cell click handler
    const handleCellClick = useCallback((col, row, token) => {
        if (session.isGm) {
            session.revealTile(`${col},${row}`);
        }
        if (token) {
            session.selectToken(token.id);
        }
    }, [session.isGm, session.revealTile, session.selectToken]);

    // Dice roll handler
    const handleDiceRoll = useCallback((result) => {
        const narrative = formatRoll(result);
        session.sendLog('dice', narrative, result);
    }, [session.sendLog]);

    if (!session.session) {
        return (
            <div className="page-container">
                <div className="loading-spinner">Loading session...</div>
            </div>
        );
    }

    return (
        <div className="session-layout">
            {/* Left: Map Area */}
            <div className="session-map-area">
                <div className="session-map-header">
                    <h2>⚔️ {session.session.status === 'active' ? 'Live Session' : 'Session Paused'}</h2>
                    <div className="session-round-info">
                        Round {session.roundNumber} • Turn {session.currentTurn + 1}/{session.initiativeOrder.length || '—'}
                    </div>
                </div>

                {/* Map + Tokens */}
                <div className="session-map-viewport">
                    <div className="session-grid">
                        {ROWS.map((row) => (
                            <div key={row} className="grid-row">
                                {COLS.map((col) => {
                                    const key = `${col},${row}`;
                                    const token = tokensByPosition[key] || null;
                                    const isFogged = session.isGm ? false : !session.fogState[key];
                                    const isHighlighted = session.highlightedTiles?.some(
                                        (t) => t.x === col && t.y === row
                                    );

                                    return (
                                        <GridCell
                                            key={key}
                                            col={col}
                                            row={row}
                                            token={token}
                                            isFogged={isFogged}
                                            isHighlighted={isHighlighted}
                                            isSelected={token?.id === session.selectedTokenId}
                                            isGm={session.isGm}
                                            onCellClick={handleCellClick}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Turn Tracker */}
                <TurnTracker
                    initiative={session.initiativeOrder}
                    currentTurn={session.currentTurn}
                    roundNumber={session.roundNumber}
                    tokens={session.tokens}
                    isGm={session.isGm}
                    onAdvanceTurn={session.advanceTurn}
                />
            </div>

            {/* Right: Sidebar */}
            <div className="session-sidebar">
                <div className="sidebar-tabs">
                    <button className={`sidebar-tab ${activePanel === 'chat' ? 'active' : ''}`} onClick={() => setActivePanel('chat')}>
                        💬 Chat
                    </button>
                    {session.isGm && (
                        <button className={`sidebar-tab ${activePanel === 'gm' ? 'active' : ''}`} onClick={() => setActivePanel('gm')}>
                            🎭 GM
                        </button>
                    )}
                    <button className={`sidebar-tab ${activePanel === 'dice' ? 'active' : ''}`} onClick={() => setActivePanel('dice')}>
                        🎲 Dice
                    </button>
                </div>

                <div className="sidebar-panel-content">
                    {activePanel === 'chat' && (
                        <SessionChat
                            logs={session.logs}
                            onSendMessage={(msg) => session.sendLog('chat', msg)}
                        />
                    )}
                    {activePanel === 'gm' && session.isGm && (
                        <GMDashboard session={session} />
                    )}
                    {activePanel === 'dice' && (
                        <DiceRoller onRoll={handleDiceRoll} />
                    )}
                </div>

                {/* Action Bar (always visible at bottom) */}
                <ActionBar session={session} myToken={myToken} />
            </div>
        </div>
    );
}

// Precomputed row/col arrays to avoid Array.from on every render
const ROWS = Array.from({ length: 15 }, (_, i) => i);
const COLS = Array.from({ length: 20 }, (_, i) => i);
