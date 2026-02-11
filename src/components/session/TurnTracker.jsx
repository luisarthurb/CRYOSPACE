import React from 'react';

export default function TurnTracker({ initiative, currentTurn, roundNumber, tokens, isGm, onAdvanceTurn }) {
    if (!initiative || initiative.length === 0) {
        return (
            <div className="turn-tracker">
                <div className="turn-tracker-empty">No initiative set — combat hasn't started</div>
            </div>
        );
    }

    return (
        <div className="turn-tracker">
            <div className="turn-tracker-header">
                <span className="round-badge">Round {roundNumber}</span>
                {isGm && (
                    <button className="turn-advance-btn" onClick={onAdvanceTurn}>
                        Next Turn →
                    </button>
                )}
            </div>
            <div className="turn-tracker-list">
                {initiative.map((entry, i) => {
                    const token = tokens.find((t) => t.id === entry.tokenId);
                    const isCurrent = i === currentTurn;
                    const isDowned = token && token.hp <= 0;

                    return (
                        <div
                            key={entry.tokenId}
                            className={`turn-entry ${isCurrent ? 'current' : ''} ${isDowned ? 'downed' : ''}`}
                        >
                            <span className="turn-order">{i + 1}</span>
                            <span
                                className="turn-token-dot"
                                style={{ background: token?.token_color || '#7c3aed' }}
                            />
                            <span className="turn-label">{entry.label}</span>
                            <span className="turn-roll">{entry.total}</span>
                            {isDowned && <span className="turn-status">💀</span>}
                            {isCurrent && <span className="turn-indicator">▶</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
