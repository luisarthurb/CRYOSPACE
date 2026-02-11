import { create } from 'zustand';
import { generateDungeon } from '../engine/dungeonGenerator';
import { TILE_TYPES } from '../engine/tileConfig';

const initialConfig = {
    width: 35,
    height: 35,
    roomCount: 5,
    theme: 'dungeon',
    hasChests: true,
    hasTorches: true,
    hasWater: false,
    hasLava: false,
};

const initialResult = generateDungeon(initialConfig);

export const useMapStore = create((set, get) => ({
    // Map data
    grid: initialResult.grid,
    rooms: initialResult.rooms,
    config: initialConfig,
    theme: 'dungeon',

    // Editor state
    selectedTool: TILE_TYPES.FLOOR,
    isErasing: false,
    hoveredTile: null,
    showGrid: true,
    isPainting: false,

    // Actions
    setGrid: (grid) => set({ grid }),

    generateMap: (config) => {
        const merged = { ...get().config, ...config };
        const result = generateDungeon(merged);
        set({
            grid: result.grid,
            rooms: result.rooms,
            config: merged,
            theme: merged.theme || get().theme,
        });
    },

    regenerate: () => {
        const config = { ...get().config, seed: Math.floor(Math.random() * 999999) };
        const result = generateDungeon(config);
        set({ grid: result.grid, rooms: result.rooms, config });
    },

    setTheme: (theme) => {
        set({ theme });
    },

    setSelectedTool: (tool) => set({ selectedTool: tool, isErasing: false }),
    setErasing: (v) => set({ isErasing: v }),
    setHoveredTile: (tile) => set({ hoveredTile: tile }),
    setShowGrid: (v) => set({ showGrid: v }),
    setIsPainting: (v) => set({ isPainting: v }),

    paintTile: (x, y) => {
        const { grid, selectedTool, isErasing } = get();
        if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return;
        const newGrid = grid.map((row) => [...row]);
        newGrid[y][x] = isErasing ? TILE_TYPES.EMPTY : selectedTool;
        set({ grid: newGrid });
    },
}));
