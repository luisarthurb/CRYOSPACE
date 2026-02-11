import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useCharacters } from '../../hooks/useCharacters';

const RACES = ['Human', 'Elf', 'Dwarf', 'Orc', 'Halfling', 'Tiefling', 'Dragonborn', 'Gnome'];
const CLASSES = ['Warrior', 'Mage', 'Rogue', 'Cleric', 'Ranger', 'Bard', 'Paladin', 'Warlock', 'Monk', 'Druid'];

const RACE_EMOJIS = {
    Human: '🧑', Elf: '🧝', Dwarf: '⛏️', Orc: '👹', Halfling: '🍀',
    Tiefling: '😈', Dragonborn: '🐉', Gnome: '🔧',
};

const CLASS_EMOJIS = {
    Warrior: '⚔️', Mage: '🔮', Rogue: '🗡️', Cleric: '✝️', Ranger: '🏹',
    Bard: '🎵', Paladin: '🛡️', Warlock: '👁️', Monk: '👊', Druid: '🌿',
};

const STEPS = ['Race & Name', 'Class', 'Identity', 'Review'];

export default function CharacterWizard({ onComplete, onCancel }) {
    const { user } = useAuth();
    const { createCharacter } = useCharacters(user?.id);
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        race: 'Human',
        class: 'Warrior',
        background: '',
        personality: '',
        dream: '',
    });

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const canNext = () => {
        if (step === 0) return form.name.trim().length >= 2;
        if (step === 1) return !!form.class;
        return true;
    };

    const handleCreate = async () => {
        setSaving(true);
        setError('');
        try {
            const character = await createCharacter({
                name: form.name.trim(),
                race: form.race,
                class: form.class,
                background: form.background.trim(),
                personality: form.personality.trim(),
                dream: form.dream.trim(),
            });
            onComplete?.(character);
        } catch (err) {
            if (err?.name === 'AbortError') return; // Ignore React StrictMode aborts
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="wizard-overlay">
            <div className="wizard-container">
                <div className="wizard-header">
                    <h2>Create Your Character</h2>
                    <div className="wizard-steps">
                        {STEPS.map((s, i) => (
                            <div key={s} className={`wizard-step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}>
                                <span className="step-num">{i < step ? '✓' : i + 1}</span>
                                <span className="step-label">{s}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="wizard-body">
                    {step === 0 && (
                        <div className="wizard-section">
                            <div className="form-field">
                                <label>Character Name</label>
                                <input
                                    type="text"
                                    placeholder="What shall they call you?"
                                    value={form.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="form-field">
                                <label>Race</label>
                                <div className="option-grid">
                                    {RACES.map((race) => (
                                        <button
                                            key={race}
                                            className={`option-card ${form.race === race ? 'selected' : ''}`}
                                            onClick={() => updateField('race', race)}
                                            type="button"
                                        >
                                            <span className="option-icon">{RACE_EMOJIS[race]}</span>
                                            <span className="option-label">{race}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="wizard-section">
                            <div className="form-field">
                                <label>Class</label>
                                <div className="option-grid">
                                    {CLASSES.map((cls) => (
                                        <button
                                            key={cls}
                                            className={`option-card ${form.class === cls ? 'selected' : ''}`}
                                            onClick={() => updateField('class', cls)}
                                            type="button"
                                        >
                                            <span className="option-icon">{CLASS_EMOJIS[cls]}</span>
                                            <span className="option-label">{cls}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="wizard-section">
                            <div className="form-field">
                                <label>Background <span className="opt">(optional)</span></label>
                                <textarea
                                    placeholder="Where did you come from? A noble house, a pirate ship, a forgotten village..."
                                    value={form.background}
                                    onChange={(e) => updateField('background', e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="form-field">
                                <label>Personality <span className="opt">(optional)</span></label>
                                <textarea
                                    placeholder="Brave and reckless? Quiet and calculating? Charismatic but unreliable?"
                                    value={form.personality}
                                    onChange={(e) => updateField('personality', e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="form-field">
                                <label>Dream <span className="opt">(optional)</span></label>
                                <textarea
                                    placeholder="What drives your character? Revenge? Glory? Protecting the innocent?"
                                    value={form.dream}
                                    onChange={(e) => updateField('dream', e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="wizard-section review-section">
                            <div className="review-card">
                                <div className="review-portrait">
                                    <span className="portrait-placeholder">
                                        {RACE_EMOJIS[form.race]} {CLASS_EMOJIS[form.class]}
                                    </span>
                                </div>
                                <h3 className="review-name">{form.name}</h3>
                                <p className="review-subtitle">{form.race} {form.class}</p>
                                {form.background && (
                                    <div className="review-field">
                                        <span className="review-label">Background</span>
                                        <p>{form.background}</p>
                                    </div>
                                )}
                                {form.personality && (
                                    <div className="review-field">
                                        <span className="review-label">Personality</span>
                                        <p>{form.personality}</p>
                                    </div>
                                )}
                                {form.dream && (
                                    <div className="review-field">
                                        <span className="review-label">Dream</span>
                                        <p>{form.dream}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {error && <div className="auth-error">{error}</div>}

                <div className="wizard-footer">
                    <button className="wizard-btn secondary" onClick={step === 0 ? onCancel : () => setStep(step - 1)}>
                        {step === 0 ? 'Cancel' : '← Back'}
                    </button>
                    {step < 3 ? (
                        <button
                            className="wizard-btn primary"
                            onClick={() => setStep(step + 1)}
                            disabled={!canNext()}
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            className="wizard-btn primary create-btn"
                            onClick={handleCreate}
                            disabled={saving}
                        >
                            {saving ? 'Creating...' : '✨ Create Character'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
