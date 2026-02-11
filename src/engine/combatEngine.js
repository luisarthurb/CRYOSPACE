/**
 * CryoSpace Combat Engine
 * Handles initiative, attacks, damage, conditions, death saves, movement
 */

import { rollInitiative, rollAttack, rollDamage, rollAbilityCheck, getAbilityModifier, formatRoll } from './diceEngine';

// ========================
// INITIATIVE
// ========================

// Roll initiative for all tokens, return sorted order
export function rollAllInitiative(tokens) {
    const results = tokens.map((token) => {
        const dexMod = getAbilityModifier(token.stats?.dex || 10);
        const result = rollInitiative(dexMod);
        return {
            tokenId: token.id,
            label: token.label,
            roll: result,
            total: result.total,
            isNpc: token.is_npc,
        };
    });

    // Sort descending by total, ties broken by DEX
    results.sort((a, b) => b.total - a.total);
    return results;
}

// ========================
// ATTACK RESOLUTION
// ========================

export function resolveAttack(attacker, target, weaponDamage = '1d6', attackBonus = 0) {
    // Calculate attack modifier (STR for melee, DEX for ranged — simplified to STR for now)
    const strMod = getAbilityModifier(attacker.stats?.str || 10);
    const totalAttackMod = strMod + attackBonus;

    // Roll to hit
    const attackResult = rollAttack(totalAttackMod, target.ac || 10);

    const outcome = {
        attacker: attacker.label,
        target: target.label,
        attackRoll: attackResult,
        hit: attackResult.hit,
        isCritical: attackResult.isCritical,
        isFumble: attackResult.isFumble,
        damage: null,
        narrative: '',
    };

    if (attackResult.hit) {
        // Roll damage
        const damageResult = rollDamage(weaponDamage, attackResult.isCritical);
        outcome.damage = damageResult;

        // Calculate new HP
        const newHp = Math.max(0, target.hp - damageResult.total);
        outcome.newTargetHp = newHp;
        outcome.targetDowned = newHp <= 0;

        // Generate narrative
        if (attackResult.isCritical) {
            outcome.narrative = `⚔️ **${attacker.label}** strikes **${target.label}** with devastating precision! `
                + `${formatRoll(attackResult)} ${formatRoll(damageResult)}`;
        } else {
            outcome.narrative = `⚔️ **${attacker.label}** attacks **${target.label}**. `
                + `${formatRoll(attackResult)} ${formatRoll(damageResult)}`;
        }

        if (outcome.targetDowned) {
            outcome.narrative += ` 💀 **${target.label}** is down!`;
        }
    } else {
        if (attackResult.isFumble) {
            outcome.narrative = `⚔️ **${attacker.label}** swings wildly at **${target.label}** — ${formatRoll(attackResult)}`;
        } else {
            outcome.narrative = `⚔️ **${attacker.label}** attacks **${target.label}** — ${formatRoll(attackResult)}`;
        }
    }

    return outcome;
}

// ========================
// SKILL CHECKS
// ========================

export function resolveSkillCheck(token, ability, dc, skillName = '') {
    const abilityScore = token.stats?.[ability] || 10;
    const modifier = getAbilityModifier(abilityScore);
    const result = rollAbilityCheck(modifier, dc);

    const abilityNames = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
    const abilityName = abilityNames[ability] || ability;

    const narrative = `🎲 **${token.label}** attempts a ${skillName || abilityName} check — ${formatRoll(result)}`;

    return { ...result, narrative, ability, skillName };
}

// ========================
// CONDITIONS
// ========================

export const CONDITIONS = {
    stunned: { label: 'Stunned', icon: '💫', effect: 'Cannot act on their turn' },
    poisoned: { label: 'Poisoned', icon: '☠️', effect: 'Disadvantage on attacks and ability checks' },
    burning: { label: 'Burning', icon: '🔥', effect: 'Takes 1d6 fire damage at start of turn' },
    frozen: { label: 'Frozen', icon: '🧊', effect: 'Speed reduced to 0' },
    blinded: { label: 'Blinded', icon: '🙈', effect: 'Disadvantage on attacks, advantage for attackers' },
    frightened: { label: 'Frightened', icon: '😱', effect: 'Disadvantage on ability checks, cannot move closer' },
    prone: { label: 'Prone', icon: '🔻', effect: 'Disadvantage on attacks, melee attacks against have advantage' },
    invisible: { label: 'Invisible', icon: '👻', effect: 'Advantage on attacks, disadvantage for attackers' },
    blessed: { label: 'Blessed', icon: '✨', effect: '+1d4 to attacks and saves' },
    shielded: { label: 'Shielded', icon: '🛡️', effect: '+2 AC until next turn' },
};

