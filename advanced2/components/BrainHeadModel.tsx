/**
 * A component that renders a 3D model of a head with anatomical brain structures
 * (hippocampus and hypophysis) that can animate with color transitions.
 *
 * This component manages complex animations using Fibonacci sequences for
 * organic-looking color transitions, creating a visual representation of
 * brain activity in response to planetary influences.
 *
 * REFACTORED VERSION: Improved memory management and render optimization
 * through proper scene cloning and memoization patterns.
 */

import React, {useMemo, useEffect, useRef} from 'react';
import {useGLTF} from '@react-three/drei';
import * as  THREE from 'three';

// Import 3D model assets
const headPath = require('../assets/models/head.glb') as string;
const hippocampusPath = require('../assets/models/hippocampus.glb') as string;
const hypophysisPath = require('../assets/models/hypophysis.glb') as string;

interface BrainHeadModelProps {
    startAnimation: boolean;
    onAnimationComplete: () => void;
    onModelsLoaded?: () => void;
}

/**
 * Generates a Fibonacci sequence for animation timing
 * Adds natural, organic rhythm to color transitions
 */
function getFibonacciSequence(maxTime: number, shift: number): number[] {
    const fib: number[] = [1, 1];
    let i = 2;
    while (true) {
        const nextFib = fib[i - 1] + fib[i - 2] + shift;
        if (nextFib > maxTime) break;
        fib.push(nextFib);
        i++;
    }
    return fib;
}

/**
 * Utility functions for color conversions between hex and HSL
 * HSL is easier to animate for smooth transitions
 */
function hexToHSL(hex: string) {
    const color = new THREE.Color();
    color.setStyle(`#${hex}`);
    const hsl = {h: 0, s: 0, l: 0};
    color.getHSL(hsl);
    return {h: hsl.h * 360, s: hsl.s * 100, l: hsl.l * 100};
}

function hslToHex(h: number, s: number, l: number) {
    const color = new THREE.Color();
    color.setHSL(h / 360, s / 100, l / 100);
    return `#${color.getHexString()}`;
}

