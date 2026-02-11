import React, { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMapStore } from '../store/mapStore';
import { TILE_TYPES, getTileVisuals } from '../engine/tileConfig';

// Single tile mesh component
function Tile({ x, y, type, theme, onPointerDown, onPointerEnter }) {
    const meshRef = useRef();
    const visuals = useMemo(() => getTileVisuals(type, theme), [type, theme]);

    // Animate water and lava
    useFrame((state) => {
        if (!meshRef.current) return;
        if (type === TILE_TYPES.WATER) {
            meshRef.current.position.y = 0.04 + Math.sin(state.clock.elapsedTime * 2 + x * 0.5 + y * 0.3) * 0.03;
        } else if (type === TILE_TYPES.LAVA) {
            meshRef.current.position.y = 0.05 + Math.sin(state.clock.elapsedTime * 1.5 + x * 0.7) * 0.02;
            if (meshRef.current.material) {
                meshRef.current.material.emissiveIntensity = 0.7 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
            }
        }
    });

    if (!visuals) return null;

    const posY = visuals.height / 2;
    const isObject = type === TILE_TYPES.CHEST || type === TILE_TYPES.TORCH || type === TILE_TYPES.STAIRS;

    return (
        <group position={[x, 0, y]}>
            {/* Floor underneath objects */}
            {isObject && visuals.floorColor && (
                <mesh position={[0, 0.075, 0]} receiveShadow>
                    <boxGeometry args={[1, 0.15, 1]} />
                    <meshStandardMaterial color={visuals.floorColor} roughness={0.9} metalness={0.1} />
                </mesh>
            )}

            {/* Main tile */}
            <mesh
                ref={meshRef}
                position={[0, posY, 0]}
                castShadow={type === TILE_TYPES.WALL || isObject}
                receiveShadow={type !== TILE_TYPES.WALL}
                onPointerDown={(e) => { e.stopPropagation(); onPointerDown?.(x, y); }}
                onPointerEnter={(e) => { e.stopPropagation(); onPointerEnter?.(x, y); }}
            >
                <boxGeometry args={
                    type === TILE_TYPES.CHEST ? [0.5, 0.4, 0.4] :
                        type === TILE_TYPES.TORCH ? [0.15, visuals.height, 0.15] :
                            [1, visuals.height, 1]
                } />
                <meshStandardMaterial
                    color={visuals.color}
                    emissive={visuals.emissive}
                    emissiveIntensity={visuals.emissiveIntensity}
                    transparent={visuals.opacity < 1}
                    opacity={visuals.opacity}
                    metalness={visuals.metalness}
                    roughness={visuals.roughness}
                />
            </mesh>

            {/* Wall top cap with different shade */}
            {type === TILE_TYPES.WALL && visuals.topColor && (
                <mesh position={[0, visuals.height + 0.01, 0]}>
                    <boxGeometry args={[1, 0.02, 1]} />
                    <meshStandardMaterial color={visuals.topColor} roughness={0.7} metalness={0.3} />
                </mesh>
            )}

            {/* Point light for torches and lava */}
            {visuals.isLight && (
                <pointLight
                    position={[0, visuals.height + 0.3, 0]}
                    color={visuals.lightColor}
                    intensity={visuals.lightIntensity}
                    distance={visuals.lightDistance}
                    decay={2}
                    castShadow={false}
                />
            )}

            {/* Torch flame glow */}
            {type === TILE_TYPES.TORCH && (
                <mesh position={[0, visuals.height + 0.1, 0]}>
                    <sphereGeometry args={[0.12, 8, 8]} />
                    <meshStandardMaterial
                        color="#ff6d00"
                        emissive="#ff9100"
                        emissiveIntensity={2}
                        transparent
                        opacity={0.8}
                    />
                </mesh>
            )}
        </group>
    );
}

const MemoTile = React.memo(Tile);

export default function MapRenderer() {
    const grid = useMapStore((s) => s.grid);
    const theme = useMapStore((s) => s.theme);
    const showGrid = useMapStore((s) => s.showGrid);
    const paintTile = useMapStore((s) => s.paintTile);
    const setHoveredTile = useMapStore((s) => s.setHoveredTile);
    const isPainting = useMapStore((s) => s.isPainting);
    const setIsPainting = useMapStore((s) => s.setIsPainting);

    const rows = grid.length;
    const cols = grid[0]?.length || 0;

    const handlePointerDown = useCallback((x, y) => {
        setIsPainting(true);
        paintTile(x, y);
    }, [paintTile, setIsPainting]);

    const handlePointerEnter = useCallback((x, y) => {
        setHoveredTile({ x, y, type: grid[y]?.[x] });
        if (isPainting) {
            paintTile(x, y);
        }
    }, [setHoveredTile, isPainting, paintTile, grid]);

    const tiles = useMemo(() => {
        const result = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const type = grid[y][x];
                if (type === TILE_TYPES.EMPTY) continue;
                result.push(
                    <MemoTile
                        key={`${x}-${y}`}
                        x={x}
                        y={y}
                        type={type}
                        theme={theme}
                        onPointerDown={handlePointerDown}
                        onPointerEnter={handlePointerEnter}
                    />
                );
            }
        }
        return result;
    }, [grid, theme, rows, cols, handlePointerDown, handlePointerEnter]);

    return (
        <group
            position={[-cols / 2, 0, -rows / 2]}
            onPointerUp={() => setIsPainting(false)}
            onPointerLeave={() => setIsPainting(false)}
        >
            {tiles}

            {/* Grid overlay */}
            {showGrid && (
                <gridHelper
                    args={[Math.max(cols, rows), Math.max(cols, rows), '#ffffff10', '#ffffff08']}
                    position={[cols / 2, 0.01, rows / 2]}
                />
            )}
        </group>
    );
}
