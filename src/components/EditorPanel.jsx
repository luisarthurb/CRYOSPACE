import React from 'react';
import { useMapStore } from '../store/mapStore';
import { TILE_TYPES, TILE_LABELS, TILE_ICONS, THEMES } from '../engine/tileConfig';

const PAINTABLE_TILES = [
    TILE_TYPES.FLOOR,
    TILE_TYPES.WALL,
    TILE_TYPES.DOOR,
    TILE_TYPES.WATER,
    TILE_TYPES.CHEST,
    TILE_TYPES.TORCH,
    TILE_TYPES.STAIRS,
    TILE_TYPES.LAVA,
    TILE_TYPES.GRASS,
];

export default function EditorPanel() {
    const selectedTool = useMapStore((s) => s.selectedTool);
    const setSelectedTool = useMapStore((s) => s.setSelectedTool);
    const isErasing = useMapStore((s) => s.isErasing);
    const setErasing = useMapStore((s) => s.setErasing);
    const hoveredTile = useMapStore((s) => s.hoveredTile);
    const showGrid = useMapStore((s) => s.showGrid);
    const setShowGrid = useMapStore((s) => s.setShowGrid);
    const regenerate = useMapStore((s) => s.regenerate);
    const theme = useMapStore((s) => s.theme);
    const setTheme = useMapStore((s) => s.setTheme);
    const generateMap = useMapStore((s) => s.generateMap);

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        generateMap({ theme: newTheme });
    };

    return (
        <div className="editor-panel">
            <div className="editor-section">
                <h3 className="section-title">🛠️ Tools</h3>
                <div className="tool-grid">
                    {PAINTABLE_TILES.map((type) => (
                        <button
                            key={type}
                            className={`tool-btn ${selectedTool === type && !isErasing ? 'active' : ''}`}
                            onClick={() => { setSelectedTool(type); setErasing(false); }}
                            title={TILE_LABELS[type]}
                        >
                            <span className="tool-icon">{TILE_ICONS[type]}</span>
                            <span className="tool-label">{TILE_LABELS[type]}</span>
                        </button>
                    ))}
                    <button
                        className={`tool-btn erase-btn ${isErasing ? 'active' : ''}`}
                        onClick={() => setErasing(!isErasing)}
                        title="Eraser"
                    >
                        <span className="tool-icon">🧹</span>
                        <span className="tool-label">Erase</span>
                    </button>
                </div>
            </div>

            <div className="editor-section">
                <h3 className="section-title">🎨 Theme</h3>
                <div className="theme-grid">
                    {Object.entries(THEMES).map(([key, t]) => (
                        <button
                            key={key}
                            className={`theme-btn ${theme === key ? 'active' : ''}`}
                            onClick={() => handleThemeChange(key)}
                        >
                            <div className="theme-preview">
                                <span className="theme-swatch" style={{ background: t.wall }} />
                                <span className="theme-swatch" style={{ background: t.floor }} />
                                <span className="theme-swatch" style={{ background: t.accent }} />
                            </div>
                            <span className="theme-name">{t.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="editor-section">
                <h3 className="section-title">⚙️ Options</h3>
                <label className="toggle-row">
                    <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                    />
                    <span>Show Grid</span>
                </label>
                <button className="action-btn regenerate-btn" onClick={regenerate}>
                    🎲 Regenerate Map
                </button>
            </div>

            {hoveredTile && (
                <div className="editor-section tile-info">
                    <h3 className="section-title">📍 Tile Info</h3>
                    <div className="info-grid">
                        <span className="info-label">Position</span>
                        <span className="info-value">({hoveredTile.x}, {hoveredTile.y})</span>
                        <span className="info-label">Type</span>
                        <span className="info-value">
                            {TILE_ICONS[hoveredTile.type]} {TILE_LABELS[hoveredTile.type] || 'Empty'}
                        </span>
                    </div>
                </div>
            )}

            <div className="editor-section controls-help">
                <h3 className="section-title">🎮 Controls</h3>
                <div className="help-list">
                    <span>🖱️ Left click — Paint tile</span>
                    <span>🖱️ Right drag — Orbit camera</span>
                    <span>🖱️ Middle drag — Pan</span>
                    <span>🔄 Scroll — Zoom</span>
                </div>
            </div>
        </div>
    );
}
