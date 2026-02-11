import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCharacters } from '../../hooks/useCharacters';
import CharacterWizard from './CharacterWizard';
import CharacterSheet from './CharacterSheet';

const RACE_EMOJIS = {
    Human: '🧑', Elf: '🧝', Dwarf: '⛏️', Orc: '👹', Halfling: '🍀',
    Tiefling: '😈', Dragonborn: '🐉', Gnome: '🔧',
};

const CLASS_EMOJIS = {
    Warrior: '⚔️', Mage: '🔮', Rogue: '🗡️', Cleric: '✝️', Ranger: '🏹',
    Bard: '🎵', Paladin: '🛡️', Warlock: '👁️', Monk: '👊', Druid: '🌿',
};

export default function CharacterList() {
    const { user } = useAuth();
    const { characters, loading, deleteCharacter } = useCharacters(user?.id);
    const [showWizard, setShowWizard] = useState(false);
    const [selectedChar, setSelectedChar] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this character?')) return;
        setDeleting(id);
        try {
            await deleteCharacter(id);
        } catch (err) {
            alert(err.message);
        }
        setDeleting(null);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">⚔️ Your Characters</h1>
                    <p className="page-subtitle">Manage your heroes and adventurers</p>
                </div>
                <button className="action-btn primary-btn" onClick={() => setShowWizard(true)}>
                    ✨ New Character
                </button>
            </div>

            {loading ? (
                <div className="loading-state">
                    <div className="loading-spinner" />
                    <p>Loading characters...</p>
                </div>
            ) : characters.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">🧙</span>
                    <h3>No characters yet</h3>
                    <p>Create your first character to begin your adventure!</p>
                    <button className="action-btn primary-btn" onClick={() => setShowWizard(true)}>
                        ✨ Create Character
                    </button>
                </div>
            ) : (
                <div className="card-grid">
                    {characters.map((char) => (
                        <div key={char.id} className="entity-card character-card" onClick={() => setSelectedChar(char)}>
                            <div className="card-portrait">
                                {char.portrait_url ? (
                                    <img src={char.portrait_url} alt={char.name} />
                                ) : (
                                    <span className="card-portrait-fallback">
                                        {RACE_EMOJIS[char.race] || '🧑'}
                                    </span>
                                )}
                            </div>
                            <div className="card-info">
                                <h3 className="card-name">{char.name}</h3>
                                <p className="card-subtitle">
                                    {RACE_EMOJIS[char.race]} {char.race} · {CLASS_EMOJIS[char.class]} {char.class}
                                </p>
                                {char.dream && <p className="card-dream">💫 {char.dream}</p>}
                            </div>
                            <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                                <button
                                    className="icon-btn danger"
                                    onClick={() => handleDelete(char.id)}
                                    disabled={deleting === char.id}
                                    title="Delete character"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showWizard && (
                <CharacterWizard
                    onComplete={() => setShowWizard(false)}
                    onCancel={() => setShowWizard(false)}
                />
            )}

            {selectedChar && (
                <CharacterSheet
                    character={selectedChar}
                    onClose={() => setSelectedChar(null)}
                />
            )}
        </div>
    );
}
