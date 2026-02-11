import React, { useState } from 'react';

const ENTITY_FIELDS = {
    npcs: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'role', label: 'Role', type: 'select', options: ['neutral', 'ally', 'enemy', 'merchant', 'quest-giver', 'boss'] },
        { key: 'alignment', label: 'Alignment', type: 'select', options: ['lawful-good', 'neutral-good', 'chaotic-good', 'lawful-neutral', 'neutral', 'chaotic-neutral', 'lawful-evil', 'neutral-evil', 'chaotic-evil'] },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'notes', label: 'GM Notes', type: 'textarea' },
    ],
    bestiary: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'type', label: 'Type', type: 'select', options: ['monster', 'boss', 'minion', 'beast', 'undead', 'demon', 'dragon', 'elemental'] },
        { key: 'hp', label: 'HP', type: 'number', default: 10 },
        { key: 'xp_reward', label: 'XP Reward', type: 'number', default: 50 },
        { key: 'challenge_rating', label: 'Challenge Rating', type: 'number', default: 1, step: 0.5 },
        { key: 'description', label: 'Description', type: 'textarea' },
    ],
    items: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'type', label: 'Type', type: 'select', options: ['weapon', 'armor', 'consumable', 'quest', 'misc'] },
        { key: 'rarity', label: 'Rarity', type: 'select', options: ['common', 'uncommon', 'rare', 'epic', 'legendary'] },
        { key: 'value', label: 'Value (gold)', type: 'number', default: 0 },
        { key: 'description', label: 'Description', type: 'textarea' },
    ],
    quests: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'status', label: 'Status', type: 'select', options: ['available', 'active', 'completed', 'failed'] },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'rewards', label: 'Rewards', type: 'text' },
    ],
    arcs: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'status', label: 'Status', type: 'select', options: ['planned', 'active', 'completed'] },
        { key: 'description', label: 'Description', type: 'textarea' },
    ],
};

const ENTITY_LABELS = {
    npcs: 'NPC',
    bestiary: 'Creature',
    items: 'Item',
    quests: 'Quest',
    arcs: 'Story Arc',
};

export default function EntityEditor({ entityType, entity, onSave, onCancel }) {
    const fields = ENTITY_FIELDS[entityType] || [];
    const label = ENTITY_LABELS[entityType] || 'Entity';
    const isEditing = !!entity?.id;

    const [form, setForm] = useState(() => {
        if (entity) return { ...entity };
        const defaults = {};
        fields.forEach((f) => {
            defaults[f.key] = f.default ?? '';
        });
        return defaults;
    });
    const [saving, setSaving] = useState(false);

    const updateField = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(form);
        } catch (err) {
            alert(err.message);
        }
        setSaving(false);
    };

    const nameField = fields.find((f) => f.required);
    const isValid = nameField ? !!form[nameField.key]?.toString().trim() : true;

    return (
        <div className="wizard-overlay" onClick={onCancel}>
            <div className="modal-container entity-modal" onClick={(e) => e.stopPropagation()}>
                <h2>{isEditing ? `Edit ${label}` : `New ${label}`}</h2>
                <form onSubmit={handleSubmit}>
                    {fields.map((field) => (
                        <div key={field.key} className="form-field">
                            <label>
                                {field.label}
                                {field.required && <span className="required">*</span>}
                            </label>
                            {field.type === 'textarea' ? (
                                <textarea
                                    value={form[field.key] || ''}
                                    onChange={(e) => updateField(field.key, e.target.value)}
                                    rows={3}
                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                />
                            ) : field.type === 'select' ? (
                                <select
                                    value={form[field.key] || field.options[0]}
                                    onChange={(e) => updateField(field.key, e.target.value)}
                                >
                                    {field.options.map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            ) : field.type === 'number' ? (
                                <input
                                    type="number"
                                    value={form[field.key] || ''}
                                    onChange={(e) => updateField(field.key, parseFloat(e.target.value) || 0)}
                                    step={field.step || 1}
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={form[field.key] || ''}
                                    onChange={(e) => updateField(field.key, e.target.value)}
                                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                                    autoFocus={field.required}
                                />
                            )}
                        </div>
                    ))}
                    <div className="modal-actions">
                        <button type="button" className="wizard-btn secondary" onClick={onCancel}>Cancel</button>
                        <button type="submit" className="wizard-btn primary" disabled={saving || !isValid}>
                            {saving ? 'Saving...' : (isEditing ? 'Save Changes' : `Create ${label}`)}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
