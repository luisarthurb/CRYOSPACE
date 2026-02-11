import React, { useState } from 'react';
import { parseAction, resolveAction } from '../../engine/actionParser';

export default function ActionBar({ session, myToken }) {
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || processing) return;

        setProcessing(true);
        try {
            const action = parseAction(input.trim(), myToken, session.tokens);
            const result = resolveAction(action);

            // Send to session log
            await session.sendLog(
                result.type === 'combat' ? 'combat' : result.type === 'dice' ? 'dice' : 'action',
                result.narrative,
                result.rolls?.length > 0 ? result.rolls : null,
                { actionType: action?.type }
            );

            // Apply damage if hit
            if (result.damage && result.targetId) {
                await session.updateTokenHp(result.targetId, result.newTargetHp);
            }

            // Apply effects
            if (result.effects) {
                for (const effect of result.effects) {
                    if (effect.type === 'condition') {
                        await session.addTokenCondition(effect.target, effect.condition);
                    }
                }
            }

            setInput('');
        } catch (err) {
            console.error('Action error:', err);
        }
        setProcessing(false);
    };

    const quickActions = [
        { label: '⚔️ Attack', action: 'I attack' },
        { label: '🛡️ Defend', action: 'I defend' },
        { label: '🏃 Dash', action: 'I dash forward' },
        { label: '🔍 Perception', action: 'I check perception' },
    ];

    return (
        <div className="action-bar">
            <div className="quick-actions">
                {quickActions.map((qa) => (
                    <button
                        key={qa.label}
                        className="quick-action-btn"
                        onClick={() => setInput(qa.action)}
                        type="button"
                    >
                        {qa.label}
                    </button>
                ))}
            </div>
            <form className="action-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder='What do you do? (e.g. "I attack the goblin" or "/roll 2d6+3")'
                    className="action-input"
                    disabled={processing}
                />
                <button type="submit" className="action-submit" disabled={processing || !input.trim()}>
                    {processing ? '⏳' : '⚡'}
                </button>
            </form>
        </div>
    );
}