const BrainHeadModel: React.FC<BrainHeadModelProps> = ({
                                                           startAnimation,
                                                           onAnimationComplete,
                                                           onModelsLoaded,
                                                       }) => {
    // Load 3D models using drei's useGLTF hook
    const {scene: headScene} = useGLTF(headPath);
    const {scene: hippocampusScene} = useGLTF(hippocampusPath);
    const {scene: hypophysisScene} = useGLTF(hypophysisPath);

    /**
     * Create independent clones of each scene to prevent cross-instance material conflicts
     * This ensures each component instance maintains its own material state
     * without affecting other instances of the same component
     */
    const localHeadScene = useMemo(() => headScene.clone(true), [headScene]);
    const localHippocampusScene = useMemo(() => hippocampusScene.clone(true), [hippocampusScene]);
    const localHypophysisScene = useMemo(() => hypophysisScene.clone(true), [hypophysisScene]);

    /**
     * Extract and memoize meshes from each cloned 3D model
     * Memoization prevents unnecessary re-computation on renders
     * when the underlying scenes haven't changed
     */
    const headMeshes = useMemo(() => {
        const arr: THREE.Mesh[] = [];
        localHeadScene.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) arr.push(obj as THREE.Mesh);
        });
        return arr;
    }, [localHeadScene]);

    const hippocampusMeshes = useMemo(() => {
        const arr: THREE.Mesh[] = [];
        localHippocampusScene.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) arr.push(obj as THREE.Mesh);
        });
        return arr;
    }, [localHippocampusScene]);

    const hypophysisMeshes = useMemo(() => {
        const arr: THREE.Mesh[] = [];
        localHypophysisScene.traverse(obj => {
            if ((obj as THREE.Mesh).isMesh) arr.push(obj as THREE.Mesh);
        });
        return arr;
    }, [localHypophysisScene]);

    // Store references to animation frame requests for proper cleanup
    const animationFrameRefs = useRef<Map<string, number>>(new Map());

    /**
     * Initialize all meshes with proper materials and positioning
     * Head is semi-transparent while brain parts are initially invisible
     * Sets up consistent visual state across all component instances
     */
    const resetMaterials = () => {
        // Configure head mesh: semi-transparent, white with subtle glow
        headMeshes.forEach(mesh => {
            if (mesh.material instanceof THREE.MeshStandardMaterial) {
                mesh.material.transparent = true;
                mesh.material.opacity = 0.3;
                mesh.material.color.set('#ffffff');
                mesh.material.depthWrite = false; // Prevent z-fighting with brain parts
                mesh.material.emissive.set('#ffffff');
                mesh.material.emissiveIntensity = 0.4;
                mesh.material.needsUpdate = true;
            }
            mesh.visible = true;
            mesh.position.set(0, -3, 0);
            mesh.scale.set(4.5, 4.5, 4.5);
            mesh.renderOrder = 0; // Render head first
        });

        // Configure brain parts: initially invisible, ready for animation
        [...hippocampusMeshes, ...hypophysisMeshes].forEach(mesh => {
            if (mesh.material instanceof THREE.MeshStandardMaterial) {
                mesh.material.transparent = true;
                mesh.material.opacity = 0; // Start invisible
                mesh.material.color.set('#d9d9d9');
                mesh.material.depthWrite = true;
                mesh.material.emissive.set(0x000000);
                mesh.material.emissiveIntensity = 0;
                mesh.material.needsUpdate = true;
            }
            mesh.visible = true;
            mesh.position.set(-1.44, -2.1, -1.25);
            mesh.scale.set(3, 3, 3);
            mesh.renderOrder = 1; // Render brain parts after head
        });
    };

    /**
     * Reset materials on component mount and ensure proper cleanup
     * This effect runs whenever mesh arrays change, maintaining consistency
     */
    useEffect(() => {
        resetMaterials();

        // Clean up all animation frames on unmount to prevent memory leaks
        return () => {
            animationFrameRefs.current.forEach((frameId) => cancelAnimationFrame(frameId));
            animationFrameRefs.current.clear();
        };

    }, [headMeshes, hippocampusMeshes, hypophysisMeshes]);

    /**
     * Notify parent component when all models are loaded
     */
    useEffect(() => {
        if (headMeshes.length > 0 && hippocampusMeshes.length > 0 && hypophysisMeshes.length > 0 && onModelsLoaded) {
            console.log('BrainHeadModel: All 3D models loaded');
            // Сообщаем родительскому компоненту, что все модели загружены
            onModelsLoaded();
        }
    }, [headMeshes, hippocampusMeshes, hypophysisMeshes, onModelsLoaded]);

    /**
     * Main animation function for brain parts
     * Creates complex color transitions using Fibonacci timing
     * and HSL color interpolation for smooth, organic effects
     */
    const animateGroup = (meshes: THREE.Mesh[], onComplete: () => void) => {
        const totalDuration = 4669; // Animation duration (prime number for natural feel)
        const k = 15; // Color shift coefficient for hue transitions
        const fadeOutDuration = 1000;
        const fadeOutSteps = 20;
        const fadeOutInterval = fadeOutDuration / fadeOutSteps;

        const isPositive = Math.random() > 0.5;
        let currentColor = new THREE.Color(isPositive ? '#0000ff' : '#ff0000');
        let currentHSL = hexToHSL(currentColor.getHexString().replace('#', ''));
        let targetHSL = {...currentHSL};
        let time = 0;

        // Initialize all mesh materials with the starting color and full opacity
        meshes.forEach(mesh => {
            if (mesh.material instanceof THREE.MeshStandardMaterial) {
                mesh.material.transparent = true;
                mesh.material.opacity = 1;
                mesh.material.color.copy(currentColor);
                mesh.material.emissive.copy(currentColor);
                mesh.material.emissiveIntensity = 0.3;
                mesh.material.needsUpdate = true;
            }
        });

        const fibSequence = getFibonacciSequence(totalDuration, 0);
        let fibIndex = 0;
        let startTime: number | null = null;

        // Cancel any existing animations for these meshes to prevent conflicts
        meshes.forEach(mesh => {
            if (animationFrameRefs.current.has(mesh.uuid)) {
                cancelAnimationFrame(animationFrameRefs.current.get(mesh.uuid)!);
                animationFrameRefs.current.delete(mesh.uuid);
            }
        });

        /**
         * Animation frame handler - updates colors based on elapsed time
         * and manages timing through Fibonacci sequence steps
         * Uses UUID-based tracking for better mesh identification
         */
        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;

            // Check if we've completed the Fibonacci sequence
            if (fibIndex >= fibSequence.length) {
                // Begin fade-out animation after color sequence completes
                let fadeStep = 0;
                const fadeOut = () => {
                    fadeStep++;
                    const opacity = 1 - fadeStep / fadeOutSteps;
                    meshes.forEach(mesh => {
                        if (mesh.material instanceof THREE.MeshStandardMaterial) {
                            mesh.material.opacity = opacity;
                            mesh.material.needsUpdate = true;
                        }
                    });
                    if (fadeStep >= fadeOutSteps) {
                        // Clean up animation references and trigger completion callback
                        meshes.forEach(mesh => animationFrameRefs.current.delete(mesh.uuid));
                        onComplete();
                        return;
                    }
                    setTimeout(fadeOut, fadeOutInterval);
                };
                fadeOut();
                return;
            }

            // Get current Fibonacci number and calculate interpolation progress
            const Fn = fibSequence[fibIndex];
            const progress = Math.min(elapsed / Fn, 1);

            // Interpolate between current and target HSL values for smooth transitions
            const h = THREE.MathUtils.lerp(currentHSL.h, targetHSL.h, progress);
            const s = THREE.MathUtils.lerp(currentHSL.s, targetHSL.s, progress);
            const l = THREE.MathUtils.lerp(currentHSL.l, targetHSL.l, progress);
            const interpolatedColor = new THREE.Color(hslToHex(h, s, l));

            // Apply interpolated color to all meshes with dynamic emissive intensity
            meshes.forEach(mesh => {
                if (mesh.material instanceof THREE.MeshStandardMaterial) {
                    mesh.material.color.set(interpolatedColor);
                    mesh.material.emissive.set(interpolatedColor);
                    mesh.material.emissiveIntensity = 0.3 + (l / 100) * 0.2;
                    mesh.material.needsUpdate = true;
                }
            });

            // When reaching target color, advance to next Fibonacci step
            if (progress >= 1) {
                currentHSL = {...targetHSL};
                fibIndex++;
                startTime = timestamp;

                if (fibIndex < fibSequence.length) {
                    const nextFn = fibSequence[fibIndex];
                    // Calculate next target HSL values using mathematical patterns
                    // for organic, non-linear color transitions
                    targetHSL.h = (currentHSL.h + nextFn * k) % 360;
                    targetHSL.s = 50 + 50 * Math.sin(time * 0.05);
                    targetHSL.l = 40 + 30 * Math.sin(time * 0.03);
                    time += nextFn;
                }
            }

            // Continue animation loop and track frame IDs using mesh UUIDs
            const frameId = requestAnimationFrame(animate);
            meshes.forEach(mesh => animationFrameRefs.current.set(mesh.uuid, frameId));
        };

        // Start animation and set initial target color
        const frameId = requestAnimationFrame(animate);
        meshes.forEach(mesh => animationFrameRefs.current.set(mesh.uuid, frameId));

        targetHSL.h = (currentHSL.h + fibSequence[0] * k) % 360;
        targetHSL.s = 50 + 50 * Math.sin(time * 0.05);
        targetHSL.l = 40 + 30 * Math.sin(time * 0.03);
        time += fibSequence[0];
    };

    /**
     * Start animation sequence when triggered by parent component
     * Animates hypophysis first, then hippocampus in sequence
     * for realistic brain activation pattern
     */
    useEffect(() => {
        if (startAnimation) {
            animateGroup(hypophysisMeshes, () => {
                animateGroup(hippocampusMeshes, () => {
                    if (typeof onAnimationComplete === 'function') onAnimationComplete();
                });
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startAnimation, hypophysisMeshes, hippocampusMeshes, onAnimationComplete]);

    /**
     * Render all meshes as primitives with proper key generation
     * Using descriptive keys for better React reconciliation
     */
    return (
        <>
            {headMeshes.map((mesh, i) => (
                <primitive key={`head-${i}`} object={mesh}/>
            ))}
            {hippocampusMeshes.map((mesh, i) => (
                <primitive key={`hippocampus-${i}`} object={mesh}/>
            ))}
            {hypophysisMeshes.map((mesh, i) => (
                <primitive key={`hypophysis-${i}`} object={mesh}/>
            ))}
        </>
    );
};

export default BrainHeadModel;
