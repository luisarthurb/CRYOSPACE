import React, { useState } from 'react';
import { roll, rollAdvantage, rollDisadvantage, formatRoll, DICE_SET } from '../../engine/diceEngine';

export default function DiceRoller({ onRoll }) {
    const [lastResult, setLastResult] = useState(null);
    const [count, setCount] = useState(1);
    const [modifier, setModifier] = useState(0);
    const [mode, setMode] = useState('normal'); // normal, advantage, disadvantage

    const handleRoll = (sides) => {
        const notation = `${count}d${sides}${modifier >= 0 ? (modifier > 0 ? '+' + modifier : '') : modifier}`;

        let result;
        if (mode === 'advantage') {
            result = rollAdvantage(notation);
        } else if (mode === 'disadvantage') {
            result = rollDisadvantage(notation);
        } else {
            result = roll(notation);
        }

        setLastResult(result);
        onRoll?.(result);
    };

    const handleCustomRoll = (e) => {
        e.preventDefault();
        const notation = e.target.elements.notation.value.trim();
        if (!notation) return;
        const result = roll(notation);
        setLastResult(result);
        onRoll?.(result);
        e.target.reset();
    };

    return (
        <div className="dice-roller">
            {/* Dice grid */}
            <div className="dice-grid">
                {DICE_SET.map((die) => (
                    <button
                        key={die.sides}
                        className="dice-btn"
                        onClick={() => handleRoll(die.sides)}
                    >
                        <span className="dice-emoji">{die.emoji}</span>
                        <span className="dice-label">{die.label}</span>
                    </button>
                ))}
            </div>

            {/* Options */}
            <div className="dice-options">
                <div className="dice-option-group">
                    <label>Count</label>
                    <div className="dice-counter">
                        <button onClick={() => setCount(Math.max(1, count - 1))}>−</button>
                        <span>{count}</span>
                        <button onClick={() => setCount(Math.min(10, count + 1))}>+</button>
                    </div>
                </div>
                <div className="dice-option-group">
                    <label>Modifier</label>
                    <div className="dice-counter">
                        <button onClick={() => setModifier(modifier - 1)}>−</button>
                        <span>{modifier >= 0 ? '+' : ''}{modifier}</span>
                        <button onClick={() => setModifier(modifier + 1)}>+</button>
                    </div>
                </div>
                <div className="dice-option-group">
                    <label>Mode</label>
                    <div className="dice-mode-btns">
                        <button className={mode === 'normal' ? 'active' : ''} onClick={() => setMode('normal')}>Normal</button>
                        <button className={mode === 'advantage' ? 'active' : ''} onClick={() => setMode('advantage')}>Adv</button>
                        <button className={mode === 'disadvantage' ? 'active' : ''} onClick={() => setMode('disadvantage')}>Dis</button>
                    </div>
                </div>
            </div>

            {/* Custom notation */}
            <form className="dice-custom" onSubmit={handleCustomRoll}>
                <input name="notation" placeholder="Custom roll (e.g. 4d6+2)" className="dice-custom-input" />
                <button type="submit" className="dice-custom-btn">Roll</button>
            </form>

            {/* Result */}
            {lastResult && (
                <div className={`dice-result ${lastResult.isCritical ? 'critical' : ''} ${lastResult.isFumble ? 'fumble' : ''}`}>
                    <div className="dice-result-total">{lastResult.total}</div>
                    <div className="dice-result-detail">
                        [{lastResult.rolls?.join(', ')}]
                        {lastResult.modifier ? ` ${lastResult.modifier >= 0 ? '+' : ''}${lastResult.modifier}` : ''}
                    </div>
                    {lastResult.isCritical && <div className="dice-result-badge crit">⭐ NAT 20!</div>}
                    {lastResult.isFumble && <div className="dice-result-badge fumble">💀 NAT 1!</div>}
                    {lastResult.advantage && <div className="dice-result-badge adv">Advantage</div>}
                    {lastResult.disadvantage && <div className="dice-result-badge disadv">Disadvantage</div>}
                </div>
            )}
        </div>
    );
}
