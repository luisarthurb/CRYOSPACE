import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useSession } from '../../hooks/useSession';
import TurnTracker from './TurnTracker';
import SessionChat from './SessionChat';
import ActionBar from './ActionBar';
import GMDashboard from './GMDashboard';
import DiceRoller from './DiceRoller';

export default function SessionView() {
    const { sessionId } = useParams();
    const { user } = useAuth();
    const session = useSession(sessionId);
    const [activePanel, setActivePanel] = useState('chat');
    const [showDice, setShowDice] = useState(false);

    useEffect(() => {
        if (session.session && user) {
            session.setIsGm(session.session.gm_id === user.id);
        }
    }, [session.session, user]);

    // Find player's token
    const myToken = session.tokens.find(
        (t) => !t.is_npc && t.character_id && session.tokens.some(() => true)
    );

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
                        {/* Render a visual grid with tokens */}
                        {Array.from({ length: 15 }).map((_, row) => (
                            <div key={row} className="grid-row">
                                {Array.from({ length: 20 }).map((_, col) => {
                                    const token = session.tokens.find((t) => t.x === col && t.y === row);
                                    const isFogged = session.isGm ? false : !session.fogState[`${col},${row}`];
                                    const isHighlighted = session.highlightedTiles?.some(
                                        (t) => t.x === col && t.y === row
                                    );

                                    return (
                                        <div
                                            key={col}
                                            className={`grid-cell ${isFogged ? 'fogged' : ''} ${isHighlighted ? 'highlighted' : ''} ${token ? 'has-token' : ''}`}
                                            onClick={() => {
                                                if (session.isGm) {
                                                    // GM clicking reveals fog
                                                    session.revealTile(`${col},${row}`);
                                                }
                                                if (token) {
                                                    session.selectToken(token.id);
                                                }
                                            }}
                                        >
                                            {token && !isFogged && (
                                                <div
                                                    className={`session-token ${token.id === session.selectedTokenId ? 'selected' : ''} ${token.hp <= 0 ? 'downed' : ''}`}
                                                    style={{ '--token-color': token.token_color }}
                                                    title={`${token.label} (HP: ${token.hp}/${token.max_hp})`}
                                                >
                                                    <span className="token-label">{token.label.charAt(0)}</span>
                                                    <div className="token-hp-pip">
                                                        <div
                                                            className="token-hp-fill"
                                                            style={{ width: `${(token.hp / token.max_hp) * 100}%` }}
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
                        <DiceRoller onRoll={(result) => session.sendLog('dice', result.narrative, result)} />
                    )}
                </div>

                {/* Action Bar (always visible at bottom) */}
                <ActionBar session={session} myToken={myToken} />
            </div>
        </div>
    );
}
