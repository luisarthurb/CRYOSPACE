/**
 * CryoSpace Dice Engine
 * Supports d4, d6, d8, d10, d12, d20, d100
 * Multi-dice: "2d6+3", "4d8", "d20+5"
 * Advantage/Disadvantage
 */

// Roll a single die
export function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

// Parse dice notation: "2d6+3" → { count: 2, sides: 6, modifier: 3 }
export function parseDiceNotation(notation) {
    const match = notation.toLowerCase().trim().match(/^(\d*)d(\d+)([+-]\d+)?$/);
    if (!match) return null;

    return {
        count: match[1] ? parseInt(match[1]) : 1,
        sides: parseInt(match[2]),
        modifier: match[3] ? parseInt(match[3]) : 0,
        original: notation,
    };
}

// Roll dice from notation string
export function roll(notation) {
    const parsed = parseDiceNotation(notation);
    if (!parsed) {
        return { error: `Invalid dice notation: ${notation}`, total: 0, rolls: [] };
    }

    const rolls = [];
    for (let i = 0; i < parsed.count; i++) {
        rolls.push(rollDie(parsed.sides));
    }

    const subtotal = rolls.reduce((sum, r) => sum + r, 0);
    const total = subtotal + parsed.modifier;

    return {
        notation: parsed.original,
        count: parsed.count,
        sides: parsed.sides,
        modifier: parsed.modifier,
        rolls,
        subtotal,
        total,
        isCritical: parsed.sides === 20 && parsed.count === 1 && rolls[0] === 20,
        isFumble: parsed.sides === 20 && parsed.count === 1 && rolls[0] === 1,
    };
}

// Roll with advantage (roll twice, take higher)
export function rollAdvantage(notation) {
    const r1 = roll(notation);
    const r2 = roll(notation);
    const chosen = r1.total >= r2.total ? r1 : r2;
    return {
        ...chosen,
        advantage: true,
        otherRoll: r1.total >= r2.total ? r2 : r1,
    };
}

// Roll with disadvantage (roll twice, take lower)
export function rollDisadvantage(notation) {
    const r1 = roll(notation);
    const r2 = roll(notation);
    const chosen = r1.total <= r2.total ? r1 : r2;
    return {
        ...chosen,
        disadvantage: true,
        otherRoll: r1.total <= r2.total ? r2 : r1,
    };
}

// Roll initiative (d20 + DEX modifier)
export function rollInitiative(dexModifier = 0) {
    const result = roll('d20');
    return {
        ...result,
        modifier: dexModifier,
        total: result.total + dexModifier,
        type: 'initiative',
    };
}

// Ability check (d20 + ability modifier vs DC)
export function rollAbilityCheck(abilityModifier, dc) {
    const result = roll('d20');
    const total = result.total + abilityModifier;
    return {
        ...result,
        modifier: abilityModifier,
        total,
        dc,
        success: total >= dc,
        type: 'ability_check',
    };
}

// Attack roll (d20 + attack modifier vs AC)
export function rollAttack(attackModifier, targetAC) {
    const result = roll('d20');
    const total = result.total + attackModifier;
    return {
        ...result,
        modifier: attackModifier,
        total,
        targetAC,
        hit: result.isCritical || (!result.isFumble && total >= targetAC),
        isCritical: result.isCritical,
        isFumble: result.isFumble,
        type: 'attack',
    };
}

// Roll damage
export function rollDamage(notation, isCritical = false) {
    const parsed = parseDiceNotation(notation);
    if (!parsed) return { error: 'Invalid damage notation', total: 0, rolls: [] };

    // Critical hit doubles dice count
    const count = isCritical ? parsed.count * 2 : parsed.count;
    const modNotation = `${count}d${parsed.sides}${parsed.modifier >= 0 ? '+' + parsed.modifier : parsed.modifier}`;
    const result = roll(modNotation.replace('+0', ''));

    return {
        ...result,
        isCritical,
        type: 'damage',
    };
}

// Get ability modifier from score (D&D-style: (score - 10) / 2, rounded down)
export function getAbilityModifier(score) {
    return Math.floor((score - 10) / 2);
}

// Format a roll result as a readable string
export function formatRoll(result) {
    if (result.error) return result.error;

    let str = '';
    if (result.type === 'attack') {
        str = `🎯 Attack: ${result.rolls.join(', ')}`;
        if (result.modifier) str += ` + ${result.modifier}`;
        str += ` = **${result.total}** vs AC ${result.targetAC}`;
        if (result.isCritical) str += ' ⭐ **CRITICAL HIT!**';
        else if (result.isFumble) str += ' 💀 **FUMBLE!**';
        else str += result.hit ? ' ✅ **HIT!**' : ' ❌ **MISS**';
    } else if (result.type === 'damage') {
        str = `💥 Damage: [${result.rolls.join(', ')}]`;
        if (result.modifier) str += ` + ${result.modifier}`;
        str += ` = **${result.total}**`;
        if (result.isCritical) str += ' (Critical!)';
    } else if (result.type === 'ability_check') {
        str = `🎲 Check: ${result.rolls[0]}`;
        if (result.modifier) str += ` + ${result.modifier}`;
        str += ` = **${result.total}** vs DC ${result.dc}`;
        str += result.success ? ' ✅ **SUCCESS**' : ' ❌ **FAIL**';
    } else if (result.type === 'initiative') {
        str = `⚡ Initiative: ${result.rolls[0]}`;
        if (result.modifier) str += ` + ${result.modifier}`;
        str += ` = **${result.total}**`;
    } else {
        str = `🎲 Roll ${result.notation}: [${result.rolls.join(', ')}]`;
        if (result.modifier) str += ` ${result.modifier >= 0 ? '+' : ''}${result.modifier}`;
        str += ` = **${result.total}**`;
        if (result.isCritical) str += ' ⭐ NAT 20!';
        if (result.isFumble) str += ' 💀 NAT 1!';
    }

    if (result.advantage) str += ' (Advantage)';
    if (result.disadvantage) str += ' (Disadvantage)';

    return str;
}

// Standard dice set
export const DICE_SET = [
    { sides: 4, label: 'd4', emoji: '🔷' },
    { sides: 6, label: 'd6', emoji: '🎲' },
    { sides: 8, label: 'd8', emoji: '💎' },
    { sides: 10, label: 'd10', emoji: '🔶' },
    { sides: 12, label: 'd12', emoji: '⬡' },
    { sides: 20, label: 'd20', emoji: '⭐' },
    { sides: 100, label: 'd100', emoji: '💯' },
];
