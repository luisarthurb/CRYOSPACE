import { TILE_TYPES } from './tileConfig';

/**
 * Procedural Dungeon Generator using BSP (Binary Space Partitioning)
 *
 * @param {Object} config
 * @param {number} config.width - Grid width (default 40)
 * @param {number} config.height - Grid height (default 40)
 * @param {number} config.roomCount - Approximate number of rooms (default 5)
 * @param {string} config.theme - Theme name (dungeon, cave, forest, etc.)
 * @param {number} config.seed - Random seed (optional)
 * @param {boolean} config.hasWater - Whether to include water features
 * @param {boolean} config.hasChests - Whether to include treasure chests
 * @param {boolean} config.hasTorches - Whether to include torches
 * @param {boolean} config.hasLava - Whether to include lava
 * @returns {number[][]} 2D grid of tile type IDs
 */
export function generateDungeon(config = {}) {
    const {
        width = 40,
        height = 40,
        roomCount = 5,
        hasWater = false,
        hasChests = true,
        hasTorches = true,
        hasLava = false,
        theme = 'dungeon',
    } = config;

    // Seeded random
    let seed = config.seed || Math.floor(Math.random() * 999999);
    const random = () => {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
    };

    const randInt = (min, max) => Math.floor(random() * (max - min + 1)) + min;

    // Initialize grid with walls
    const grid = Array.from({ length: height }, () =>
        Array.from({ length: width }, () => TILE_TYPES.WALL)
    );

    const rooms = [];
    const MIN_ROOM = 4;
    const MAX_ROOM = Math.min(10, Math.floor(Math.min(width, height) / 3));

    // --- BSP Room Placement ---
    function splitAndPlace(x, y, w, h, depth) {
        if (depth <= 0 || w < MIN_ROOM * 2 + 3 || h < MIN_ROOM * 2 + 3) {
            // Place a room in this leaf
            const rw = randInt(MIN_ROOM, Math.min(MAX_ROOM, w - 2));
            const rh = randInt(MIN_ROOM, Math.min(MAX_ROOM, h - 2));
            const rx = randInt(x + 1, x + w - rw - 1);
            const ry = randInt(y + 1, y + h - rh - 1);
            rooms.push({ x: rx, y: ry, w: rw, h: rh });
            return { x: rx, y: ry, w: rw, h: rh };
        }

        const splitH = random() > 0.5;
        let child1, child2;

        if (splitH && h > MIN_ROOM * 2 + 3) {
            const split = randInt(y + MIN_ROOM + 1, y + h - MIN_ROOM - 2);
            child1 = splitAndPlace(x, y, w, split - y, depth - 1);
            child2 = splitAndPlace(x, split, w, y + h - split, depth - 1);
        } else if (w > MIN_ROOM * 2 + 3) {
            const split = randInt(x + MIN_ROOM + 1, x + w - MIN_ROOM - 2);
            child1 = splitAndPlace(x, y, split - x, h, depth - 1);
            child2 = splitAndPlace(split, y, x + w - split, h, depth - 1);
        } else {
            const rw = randInt(MIN_ROOM, Math.min(MAX_ROOM, w - 2));
            const rh = randInt(MIN_ROOM, Math.min(MAX_ROOM, h - 2));
            const rx = randInt(x + 1, x + w - rw - 1);
            const ry = randInt(y + 1, y + h - rh - 1);
            rooms.push({ x: rx, y: ry, w: rw, h: rh });
            return { x: rx, y: ry, w: rw, h: rh };
        }

        // Connect children with an L-shaped corridor
        if (child1 && child2) {
            connectRooms(child1, child2);
        }
        return child1;
    }

    function connectRooms(a, b) {
        const ax = Math.floor(a.x + a.w / 2);
        const ay = Math.floor(a.y + a.h / 2);
        const bx = Math.floor(b.x + b.w / 2);
        const by = Math.floor(b.y + b.h / 2);

        // Horizontal then vertical
        if (random() > 0.5) {
            carveHCorridor(ax, bx, ay);
            carveVCorridor(ay, by, bx);
        } else {
            carveVCorridor(ay, by, ax);
            carveHCorridor(ax, bx, by);
        }
    }

    function carveHCorridor(x1, x2, y) {
        const start = Math.min(x1, x2);
        const end = Math.max(x1, x2);
        for (let x = start; x <= end; x++) {
            if (x >= 0 && x < width && y >= 0 && y < height) {
                if (grid[y][x] === TILE_TYPES.WALL) {
                    grid[y][x] = TILE_TYPES.FLOOR;
                }
            }
        }
    }

    function carveVCorridor(y1, y2, x) {
        const start = Math.min(y1, y2);
        const end = Math.max(y1, y2);
        for (let y = start; y <= end; y++) {
            if (x >= 0 && x < width && y >= 0 && y < height) {
                if (grid[y][x] === TILE_TYPES.WALL) {
                    grid[y][x] = TILE_TYPES.FLOOR;
                }
            }
        }
    }

    // Calculate BSP depth from room count
    const depth = Math.ceil(Math.log2(Math.max(2, roomCount)));
    splitAndPlace(0, 0, width, height, depth);

    // Carve rooms into the grid
    for (const room of rooms) {
        for (let ry = room.y; ry < room.y + room.h && ry < height; ry++) {
            for (let rx = room.x; rx < room.x + room.w && rx < width; rx++) {
                if (rx >= 0 && rx < width && ry >= 0 && ry < height) {
                    grid[ry][rx] = TILE_TYPES.FLOOR;
                }
            }
        }
    }

    // --- Place Doors ---
    for (const room of rooms) {
        const doorCandidates = [];
        // Check edges of each room
        for (let rx = room.x; rx < room.x + room.w; rx++) {
            if (room.y > 0 && grid[room.y - 1][rx] === TILE_TYPES.FLOOR) {
                doorCandidates.push({ x: rx, y: room.y });
            }
            const by = room.y + room.h - 1;
            if (by < height - 1 && grid[by + 1]?.[rx] === TILE_TYPES.FLOOR) {
                doorCandidates.push({ x: rx, y: by });
            }
        }
        for (let ry = room.y; ry < room.y + room.h; ry++) {
            if (room.x > 0 && grid[ry][room.x - 1] === TILE_TYPES.FLOOR) {
                doorCandidates.push({ x: room.x, y: ry });
            }
            const bx = room.x + room.w - 1;
            if (bx < width - 1 && grid[ry]?.[bx + 1] === TILE_TYPES.FLOOR) {
                doorCandidates.push({ x: bx, y: ry });
            }
        }
        // Place 1-2 doors per room
        const doorsToPlace = Math.min(doorCandidates.length, randInt(1, 2));
        for (let i = 0; i < doorsToPlace; i++) {
            const idx = randInt(0, doorCandidates.length - 1);
            const d = doorCandidates.splice(idx, 1)[0];
            if (d && grid[d.y][d.x] === TILE_TYPES.FLOOR) {
                grid[d.y][d.x] = TILE_TYPES.DOOR;
            }
        }
    }

    // --- Scatter Objects ---
    for (const room of rooms) {
        const floorTiles = [];
        for (let ry = room.y + 1; ry < room.y + room.h - 1; ry++) {
            for (let rx = room.x + 1; rx < room.x + room.w - 1; rx++) {
                if (grid[ry][rx] === TILE_TYPES.FLOOR) {
                    floorTiles.push({ x: rx, y: ry });
                }
            }
        }

        // Torches in corners
        if (hasTorches && floorTiles.length > 4) {
            const corners = [
                { x: room.x, y: room.y },
                { x: room.x + room.w - 1, y: room.y },
                { x: room.x, y: room.y + room.h - 1 },
                { x: room.x + room.w - 1, y: room.y + room.h - 1 },
            ];
            for (const c of corners) {
                if (random() > 0.5 && grid[c.y]?.[c.x] === TILE_TYPES.FLOOR) {
                    grid[c.y][c.x] = TILE_TYPES.TORCH;
                }
            }
        }

        // Chests
        if (hasChests && floorTiles.length > 2 && random() > 0.6) {
            const t = floorTiles[randInt(0, floorTiles.length - 1)];
            if (grid[t.y][t.x] === TILE_TYPES.FLOOR) {
                grid[t.y][t.x] = TILE_TYPES.CHEST;
            }
        }

        // Water/Lava pools
        if (hasWater && floorTiles.length > 6 && random() > 0.7) {
            const center = floorTiles[randInt(0, floorTiles.length - 1)];
            const poolSize = randInt(1, 2);
            for (let dy = -poolSize; dy <= poolSize; dy++) {
                for (let dx = -poolSize; dx <= poolSize; dx++) {
                    const py = center.y + dy;
                    const px = center.x + dx;
                    if (
                        py > room.y && py < room.y + room.h - 1 &&
                        px > room.x && px < room.x + room.w - 1 &&
                        grid[py][px] === TILE_TYPES.FLOOR &&
                        random() > 0.3
                    ) {
                        grid[py][px] = TILE_TYPES.WATER;
                    }
                }
            }
        }

        if (hasLava && floorTiles.length > 6 && random() > 0.75) {
            const center = floorTiles[randInt(0, floorTiles.length - 1)];
            const poolSize = randInt(1, 2);
            for (let dy = -poolSize; dy <= poolSize; dy++) {
                for (let dx = -poolSize; dx <= poolSize; dx++) {
                    const py = center.y + dy;
                    const px = center.x + dx;
                    if (
                        py > room.y && py < room.y + room.h - 1 &&
                        px > room.x && px < room.x + room.w - 1 &&
                        grid[py][px] === TILE_TYPES.FLOOR &&
                        random() > 0.4
                    ) {
                        grid[py][px] = TILE_TYPES.LAVA;
                    }
                }
            }
        }
    }

    // Place stairs in last room
    if (rooms.length > 0) {
        const lastRoom = rooms[rooms.length - 1];
        const cx = Math.floor(lastRoom.x + lastRoom.w / 2);
        const cy = Math.floor(lastRoom.y + lastRoom.h / 2);
        if (grid[cy][cx] === TILE_TYPES.FLOOR) {
            grid[cy][cx] = TILE_TYPES.STAIRS;
        }
    }

    return { grid, rooms, seed };
}
