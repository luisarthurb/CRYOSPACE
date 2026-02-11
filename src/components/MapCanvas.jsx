import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import MapRenderer from './MapRenderer';
import { useMapStore } from '../store/mapStore';
import { THEMES } from '../engine/tileConfig';

function SceneSetup() {
    const theme = useMapStore((s) => s.theme);
    const palette = THEMES[theme] || THEMES.dungeon;

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.3} color="#a0a0c0" />
            <directionalLight
                position={[20, 30, 10]}
                intensity={0.8}
                color="#ffeedd"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={100}
                shadow-camera-left={-40}
                shadow-camera-right={40}
                shadow-camera-top={40}
                shadow-camera-bottom={-40}
            />
            <directionalLight position={[-10, 15, -20]} intensity={0.2} color="#8080ff" />

            {/* Atmosphere */}
            <fog attach="fog" args={[palette.fog, 15, 65]} />
            <Stars radius={100} depth={50} count={2000} factor={3} saturation={0.3} fade speed={0.5} />

            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color={palette.ambient} roughness={1} metalness={0} />
            </mesh>
        </>
    );
}

export default function MapCanvas() {
    return (
        <div className="map-canvas-container">
            <Canvas
                shadows
                camera={{ position: [0, 25, 25], fov: 50, near: 0.1, far: 200 }}
                gl={{ antialias: true, toneMapping: 3, toneMappingExposure: 1.2 }}
                onCreated={({ gl }) => {
                    gl.setClearColor('#08080f');
                }}
            >
                <Suspense fallback={null}>
                    <SceneSetup />
                    <MapRenderer />
                    <OrbitControls
                        makeDefault
                        enablePan
                        enableZoom
                        enableRotate
                        minDistance={5}
                        maxDistance={80}
                        maxPolarAngle={Math.PI / 2.1}
                        target={[0, 0, 0]}
                        mouseButtons={{
                            LEFT: 2, // orbit
                            MIDDLE: 1, // zoom
                            RIGHT: 0, // pan
                        }}
                    />
                </Suspense>
            </Canvas>
        </div>
    );
}
