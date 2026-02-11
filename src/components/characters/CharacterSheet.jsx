import React from 'react';

const RACE_EMOJIS = {
    Human: '🧑', Elf: '🧝', Dwarf: '⛏️', Orc: '👹', Halfling: '🍀',
    Tiefling: '😈', Dragonborn: '🐉', Gnome: '🔧',
};

const CLASS_EMOJIS = {
    Warrior: '⚔️', Mage: '🔮', Rogue: '🗡️', Cleric: '✝️', Ranger: '🏹',
    Bard: '🎵', Paladin: '🛡️', Warlock: '👁️', Monk: '👊', Druid: '🌿',
};

export default function CharacterSheet({ character, campaignState, onClose }) {
    if (!character) return null;

    const state = campaignState || {
        hp: 20, max_hp: 20, xp: 0, level: 1,
        skills: [], inventory: [], equipment: {}, conditions: [],
    };

    const hpPercent = (state.hp / state.max_hp) * 100;
    const hpColor = hpPercent > 60 ? '#4caf50' : hpPercent > 30 ? '#ff9800' : '#f44336';

    return (
        <div className="sheet-overlay" onClick={onClose}>
            <div className="sheet-container" onClick={(e) => e.stopPropagation()}>
                <button className="sheet-close" onClick={onClose}>✕</button>

                <div className="sheet-header">
                    <div className="sheet-portrait">
                        {character.portrait_url ? (
                            <img src={character.portrait_url} alt={character.name} />
                        ) : (
                            <span className="portrait-fallback">
                                {RACE_EMOJIS[character.race] || '🧑'} {CLASS_EMOJIS[character.class] || '⚔️'}
                            </span>
                        )}
                    </div>
                    <div className="sheet-identity">
                        <h2 className="sheet-name">{character.name}</h2>
                        <p className="sheet-class">{character.race} {character.class}</p>
                        <div className="sheet-level">Level {state.level}</div>
                    </div>
                </div>

                <div className="sheet-stats">
                    <div className="stat-block hp-block">
                        <div className="stat-label">HP</div>
                        <div className="hp-bar-bg">
                            <div className="hp-bar-fill" style={{ width: `${hpPercent}%`, background: hpColor }} />
                        </div>
                        <div className="stat-value">{state.hp} / {state.max_hp}</div>
                    </div>
                    <div className="stat-block">
                        <div className="stat-label">XP</div>
                        <div className="stat-value">{state.xp}</div>
                    </div>
                    <div className="stat-block">
                        <div className="stat-label">Level</div>
                        <div className="stat-value">{state.level}</div>
                    </div>
                </div>

                {character.background && (
                    <div className="sheet-section">
                        <h3>📜 Background</h3>
                        <p>{character.background}</p>
                    </div>
                )}

                {character.personality && (
                    <div className="sheet-section">
                        <h3>🎭 Personality</h3>
                        <p>{character.personality}</p>
                    </div>
                )}

                {character.dream && (
                    <div className="sheet-section">
                        <h3>💫 Dream</h3>
                        <p>{character.dream}</p>
                    </div>
                )}

                <div className="sheet-section">
                    <h3>🎒 Inventory</h3>
                    {state.inventory && state.inventory.length > 0 ? (
                        <ul className="inventory-list">
                            {state.inventory.map((item, i) => (
                                <li key={i} className="inventory-item">{typeof item === 'string' ? item : item.name}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="empty-text">No items yet</p>
                    )}
                </div>

                <div className="sheet-section">
                    <h3>⚡ Skills</h3>
                    {state.skills && state.skills.length > 0 ? (
                        <div className="skills-list">
                            {state.skills.map((skill, i) => (
                                <span key={i} className="skill-chip">{typeof skill === 'string' ? skill : skill.name}</span>
                            ))}
                        </div>
                    ) : (
                        <p className="empty-text">No skills learned</p>
                    )}
                </div>

                {state.conditions && state.conditions.length > 0 && (
                    <div className="sheet-section">
                        <h3>⚠️ Conditions</h3>
                        <div className="conditions-list">
                            {state.conditions.map((cond, i) => (
                                <span key={i} className="condition-chip">{cond}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
