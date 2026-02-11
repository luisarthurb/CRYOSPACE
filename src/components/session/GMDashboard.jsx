import React, { useState, useCallback } from 'react';
import { rollAllInitiative, CONDITIONS } from '../../engine/combatEngine';

export default function GMDashboard({ session }) {
    const [spawnForm, setSpawnForm] = useState({ label: '', hp: 20, ac: 10, x: 5, y: 5 });
    const [showSpawn, setShowSpawn] = useState(false);

    // Roll initiative for all tokens
    const handleRollInitiative = async () => {
        const results = rollAllInitiative(session.tokens);
        await session.updateInitiative(results, 0, 1);

        const narrative = results.map((r, i) =>
            `${i + 1}. **${r.label}** — rolled ${r.total}`
        ).join('\n');
        await session.sendLog('system', `⚡ Initiative rolled!\n${narrative}`);
    };

    // Spawn NPC token
    const handleSpawnToken = async () => {
        if (!spawnForm.label.trim()) return;
        await session.spawnToken({
            label: spawnForm.label.trim(),
            hp: spawnForm.hp,
            max_hp: spawnForm.hp,
            ac: spawnForm.ac,
            x: spawnForm.x,
            y: spawnForm.y,
            is_npc: true,
            is_visible: true,
            token_color: '#ef4444',
            stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        });
        await session.sendLog('system', `🎭 **${spawnForm.label}** has appeared on the battlefield!`);
        setSpawnForm({ label: '', hp: 20, ac: 10, x: 5, y: 5 });
        setShowSpawn(false);
    };

    // Selected token info
    const selectedToken = session.getSelectedToken?.() ||
        session.tokens.find((t) => t.id === session.selectedTokenId);

    // Reveal all fog
    const handleRevealAll = async () => {
        const fog = {};
        for (let y = 0; y < 15; y++) {
            for (let x = 0; x < 20; x++) {
                fog[`${x},${y}`] = true;
            }
        }
        await session.updateFog(fog);
        await session.sendLog('system', '🌅 The fog lifts, revealing the entire map!');
    };

    // Hide all fog
    const handleHideAll = async () => {
        await session.updateFog({});
        await session.sendLog('system', '🌫️ Darkness descends upon the map...');
    };

    return (
        <div className="gm-dashboard">
            {/* Quick Actions */}
            <div className="gm-section">
                <h4>⚡ Quick Actions</h4>
                <div className="gm-action-grid">
                    <button className="gm-action-btn" onClick={handleRollInitiative}>
                        🎯 Roll Initiative
                    </button>
                    <button className="gm-action-btn" onClick={() => setShowSpawn(true)}>
                        🎭 Spawn NPC
                    </button>
                    <button className="gm-action-btn" onClick={handleRevealAll}>
                        🌅 Reveal Map
                    </button>
                    <button className="gm-action-btn" onClick={handleHideAll}>
                        🌫️ Hide Map
                    </button>
                    <button className="gm-action-btn" onClick={() => session.updateSessionStatus('paused')}>
                        ⏸️ Pause
                    </button>
                    <button className="gm-action-btn danger" onClick={() => session.updateSessionStatus('ended')}>
                        🏁 End Session
                    </button>
                </div>
            </div>

            {/* Spawn NPC Form */}
            {showSpawn && (
                <div className="gm-section spawn-form">
                    <h4>🎭 Spawn NPC</h4>
                    <div className="form-field">
                        <label>Name</label>
                        <input value={spawnForm.label} onChange={(e) => setSpawnForm({ ...spawnForm, label: e.target.value })} placeholder="Goblin Warrior" />
                    </div>
                    <div className="spawn-stats-row">
                        <div className="form-field">
                            <label>HP</label>
                            <input type="number" value={spawnForm.hp} onChange={(e) => setSpawnForm({ ...spawnForm, hp: +e.target.value })} />
                        </div>
                        <div className="form-field">
                            <label>AC</label>
                            <input type="number" value={spawnForm.ac} onChange={(e) => setSpawnForm({ ...spawnForm, ac: +e.target.value })} />
                        </div>
                        <div className="form-field">
                            <label>X</label>
                            <input type="number" value={spawnForm.x} onChange={(e) => setSpawnForm({ ...spawnForm, x: +e.target.value })} />
                        </div>
                        <div className="form-field">
                            <label>Y</label>
                            <input type="number" value={spawnForm.y} onChange={(e) => setSpawnForm({ ...spawnForm, y: +e.target.value })} />
                        </div>
                    </div>
                    <div className="spawn-actions">
                        <button className="wizard-btn secondary" onClick={() => setShowSpawn(false)}>Cancel</button>
                        <button className="wizard-btn primary" onClick={handleSpawnToken}>Spawn</button>
                    </div>
                </div>
            )}

            {/* Selected Token Controls */}
            {selectedToken && (
                <div className="gm-section">
                    <h4>🎯 {selectedToken.label}</h4>
                    <div className="token-detail-card">
                        <div className="token-detail-stats">
                            <div className="stat-row">
                                <span>HP</span>
                                <div className="hp-control">
                                    <button onClick={() => session.updateTokenHp(selectedToken.id, Math.max(0, selectedToken.hp - 1))}>−</button>
                                    <span className="hp-value">{selectedToken.hp}/{selectedToken.max_hp}</span>
                                    <button onClick={() => session.updateTokenHp(selectedToken.id, Math.min(selectedToken.max_hp, selectedToken.hp + 1))}>+</button>
                                </div>
                            </div>
                            <div className="stat-row">
                                <span>AC</span>
                                <span>{selectedToken.ac}</span>
                            </div>
                            <div className="stat-row">
                                <span>Pos</span>
                                <span>({selectedToken.x}, {selectedToken.y})</span>
                            </div>
                        </div>

                        {/* Conditions */}
                        <div className="token-conditions-panel">
                            <span className="conditions-label">Conditions:</span>
                            <div className="condition-tags">
                                {Object.entries(CONDITIONS).map(([key, cond]) => {
                                    const active = selectedToken.conditions?.includes(key);
                                    return (
                                        <button
                                            key={key}
                                            className={`condition-tag ${active ? 'active' : ''}`}
                                            onClick={() => {
                                                if (active) {
                                                    session.removeTokenCondition(selectedToken.id, key);
                                                } else {
                                                    session.addTokenCondition(selectedToken.id, key);
                                                }
                                            }}
                                            title={cond.effect}
                                        >
                                            {cond.icon} {cond.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Remove token */}
                        {selectedToken.is_npc && (
                            <button
                                className="gm-action-btn danger"
                                onClick={() => session.removeTokenFromSession(selectedToken.id)}
                            >
                                🗑️ Remove Token
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Token List */}
            <div className="gm-section">
                <h4>📋 All Tokens ({session.tokens.length})</h4>
                <div className="gm-token-list">
                    {session.tokens.map((t) => (
                        <div
                            key={t.id}
                            className={`gm-token-item ${t.id === session.selectedTokenId ? 'selected' : ''}`}
                            onClick={() => session.selectToken(t.id)}
                        >
                            <span className="gm-token-dot" style={{ background: t.token_color }} />
                            <span className="gm-token-name">{t.label}</span>
                            <span className="gm-token-hp">{t.hp}/{t.max_hp}</span>
                            {t.is_npc && <span className="gm-token-badge">NPC</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
