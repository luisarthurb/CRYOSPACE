/**
 * Prompt Parser — converts natural language descriptions into dungeon config
 * 
 * This is a client-side heuristic parser (no AI API needed).
 * It extracts keywords to determine grid size, room count, theme, and features.
 */

const SIZE_MAP = {
    tiny: { width: 20, height: 20 },
    small: { width: 25, height: 25 },
    medium: { width: 35, height: 35 },
    large: { width: 45, height: 45 },
    huge: { width: 55, height: 55 },
    massive: { width: 65, height: 65 },
    enormous: { width: 70, height: 70 },
};

const THEME_KEYWORDS = {
    dungeon: ['dungeon', 'crypt', 'tomb', 'catacomb', 'prison', 'jail', 'dark', 'underground', 'sewer'],
    cave: ['cave', 'cavern', 'crystal', 'mine', 'grotto', 'underground lake', 'tunnel'],
    forest: ['forest', 'woods', 'grove', 'garden', 'swamp', 'marsh', 'jungle', 'outdoor', 'nature', 'tree'],
    tavern: ['tavern', 'inn', 'pub', 'bar', 'house', 'mansion', 'castle', 'palace', 'temple', 'church', 'library', 'building'],
    ice: ['ice', 'frost', 'frozen', 'snow', 'arctic', 'glacier', 'cold', 'winter', 'tundra'],
};

const FEATURE_KEYWORDS = {
    hasWater: ['water', 'lake', 'river', 'fountain', 'pool', 'stream', 'moat', 'flood', 'wet'],
    hasChests: ['treasure', 'chest', 'loot', 'gold', 'riches', 'vault', 'hoard'],
    hasTorches: ['torch', 'light', 'fire', 'candle', 'lantern', 'lamp', 'bright', 'lit'],
    hasLava: ['lava', 'magma', 'volcano', 'molten', 'inferno', 'hell', 'demon', 'fire pit'],
};

/**
 * Parse a natural language prompt into a dungeon generator config
 * @param {string} prompt - User's description of the map
 * @returns {Object} Config object for generateDungeon()
 */
export function parsePrompt(prompt) {
    const lower = prompt.toLowerCase().trim();
    const config = {
        width: 35,
        height: 35,
        roomCount: 5,
        theme: 'dungeon',
        hasWater: false,
        hasChests: true,
        hasTorches: true,
        hasLava: false,
    };

    // --- Extract room count ---
    const roomMatch = lower.match(/(\d+)\s*rooms?/);
    if (roomMatch) {
        config.roomCount = Math.max(2, Math.min(12, parseInt(roomMatch[1])));
    } else if (lower.includes('few') || lower.includes('small')) {
        config.roomCount = 3;
    } else if (lower.includes('many') || lower.includes('lot')) {
        config.roomCount = 8;
    } else if (lower.includes('maze') || lower.includes('labyrinth')) {
        config.roomCount = 10;
    }

    // --- Detect size ---
    for (const [sizeKey, dims] of Object.entries(SIZE_MAP)) {
        if (lower.includes(sizeKey)) {
            config.width = dims.width;
            config.height = dims.height;
            break;
        }
    }

    // Scale grid with room count if no explicit size
    if (!Object.keys(SIZE_MAP).some(k => lower.includes(k))) {
        const scale = Math.max(25, 20 + config.roomCount * 5);
        config.width = Math.min(65, scale);
        config.height = Math.min(65, scale);
    }

    // --- Detect theme ---
    let bestTheme = 'dungeon';
    let bestScore = 0;
    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
        let score = 0;
        for (const kw of keywords) {
            if (lower.includes(kw)) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            bestTheme = theme;
        }
    }
    config.theme = bestTheme;

    // --- Detect features ---
    for (const [feature, keywords] of Object.entries(FEATURE_KEYWORDS)) {
        for (const kw of keywords) {
            if (lower.includes(kw)) {
                config[feature] = true;
                break;
            }
        }
    }

    // Theme-based defaults
    if (config.theme === 'cave') {
        config.hasWater = config.hasWater || true;
    }
    if (config.theme === 'forest') {
        config.hasWater = config.hasWater || (Math.random() > 0.5);
    }

    // Boss room hint
    if (lower.includes('boss') || lower.includes('arena') || lower.includes('final')) {
        config.roomCount = Math.max(config.roomCount, 5);
    }

    return config;
}

/**
 * Quick presets for common map types
 */
export const PRESETS = {
    'Small Dungeon': {
        width: 25, height: 25, roomCount: 3, theme: 'dungeon',
        hasChests: true, hasTorches: true, hasWater: false, hasLava: false,
    },
    'Dark Labyrinth': {
        width: 50, height: 50, roomCount: 9, theme: 'dungeon',
        hasChests: true, hasTorches: true, hasWater: false, hasLava: false,
    },
    'Crystal Cavern': {
        width: 40, height: 40, roomCount: 6, theme: 'cave',
        hasChests: true, hasTorches: true, hasWater: true, hasLava: false,
    },
    'Forest Ruins': {
        width: 35, height: 35, roomCount: 5, theme: 'forest',
        hasChests: true, hasTorches: false, hasWater: true, hasLava: false,
    },
    'Tavern Basement': {
        width: 20, height: 20, roomCount: 3, theme: 'tavern',
        hasChests: true, hasTorches: true, hasWater: false, hasLava: false,
    },
    'Volcanic Lair': {
        width: 45, height: 45, roomCount: 6, theme: 'dungeon',
        hasChests: true, hasTorches: true, hasWater: false, hasLava: true,
    },
    'Frozen Fortress': {
        width: 40, height: 40, roomCount: 5, theme: 'ice',
        hasChests: true, hasTorches: true, hasWater: true, hasLava: false,
    },
};
