/**
 * CryoSpace Action Parser
 * Parses natural language player actions into game mechanics
 * "I attack the goblin with my sword" → attack action
 */

import { roll, formatRoll, rollAttack, rollDamage, rollAbilityCheck, getAbilityModifier } from './diceEngine';

// Action type patterns
const ACTION_PATTERNS = [
    // Direct dice rolls
    { pattern: /^\/roll?\s+(.+)/i, type: 'dice_roll' },
    { pattern: /^(\d*d\d+[+-]?\d*)/i, type: 'dice_roll' },

    // Attack patterns
    { pattern: /\b(attack|strike|hit|slash|stab|shoot|swing|smash|punch|kick|bite|claw)\b/i, type: 'attack' },

    // Spell/magic patterns
    { pattern: /\b(cast|spell|magic|fireball|heal|lightning|frost|ice|fire|thunder|arcane)\b/i, type: 'cast_spell' },

    // Movement patterns
    { pattern: /\b(move|walk|run|dash|sneak|stealth|climb|swim|fly|jump|teleport)\b/i, type: 'movement' },

    // Skill check patterns
    { pattern: /\b(check|inspect|investigate|search|perception|insight|persuade|intimidate|deceive|acrobatics|athletics)\b/i, type: 'skill_check' },

    // Defense patterns
    { pattern: /\b(defend|block|dodge|parry|shield|guard|brace)\b/i, type: 'defend' },

    // Interaction patterns
    { pattern: /\b(talk|speak|ask|tell|negotiate|barter|trade|buy|sell|give|open|close|pick|lock|trap|use|drink|eat)\b/i, type: 'interact' },
];

// Target extraction
const TARGET_PATTERN = /(?:the|a|an)?\s*(\w+(?:\s+\w+)?)\s*$/i;
const AT_TARGET = /(?:at|to|on|against|with)\s+(?:the|a|an)?\s*(\w+(?:\s+\w+)?)/i;

// Skill mapping
const SKILL_TO_ABILITY = {
    athletics: 'str',
    acrobatics: 'dex',
    stealth: 'dex',
    sleight: 'dex',
    arcana: 'int',
    history: 'int',
    investigation: 'int',
    nature: 'int',
    religion: 'int',
    insight: 'wis',
    medicine: 'wis',
    perception: 'wis',
    survival: 'wis',
    'animal handling': 'wis',
    deception: 'cha',
    intimidation: 'cha',
    performance: 'cha',
    persuasion: 'cha',
};

// Parse player input into an action
export function parseAction(input, actorToken, allTokens = []) {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Find matching action type
    let actionType = 'generic';
    let match = null;

    for (const pattern of ACTION_PATTERNS) {
        match = trimmed.match(pattern.pattern);
        if (match) {
            actionType = pattern.type;
            break;
        }
    }

    // Extract target
    const targetMatch = trimmed.match(AT_TARGET);
    const targetName = targetMatch ? targetMatch[1].toLowerCase() : null;

    // Find target token
    const targetToken = targetName
        ? allTokens.find((t) => t.label.toLowerCase().includes(targetName) && t.id !== actorToken?.id)
        : null;

    return {
        type: actionType,
        input: trimmed,
        actor: actorToken,
        target: targetToken,
        targetName,
        match,
    };
}

// Resolve the parsed action into a result
export function resolveAction(action) {
    if (!action) return { narrative: 'No action to resolve.', rolls: [] };

    const actor = action.actor || { label: 'Unknown', stats: {}, hp: 20 };

    switch (action.type) {
        case 'dice_roll':
            return resolveDiceRoll(action);
        case 'attack':
            return resolveAttackAction(action, actor);
        case 'cast_spell':
            return resolveSpellAction(action, actor);
        case 'skill_check':
            return resolveSkillAction(action, actor);
        case 'movement':
            return resolveMovement(action, actor);
        case 'defend':
            return resolveDefend(action, actor);
        case 'interact':
            return resolveInteract(action, actor);
        default:
            return resolveGeneric(action, actor);
    }
}