export function applyCondition(token, conditionKey) {
    const conditions = [...(token.conditions || [])];
    if (!conditions.includes(conditionKey)) {
        conditions.push(conditionKey);
    }
    return { ...token, conditions };
}

export function removeCondition(token, conditionKey) {
    return {
        ...token,
        conditions: (token.conditions || []).filter((c) => c !== conditionKey),
    };
}

// Process start-of-turn condition effects
export function processConditionEffects(token) {
    const effects = [];

    if (token.conditions?.includes('burning')) {
        const burnDmg = rollDamage('1d6');
        const newHp = Math.max(0, token.hp - burnDmg.total);
        effects.push({
            type: 'damage',
            amount: burnDmg.total,
            narrative: `🔥 **${token.label}** takes **${burnDmg.total}** fire damage from burning!`,
            newHp,
        });
    }

    if (token.conditions?.includes('poisoned')) {
        effects.push({
            type: 'debuff',
            narrative: `☠️ **${token.label}** is poisoned — disadvantage on attacks and ability checks.`,
        });
    }

    if (token.conditions?.includes('stunned')) {
        effects.push({
            type: 'skip',
            narrative: `💫 **${token.label}** is stunned and cannot act!`,
        });
    }

    return effects;
}

// ========================
// DEATH SAVES
// ========================

export function rollDeathSave(token) {
    const result = rollAbilityCheck(0, 10);
    const saves = token.deathSaves || { successes: 0, failures: 0 };

    let narrative = '';

    if (result.rolls[0] === 20) {
        // Nat 20 = regain 1 HP
        narrative = `💚 **${token.label}** rolls a NAT 20 on their death save! They regain 1 HP and are conscious!`;
        return { ...result, stabilized: true, revived: true, narrative, newHp: 1, saves };
    }

    if (result.rolls[0] === 1) {
        // Nat 1 = 2 failures
        saves.failures += 2;
        narrative = `💀 **${token.label}** rolls a NAT 1 — two death save failures! (${saves.failures}/3)`;
    } else if (result.success) {
        saves.successes += 1;
        narrative = `🟢 **${token.label}** succeeds a death save (${saves.successes}/3 successes)`;
    } else {
        saves.failures += 1;
        narrative = `🔴 **${token.label}** fails a death save (${saves.failures}/3 failures)`;
    }

    const dead = saves.failures >= 3;
    const stabilized = saves.successes >= 3;

    if (dead) narrative += ` 💀 **${token.label}** has died!`;
    if (stabilized) narrative += ` 💚 **${token.label}** has stabilized!`;

    return { ...result, saves, dead, stabilized, revived: false, narrative };
}

// ========================
// MOVEMENT
// ========================

// Check if movement is valid (Manhattan distance ≤ speed)
export function isValidMove(fromX, fromY, toX, toY, speed) {
    const distance = Math.abs(toX - fromX) + Math.abs(toY - fromY);
    return distance <= speed;
}

// Get movement distance
export function getDistance(fromX, fromY, toX, toY) {
    return Math.abs(toX - fromX) + Math.abs(toY - fromY);
}

// ========================
// XP & LEVELING
// ========================

const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

export function getLevel(xp) {
    for (let i = XP_TABLE.length - 1; i >= 0; i--) {
        if (xp >= XP_TABLE[i]) return i + 1;
    }
    return 1;
}

export function getXpForNextLevel(currentXp) {
    const level = getLevel(currentXp);
    if (level >= XP_TABLE.length) return null;
    return XP_TABLE[level];
}

export function getXpProgress(currentXp) {
    const level = getLevel(currentXp);
    const currentThreshold = XP_TABLE[level - 1] || 0;
    const nextThreshold = XP_TABLE[level] || currentThreshold;
    const progress = nextThreshold > currentThreshold
        ? (currentXp - currentThreshold) / (nextThreshold - currentThreshold)
        : 1;
    return Math.min(1, Math.max(0, progress));
}
