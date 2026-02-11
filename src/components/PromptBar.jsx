import React, { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { parsePrompt, PRESETS } from '../engine/promptParser';

export default function PromptBar() {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const generateMap = useMapStore((s) => s.generateMap);

    const handleGenerate = () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);

        // Small delay for visual feedback
        setTimeout(() => {
            const config = parsePrompt(prompt);
            generateMap(config);
            setIsGenerating(false);
        }, 400);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleGenerate();
        }
    };

    const handlePreset = (name) => {
        const config = PRESETS[name];
        if (config) {
            setPrompt(name);
            setIsGenerating(true);
            setTimeout(() => {
                generateMap(config);
                setIsGenerating(false);
            }, 400);
        }
    };

    return (
        <div className="prompt-bar">
            <div className="prompt-presets">
                {Object.keys(PRESETS).map((name) => (
                    <button
                        key={name}
                        className="preset-chip"
                        onClick={() => handlePreset(name)}
                    >
                        {name}
                    </button>
                ))}
            </div>
            <div className="prompt-input-row">
                <div className="prompt-glow" />
                <input
                    type="text"
                    className="prompt-input"
                    placeholder="Describe your map... e.g. 'A large dungeon with 5 rooms, treasure chests, and a lava pit'"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isGenerating}
                />
                <button
                    className={`prompt-generate-btn ${isGenerating ? 'generating' : ''}`}
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                >
                    {isGenerating ? (
                        <span className="spinner" />
                    ) : (
                        <>⚡ Generate</>
                    )}
                </button>
            </div>
        </div>
    );
}