function resolveDiceRoll(action) {
    const notation = action.match?.[1] || 'd20';
    const result = roll(notation);
    return {
        narrative: `${formatRoll(result)}`,
        rolls: [result],
        type: 'dice',
    };
}

function resolveAttackAction(action, actor) {
    const target = action.target;
    if (!target) {
        // No target found — just roll an attack
        const strMod = getAbilityModifier(actor.stats?.str || 10);
        const attackResult = rollAttack(strMod, 10);
        return {
            narrative: `⚔️ **${actor.label}** attacks! ${formatRoll(attackResult)}`,
            rolls: [attackResult],
            type: 'combat',
        };
    }

    const strMod = getAbilityModifier(actor.stats?.str || 10);
    const attackResult = rollAttack(strMod, target.ac || 10);

    const result = {
        narrative: `⚔️ **${actor.label}** attacks **${target.label}**! ${formatRoll(attackResult)}`,
        rolls: [attackResult],
        type: 'combat',
        targetId: target.id,
    };

    if (attackResult.hit) {
        const dmg = rollDamage('1d6', attackResult.isCritical);
        result.rolls.push(dmg);
        result.narrative += ` ${formatRoll(dmg)}`;
        result.damage = dmg.total;
        result.newTargetHp = Math.max(0, target.hp - dmg.total);

        if (result.newTargetHp <= 0) {
            result.narrative += ` 💀 **${target.label}** is down!`;
        }
    }

    return result;
}

function resolveSpellAction(action, actor) {
    const intMod = getAbilityModifier(actor.stats?.int || 10);
    const target = action.target;

    if (target) {
        const spellAttack = rollAttack(intMod, target.ac || 10);
        const result = {
            narrative: `✨ **${actor.label}** casts a spell at **${target.label}**! ${formatRoll(spellAttack)}`,
            rolls: [spellAttack],
            type: 'combat',
            targetId: target.id,
        };

        if (spellAttack.hit) {
            const dmg = rollDamage('1d8', spellAttack.isCritical);
            result.rolls.push(dmg);
            result.narrative += ` ${formatRoll(dmg)}`;
            result.damage = dmg.total;
            result.newTargetHp = Math.max(0, target.hp - dmg.total);
        }

        return result;
    }

    const spellRoll = rollAbilityCheck(intMod, 12);
    return {
        narrative: `✨ **${actor.label}** channels arcane energy — ${formatRoll(spellRoll)}`,
        rolls: [spellRoll],
        type: 'action',
    };
}

function resolveSkillAction(action, actor) {
    // Try to find the skill in the input
    let ability = 'wis'; // default
    let skillName = 'Perception';

    for (const [skill, abl] of Object.entries(SKILL_TO_ABILITY)) {
        if (action.input.toLowerCase().includes(skill)) {
            ability = abl;
            skillName = skill.charAt(0).toUpperCase() + skill.slice(1);
            break;
        }
    }

    const mod = getAbilityModifier(actor.stats?.[ability] || 10);
    const result = rollAbilityCheck(mod, 12);

    return {
        narrative: `🔍 **${actor.label}** makes a ${skillName} check — ${formatRoll(result)}`,
        rolls: [result],
        type: 'action',
    };
}

function resolveMovement(action, actor) {
    return {
        narrative: `🏃 **${actor.label}** moves across the battlefield.`,
        rolls: [],
        type: 'movement',
        requiresGridMove: true,
    };
}

function resolveDefend(action, actor) {
    return {
        narrative: `🛡️ **${actor.label}** takes a defensive stance. (+2 AC until next turn)`,
        rolls: [],
        type: 'action',
        effects: [{ type: 'condition', condition: 'shielded', target: actor.id }],
    };
}

function resolveInteract(action, actor) {
    const wisMod = getAbilityModifier(actor.stats?.wis || 10);
    const result = rollAbilityCheck(wisMod, 10);

    return {
        narrative: `🤝 **${actor.label}** interacts — ${formatRoll(result)}`,
        rolls: [result],
        type: 'action',
    };
}

function resolveGeneric(action, actor) {
    return {
        narrative: `📝 **${actor.label}**: *"${action.input}"*`,
        rolls: [],
        type: 'narrative',
    };
}
