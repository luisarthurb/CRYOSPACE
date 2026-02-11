import React, { useState, useCallback } from 'react';
import { parseAction, resolveAction } from '../../engine/actionParser';

const QUICK_ACTIONS = [
    { label: '⚔️ Attack', action: 'I attack' },
    { label: '🛡️ Defend', action: 'I defend' },
    { label: '🏃 Dash', action: 'I dash forward' },
    { label: '🔍 Perception', action: 'I check perception' },
];

export default function ActionBar({ session, myToken }) {
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!input.trim() || processing) return;

        setProcessing(true);
        setError('');
        try {
            const action = parseAction(input.trim(), myToken, session.tokens);
            const result = resolveAction(action);

            if (!result || !result.narrative) {
                setError('Could not resolve that action.');
                setProcessing(false);
                return;
            }

            // Determine log type
            const logType = result.type === 'combat' ? 'combat'
                : result.type === 'dice' ? 'dice'
                    : result.type === 'narrative' ? 'narrative'
                        : 'action';

            // Send to session log
            await session.sendLog(
                logType,
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
                    if (effect.type === 'condition' && effect.target) {
                        await session.addTokenCondition(effect.target, effect.condition);
                    }
                }
            }

            setInput('');
        } catch (err) {
            console.error('Action error:', err);
            setError('Something went wrong processing that action.');
        }
        setProcessing(false);
    }, [input, processing, myToken, session]);

    return (
        <div className="action-bar">
            <div className="quick-actions">
                {QUICK_ACTIONS.map((qa) => (
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
            {error && <div className="action-error">{error}</div>}
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
