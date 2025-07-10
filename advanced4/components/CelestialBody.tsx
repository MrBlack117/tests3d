/**
 * A component that renders celestial bodies with smooth movement and visual effects
 *
 * This component provides optimized rendering for planets and other celestial objects:
 * - Implements position interpolation for smooth transitions between animation frames
 * - Handles texture mapping and dynamic texture switching (e.g., Earth's quantum state)
 * - Adds special visual effects for specific bodies (Sun's glow, Saturn's rings)
 * - Uses preloaded textures for performance optimization
 *
 * The component uses frame-by-frame position smoothing to avoid jerky movements
 * even when receiving position updates at variable rates.
 */

import React, {useRef, useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';

interface SimpleCelestialBodyProps {
    name: string;                               // Celestial body name (e.g., "Earth", "Mars")
    position: { x: number; y: number; z: number }; // Current target position in 3D space
    color: string;                              // Base color (used as fallback if no texture)
    size: number;                               // Radius of the celestial body
    isAnimationActive: boolean;                 // Whether the animation system is running
    changeTexture?: 'normal' | 'quantum' | 'restoring'; // Texture state for special effects
    selectedPlanet?: string;                    // Currently selected planet for highlighting
    preloadedTextures?: { [key: string]: THREE.Texture }; // Pre-loaded texture maps
}

const SimpleCelestialBody: React.FC<SimpleCelestialBodyProps> = ({
                                                                     name,
                                                                     position,
                                                                     color,
                                                                     size,
                                                                     isAnimationActive,
                                                                     changeTexture,
                                                                     preloadedTextures
                                                                 }) => {
    const bodyRef = useRef<THREE.Mesh>(null!);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null!);
    const originalTextureRef = useRef<THREE.Texture | null>(null);
    const targetPositionRef = useRef({x: 0, y: 0, z: 0});

    /**
     * Updates the target position when the position prop changes
     * This creates a reference that can be accessed in the animation frame loop
     */
    useEffect(() => {
        targetPositionRef.current = {...position};
    }, [position]);

    /**
     * Applies the initial texture to the celestial body when first rendered
     * Stores Earth's original texture for later restoration
     */
    useEffect(() => {
        if (!materialRef.current || !preloadedTextures) return;

        const textureKey = name.toLowerCase();
        if (preloadedTextures[textureKey]) {
            materialRef.current.map = preloadedTextures[textureKey];

            if (name === 'Earth') {
                originalTextureRef.current = preloadedTextures[textureKey];
            }

            materialRef.current.needsUpdate = true;
        }
    }, [name, preloadedTextures]);

    /**
     * Handles Earth's texture changes for special visual effects
     * Switches between normal, quantum, and restoring states
     */
    useEffect(() => {
        if (name !== 'Earth' || !materialRef.current || !preloadedTextures) return;

        if (changeTexture === 'quantum') {
            const quantumTexture = preloadedTextures['quantum'];
            if (quantumTexture) {
                materialRef.current.map = quantumTexture;
                materialRef.current.needsUpdate = true;
            }
        } else if (changeTexture === 'restoring') {
            if (originalTextureRef.current) {
                materialRef.current.map = originalTextureRef.current;
                materialRef.current.needsUpdate = true;
            } else if (preloadedTextures['earth']) {
                materialRef.current.map = preloadedTextures['earth'];
                materialRef.current.needsUpdate = true;
            }
        }
    }, [changeTexture, name, preloadedTextures]);

    /**
     * Smoothly interpolates between current and target positions on each frame
     * Creates fluid motion even with discrete position updates
     */
    useFrame(() => {
        if (bodyRef.current) {
            // Dynamic smoothing depending on the animation state
            // When the animation stops (end of animation),
            // we want to reach the final position faster
            const smoothFactor = !isAnimationActive ? 0.5 : 0.3;

            // Apply more direct interpolation towards the target position
            bodyRef.current.position.x += (targetPositionRef.current.x - bodyRef.current.position.x) * smoothFactor;
            bodyRef.current.position.y += (targetPositionRef.current.y - bodyRef.current.position.y) * smoothFactor;
            bodyRef.current.position.z += (targetPositionRef.current.z - bodyRef.current.position.z) * smoothFactor;

            // If the planet is very close to the target position, force the exact position
            // to eliminate small oscillations around the final position
            const distanceSquared =
                Math.pow(targetPositionRef.current.x - bodyRef.current.position.x, 2) +
                Math.pow(targetPositionRef.current.y - bodyRef.current.position.y, 2) +
                Math.pow(targetPositionRef.current.z - bodyRef.current.position.z, 2);

            if (!isAnimationActive && distanceSquared < 0.0001) {
                bodyRef.current.position.x = targetPositionRef.current.x;
                bodyRef.current.position.y = targetPositionRef.current.y;
                bodyRef.current.position.z = targetPositionRef.current.z;
            }
        }
    });

    return (
        <mesh ref={bodyRef} position={[position.x, position.y, position.z]}>
            <sphereGeometry args={[size, 32, 32]}/>
            <meshStandardMaterial
                ref={materialRef}
                color={preloadedTextures && preloadedTextures[name.toLowerCase()] ? undefined : new THREE.Color(0x808080)}
                metalness={0}
                roughness={0.8}
                emissive={
                    name === 'Sun' ? new THREE.Color('#ffff00') : new THREE.Color(0x222222)
                }
                emissiveIntensity={
                    name === 'Sun' ? 0.4 :
                        name === 'Earth' ? 0.3 :
                            0.1
                }
            />

            {/* Add a point light source for the Sun */}
            {name === 'Sun' && (
                <pointLight
                    color="#ffff00"
                    intensity={1.5}
                    distance={50}
                    decay={2}
                />
            )}

            {/* Render Saturn's ring system if this is Saturn */}
            {name === 'Saturn' && (
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[size * 1.2, size * 2, 32]}/>
                    <meshStandardMaterial
                        color="#857d5f"
                        transparent={true}
                        opacity={0.7}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            )}
        </mesh>
    );
};

export default SimpleCelestialBody;