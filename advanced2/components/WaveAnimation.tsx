/**
 * A component that renders animated wave effects between interacting planets
 *
 * This component generates water-like waves that visualize planetary interactions:
 * - Creates waves that expand from source to target positions
 * - Simulates collision effects when waves meet
 * - Supports positive/negative interaction visual styles
 * - Uses custom shaders for realistic water wave rendering
 * - Manages the complete animation lifecycle
 */

import React, {useState, useRef, useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';


interface WaveAnimationProps {
    earthPosition: { x: number; y: number; z: number };
    targetPosition: { x: number; y: number; z: number };
    isActive: boolean;
    interaction: 'positive' | 'negative';
    onComplete?: () => void;
}

interface WaveUserData {
    initialSize: number;
    currentSize: number;
    source: 'earth' | 'target';
}

interface AnimationState {
    phase: 'expanding' | 'collision' | 'returning' | 'fading' | 'complete';
    expandingProgress: number;
    returningProgress: number;
    fadingProgress: number;
    maxReachedRadius: number;
    collisionStarted: boolean;
    earthWaveRadius: number;
    targetWaveRadius: number;
    animationCompleted: boolean;
}

/**
 * Vertex shader for planetary interaction wave effect
 *
 * Handles:
 * - Wave height calculation based on distance
 * - Animation phases (expanding, returning, etc.)
 * - Normal calculation for realistic lighting
 */

const WAVE_VERTEX_SHADER = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vWaveHeight;
    varying vec3 vLocalPos;
    varying float vInteractionFactor;
    varying float vDistanceFromCenter;
    varying float vEdgeFade;
    uniform float time;
    uniform float waveFrequency;
    uniform float waveAmplitude;
    uniform float innerRadius;
    uniform vec3 otherCenter;
    uniform float otherWaveRadius;
    uniform float revealRadius;
    uniform float returningProgress;
    uniform int animationPhase;
    uniform int isReturningWave;
    uniform int animationCompleted;

    float calculateWaveHeight(float dist, float normalizedDist, float amplitudeFactor, float frequency, float amplitude) {
        float wavePhase = normalizedDist * frequency - time * 1.5;
        return sin(wavePhase) * amplitude * amplitudeFactor * 1.2;
    }

    void main() {
        vUv = uv;
        vec3 pos = position;
        vLocalPos = pos;
        
        vec2 localPos = pos.xy;
        float dist = length(localPos);
        vDistanceFromCenter = dist;
        
        float normalizedDist = dist / 10.0;
        float amplitudeFactor = 0.0;
        float edgeFade = 1.0;
        
        if (animationCompleted == 1) {
            amplitudeFactor = 0.0;
            pos.z = 0.0;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            return;
        }
        
        float effectiveRevealRadius = revealRadius * 50.0;
        
        if (animationPhase >= 2 && isReturningWave == 1) {
            // Returning wave: matter compresses
            float currentMatterRadius = effectiveRevealRadius * (1.0 - returningProgress);
            
            if (dist <= currentMatterRadius) {
                if (dist > innerRadius) {
                    float t = (dist - innerRadius) / max(0.1, currentMatterRadius - innerRadius);
                    amplitudeFactor = smoothstep(0.0, 1.0, t * 0.8);
                } else {
                    amplitudeFactor = 0.0;
                }
                
                // Smooth edge blending
                float edgeDistance = currentMatterRadius - dist;
                float edgeZone = currentMatterRadius * 0.15;
                if (edgeDistance < edgeZone) {
                    edgeFade = smoothstep(0.0, edgeZone, edgeDistance);
                    amplitudeFactor *= edgeFade;
                }
            }
        } else {
            // Normal wave: matter expands or remains stable
            if (dist <= effectiveRevealRadius) {
                if (dist > innerRadius) {
                    float t = (dist - innerRadius) / max(0.1, effectiveRevealRadius - innerRadius);
                    amplitudeFactor = smoothstep(0.0, 1.0, t * 0.8);
                } else {
                    amplitudeFactor = 0.0;
                }
                
                // Smooth edge blending for normal matter
                float edgeDistance = effectiveRevealRadius - dist;
                float edgeZone = effectiveRevealRadius * 0.1;
                if (edgeDistance < edgeZone) {
                    edgeFade = smoothstep(0.0, edgeZone, edgeDistance);
                    amplitudeFactor *= edgeFade;
                }
            }
        }
        
        vEdgeFade = edgeFade;
        
        // Interaction with another wave
        vec3 worldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
        vInteractionFactor = 0.0;
        
        if (distance(worldPos, otherCenter) < otherWaveRadius * 1.5) {
            float distToOther = distance(worldPos, otherCenter);
            float interactionZone = abs(distToOther - otherWaveRadius);
            float interactionFactor = 1.0 - clamp(interactionZone / (otherWaveRadius * 0.5), 0.0, 1.0);
            vInteractionFactor = interactionFactor;
        }
        
        // Enhanced wave generation with smoother crests
        float baseWave = calculateWaveHeight(dist, normalizedDist, amplitudeFactor, waveFrequency, waveAmplitude);
        
        // Add secondary waves for smoother surface
        float secondaryWave = sin(normalizedDist * waveFrequency * 0.5 - time * 0.8) * waveAmplitude * amplitudeFactor * 0.3;
        float tertiaryWave = sin(normalizedDist * waveFrequency * 2.0 - time * 2.2) * waveAmplitude * amplitudeFactor * 0.15;
        
        // Combine waves for more natural result
        float combinedWave = baseWave + secondaryWave + tertiaryWave;
        
        // Additional smoothing of wave crests
        float waveSmoothingFactor = 1.0 - pow(abs(baseWave) / (waveAmplitude * amplitudeFactor + 0.001), 0.8);
        combinedWave *= mix(0.7, 1.0, waveSmoothingFactor);
        
        pos.z += combinedWave;
        vWaveHeight = combinedWave;
        
        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vPosition = worldPosition.xyz;
        
        // Enhanced normal calculation for smoother lighting
        float step = 0.1;
        
        // Calculate neighboring points for gradient
        float heightX1 = calculateWaveHeight(dist + step, (dist + step) / 10.0, amplitudeFactor, waveFrequency, waveAmplitude);
        float heightX2 = calculateWaveHeight(dist - step, (dist - step) / 10.0, amplitudeFactor, waveFrequency, waveAmplitude);
        float heightY1 = calculateWaveHeight(dist, normalizedDist + step/10.0, amplitudeFactor, waveFrequency, waveAmplitude);
        float heightY2 = calculateWaveHeight(dist, normalizedDist - step/10.0, amplitudeFactor, waveFrequency, waveAmplitude);
        
        // Gradient for more accurate normals
        vec3 gradientX = vec3(2.0 * step, 0.0, heightX1 - heightX2);
        vec3 gradientY = vec3(0.0, 2.0 * step, heightY1 - heightY2);
        
        // Cross product for normal
        vec3 calculatedNormal = normalize(cross(gradientX, gradientY));
        vNormal = calculatedNormal;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

/**
 * Fragment shader for planetary interaction wave effect
 *
 * Handles:
 * - Water-like surface rendering
 * - Color transitions based on wave height
 * - Particle effects for interactions
 * - Fade in/out transitions
 */

const WAVE_FRAGMENT_SHADER = `
    uniform vec3 color;
    uniform float time;
    uniform float revealRadius;
    uniform int interactionType;
    uniform int isEarthWave;
    uniform float totalAnimationTime;
    uniform float overallAlpha;
    uniform float returningProgress;
    uniform int animationPhase;
    uniform int isReturningWave;
    uniform float fadingProgress;
    uniform int animationCompleted;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vWaveHeight;
    varying vec3 vLocalPos;
    varying float vInteractionFactor;
    varying float vDistanceFromCenter;
    varying float vEdgeFade;
    
    // Water style with original colors (no foam)
    vec3 createWaterWaves(float heightFactor, vec3 baseColor, vec2 pos, float time, vec3 normal) {
        // Light highlights (like sun reflections on water)
        vec3 lightDir = normalize(vec3(1.0, 1.0, 2.0));
        float specular = pow(max(0.0, dot(normal, lightDir)), 48.0);
        
        // Use original wave colors with water transitions
        vec3 troughColor = vec3(0.0, 0.3, 0.7);  // Dark troughs
        vec3 peakColor = vec3(1.0, 0.95, 0.3);   // Bright crests
        
        // Mix with base wave color (blue/green/red)
        troughColor = mix(troughColor, baseColor * 0.8, 0.6);
        peakColor = mix(peakColor, baseColor * 1.2, 0.4);
        
        // Smooth transition between troughs and crests
        vec3 waveColor = mix(troughColor, peakColor, heightFactor);
        
        // Add highlights for water realism
        vec3 specularColor = vec3(1.0, 1.0, 0.9); // Warm white highlight
        return waveColor + specular * specularColor * 0.6;
    }
    
    vec3 createParticleEffect(vec3 baseColor, vec2 pos, float time, vec3 particleColor) {
        float dist = length(pos);
        
        float currentMatterRadius = revealRadius * 50.0 * (1.0 - returningProgress);
        if (dist > currentMatterRadius || dist < 1.0) {
            return baseColor;
        }
        
        float angle = atan(pos.y, pos.x);
        float trackCount = 16.0;
        float trackIndex = floor((angle + 3.14159) / (2.0 * 3.14159) * trackCount);
        
        float randomOffset = sin(trackIndex * 12.345) * 3.14159;
        float randomSpeed = 0.6 + sin(trackIndex * 6.789) * 0.6;
        
        float particleSpeed = 1.2 * randomSpeed;
        float particlePhase = dist * 0.12 + time * particleSpeed + randomOffset;
        
        float stripePattern = sin(particlePhase * 12.0);
        float stripe = smoothstep(-0.8, -0.2, stripePattern) * smoothstep(0.2, 0.8, -stripePattern);
        
        float centerFade = smoothstep(0.0, 8.0, dist);
        float edgeFade = smoothstep(currentMatterRadius, currentMatterRadius * 0.7, dist);
        float distanceFade = centerFade * edgeFade;
        
        float randomFlash = sin(time * 2.5 + trackIndex * 3.0 + randomOffset);
        float flashIntensity = smoothstep(0.4, 1.0, randomFlash) * 0.8;
        
        float globalPulse = sin(time * 1.5) * 0.2 + 0.8;
        float baseIntensity = 0.5;
        
        float finalIntensity = stripe * distanceFade * (baseIntensity + flashIntensity) * globalPulse;
        
        return mix(baseColor, particleColor * 1.5, finalIntensity);
    }
    
    void main() {
        if (animationCompleted == 1) {
            discard;
        }
        
        float distFromCenter = length(vLocalPos.xy);
        float normalizedDist = distFromCenter / 50.0;
        
        float alphaFade = 1.0;
        
        if (animationPhase >= 2 && isReturningWave == 1) {
            float currentMatterRadius = revealRadius * 50.0 * (1.0 - returningProgress);
            if (distFromCenter > currentMatterRadius) {
                discard;
            }
            float edgeDistance = currentMatterRadius - distFromCenter;
            float edgeZone = currentMatterRadius * 0.08;
            if (edgeDistance < edgeZone) {
                alphaFade *= smoothstep(0.0, edgeZone, edgeDistance);
            }
        } else {
            if (normalizedDist > revealRadius) {
                discard;
            }
            float edgeDistance = revealRadius - normalizedDist;
            float edgeZone = revealRadius * 0.05;
            if (edgeDistance < edgeZone) {
                alphaFade *= smoothstep(0.0, edgeZone, edgeDistance);
            }
        }
        
        alphaFade *= vEdgeFade;
        
        float heightFactor = (vWaveHeight + 1.0) * 0.5;
        float enhancedFactor = smoothstep(0.0, 1.0, heightFactor);
        enhancedFactor = enhancedFactor * enhancedFactor * (3.0 - 2.0 * enhancedFactor);
        
        // Water style with original colors
        vec3 waveColor = createWaterWaves(enhancedFactor, color, vLocalPos.xy, totalAnimationTime, vNormal);
        
        // Particle effects
        if (animationPhase == 2 && isReturningWave == 1) {
            if (interactionType == 1) {
                if (isEarthWave == 1) {
                    vec3 particleColor = vec3(0.2, 1.0, 0.3);
                    waveColor = createParticleEffect(waveColor, vLocalPos.xy, totalAnimationTime, particleColor);
                }
            } else {
                if (isEarthWave == 0) {
                    vec3 particleColor = vec3(0.3, 0.7, 1.0);
                    waveColor = createParticleEffect(waveColor, vLocalPos.xy, totalAnimationTime, particleColor);
                }
            }
        }
        
        if (vInteractionFactor > 0.01) {
            vec3 interactionColor = mix(waveColor, vec3(1.0, 1.0, 1.0), vInteractionFactor * 0.2);
            waveColor = interactionColor;
        }
        
        vec3 lightDir = normalize(vec3(1.0, 1.0, 2.0));
        float diffuse = max(0.3, dot(normalize(vNormal), lightDir) * 1.2);
        float ao = 1.0 - pow(abs(vWaveHeight) / 2.0, 0.5) * 0.3;
        diffuse *= ao;
        
        vec3 finalColor = waveColor * diffuse;
        
        float alpha = overallAlpha * alphaFade;
        
        if (animationPhase == 3 && isReturningWave == 0) {
            float smoothFade = smoothstep(0.0, 1.0, fadingProgress);
            smoothFade = smoothFade * smoothFade * (3.0 - 2.0 * smoothFade);
            alpha = overallAlpha * (1.0 - smoothFade) * alphaFade;
        }
        
        gl_FragColor = vec4(finalColor, alpha);
    }
`;


const WaveAnimation: React.FC<WaveAnimationProps> = ({
                                                         earthPosition,
                                                         targetPosition,
                                                         isActive,
                                                         interaction = 'positive',
                                                         onComplete,
                                                     }) => {
    const [waveGroup, setWaveGroup] = useState<THREE.Group | null>(null);
    const geometryCache = useRef<Map<string, THREE.PlaneGeometry>>(new Map());

    const animationRef = useRef({
        time: 0,
        earthWave: null as THREE.Mesh | null,
        targetWave: null as THREE.Mesh | null,
        state: {
            phase: 'expanding',
            expandingProgress: 0,
            returningProgress: 0,
            fadingProgress: 0,
            maxReachedRadius: 0,
            collisionStarted: false,
            earthWaveRadius: 0,
            targetWaveRadius: 0,
            animationCompleted: false,
        } as AnimationState,
        planetDistance: 0,
        collisionDistance: 0,
    });

    const positionsRef = useRef({
        earth: new THREE.Vector3(),
        target: new THREE.Vector3(),
        earthSize: 1.0,
        targetSize: 0.65,
        distance: 0,
    });

    const maxRevealRadius = 0.2;

    /**
     * Updates position references when coordinates change
     * Calculates the distance between planets for animation scaling
     */
    useEffect(() => {
        positionsRef.current.earth.set(earthPosition.x, earthPosition.y, earthPosition.z);
        positionsRef.current.target.set(targetPosition.x, targetPosition.y, targetPosition.z);

        positionsRef.current.distance = positionsRef.current.earth.distanceTo(positionsRef.current.target);
        animationRef.current.planetDistance = positionsRef.current.distance;
        animationRef.current.collisionDistance = positionsRef.current.distance * 0.6;
    }, [earthPosition, targetPosition]);

    /**
     * Retrieves or creates plane geometry with caching for performance
     * Prevents redundant geometry creation for similar sizes
     */
    const getPlaneGeometry = (size: number, segments: number = 128): THREE.PlaneGeometry => {
        const cacheKey = `${Math.floor(size * 100)}_${segments}`;
        if (geometryCache.current.has(cacheKey)) {
            return geometryCache.current.get(cacheKey) as THREE.PlaneGeometry;
        }
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        geometryCache.current.set(cacheKey, geometry);
        return geometry;
    };

    /**
     * Creates a wave plane mesh with shader material
     * Sets up position, uniforms, and metadata for the wave
     */
    const createWavePlane = (
        center: THREE.Vector3,
        initialSize: number,
        color: string,
        source: 'earth' | 'target'
    ): THREE.Mesh => {
        const startSize = Math.max(20, initialSize * 5);
        const geometry = getPlaneGeometry(startSize, 256);
        const baseColor = new THREE.Color(color);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                color: {value: baseColor},
                time: {value: 0.0},
                waveFrequency: {value: 40.0},
                waveAmplitude: {value: 0.35},
                innerRadius: {value: 0.7},
                revealRadius: {value: 0.0},
                otherCenter: {
                    value: source === 'earth' ?
                        positionsRef.current.target : positionsRef.current.earth
                },
                otherWaveRadius: {value: 0.0},
                interactionType: {value: interaction === 'positive' ? 1 : -1},
                isEarthWave: {value: source === 'earth' ? 1 : 0},
                totalAnimationTime: {value: 0.0},
                overallAlpha: {value: 0.5},
                returningProgress: {value: 0.0},
                fadingProgress: {value: 0.0},
                animationPhase: {value: 0},
                isReturningWave: {value: 0},
                animationCompleted: {value: 0},
            },
            vertexShader: WAVE_VERTEX_SHADER,
            fragmentShader: WAVE_FRAGMENT_SHADER,
            side: THREE.DoubleSide,
            transparent: true,
            wireframe: false,
        });

        const plane = new THREE.Mesh(geometry, material);
        plane.position.copy(center);
        plane.rotation.x = -Math.PI / 2;

        plane.userData = {
            initialSize: startSize,
            currentSize: startSize,
            source: source
        } as WaveUserData;

        return plane;
    };

    /**
     * Calculates animation speed based on planet distance
     * Creates smoother animations at various scales
     */
    const calculateAdaptiveSpeed = (distance: number, baseSpeed: number): number => {
        const speedMultiplier = Math.pow(distance / 15.0, 1.5);
        return baseSpeed * Math.max(0.001, Math.min(1.5, speedMultiplier));
    };

    /**
     * Animation loop that runs every frame when the component is active
     * Manages animation phases, wave propagation, and interactions
     */
    useFrame((_, delta) => {
        if (!isActive || !waveGroup) return;

        // Calculate adaptive speeds based on distance between planets
        const distance = animationRef.current.planetDistance;
        const adaptiveWaveSpeed = calculateAdaptiveSpeed(distance, 0.16);
        const adaptiveReturnSpeed = calculateAdaptiveSpeed(distance, 0.10);
        const adaptiveContinueSpeed = calculateAdaptiveSpeed(distance, 0.12);
        const adaptiveFadeSpeed = 1.5;

        animationRef.current.time += delta;
        const time = animationRef.current.time;
        const state = animationRef.current.state;

        if (state.phase === 'expanding') {
            const visualRadiusGrowth = delta * adaptiveWaveSpeed;
            state.expandingProgress += visualRadiusGrowth;

            const currentScale = 1 + state.expandingProgress * 2;
            const currentVisualRadius = Math.min(state.expandingProgress * maxRevealRadius, maxRevealRadius);
            const currentWorldRadius = currentVisualRadius * 50.0 * currentScale;

            state.earthWaveRadius = currentWorldRadius;
            state.targetWaveRadius = currentWorldRadius;

            if (state.earthWaveRadius >= animationRef.current.collisionDistance && !state.collisionStarted) {
                state.phase = 'collision';
                state.collisionStarted = true;
                state.maxReachedRadius = state.expandingProgress;
                state.phase = 'returning';
            }
        } else if (state.phase === 'returning') {
            state.returningProgress += delta * adaptiveReturnSpeed;
            state.expandingProgress += delta * adaptiveContinueSpeed;

            if (state.returningProgress >= 1.0) {
                state.returningProgress = 1.0;
                state.phase = 'fading';
            }
        } else if (state.phase === 'fading') {
            state.fadingProgress += delta * adaptiveFadeSpeed;
            state.expandingProgress += delta * adaptiveContinueSpeed * 0.5;

            if (state.fadingProgress >= 1.0) {
                state.fadingProgress = 1.0;
                state.phase = 'complete';
                state.animationCompleted = true;
                setTimeout(() => onComplete?.(), 100);
            }
        }

        /**
         * Updates shader uniforms for a single wave mesh
         * Handles phase transitions and interaction effects
         */
        const updateWave = (wave: THREE.Mesh | null, otherWave: THREE.Mesh | null) => {
            if (wave && 'material' in wave) {
                const material = wave.material as THREE.ShaderMaterial;
                const userData = wave.userData as WaveUserData;

                material.uniforms.time.value = time;
                material.uniforms.totalAnimationTime.value = time;
                material.uniforms.animationCompleted.value = state.animationCompleted ? 1 : 0;

                const isReturningWave = (interaction === 'positive' && userData.source === 'earth') ||
                    (interaction === 'negative' && userData.source === 'target');

                let shaderPhase = 0;
                if (state.phase === 'expanding') shaderPhase = 0;
                else if (state.phase === 'collision') shaderPhase = 1;
                else if (state.phase === 'returning') shaderPhase = 2;
                else if (state.phase === 'fading') shaderPhase = 3;

                material.uniforms.animationPhase.value = shaderPhase;
                material.uniforms.isReturningWave.value = isReturningWave ? 1 : 0;
                material.uniforms.returningProgress.value = state.returningProgress;

                let scale: number;

                if (isReturningWave) {
                    if (state.phase === 'expanding') {
                        scale = 1 + state.expandingProgress * 2;
                    } else {
                        scale = 1 + state.maxReachedRadius * 2;
                    }
                } else {
                    scale = 1 + state.expandingProgress * 2;
                }
                wave.scale.setScalar(scale);

                let revealRadius = Math.min(state.expandingProgress * maxRevealRadius, maxRevealRadius);

                material.uniforms.revealRadius.value = revealRadius;

                if (!isReturningWave) {
                    material.uniforms.fadingProgress.value = state.fadingProgress;
                }

                if (otherWave) {
                    const otherUserData = otherWave.userData as WaveUserData;
                    const otherRadius = otherUserData.initialSize * otherWave.scale.x / 2;
                    material.uniforms.otherWaveRadius.value = otherRadius * revealRadius / maxRevealRadius;
                }
            }
        };

        updateWave(animationRef.current.earthWave, animationRef.current.targetWave);
        updateWave(animationRef.current.targetWave, animationRef.current.earthWave);
    });

    /**
     * Sets up the animation when activated
     * Creates wave planes and initializes the animation state
     * Cleans up resources when the component unmounts
     */
    useEffect(() => {
        if (!isActive) return;

        const group = new THREE.Group();
        setWaveGroup(group);

        // Wave colors based on interaction type
        const earthWaveColor = '#0066ff'; // Blue for Earth wave
        const targetWaveColor = interaction === 'positive' ? '#00ff00' : '#ff0000'; // Green or red

        const earthWave = createWavePlane(
            positionsRef.current.earth,
            positionsRef.current.earthSize,
            earthWaveColor,
            'earth'
        );
        group.add(earthWave);

        const targetWave = createWavePlane(
            positionsRef.current.target,
            positionsRef.current.targetSize,
            targetWaveColor,
            'target'
        );
        group.add(targetWave);

        animationRef.current = {
            time: 0,
            earthWave: earthWave,
            targetWave: targetWave,
            state: {
                phase: 'expanding',
                expandingProgress: 0,
                returningProgress: 0,
                fadingProgress: 0,
                maxReachedRadius: 0,
                collisionStarted: false,
                earthWaveRadius: 0,
                targetWaveRadius: 0,
                animationCompleted: false,
            },
            planetDistance: animationRef.current.planetDistance,
            collisionDistance: animationRef.current.collisionDistance,
        };

        // Cleanup function to dispose resources
        return () => {
            if (waveGroup) {
                waveGroup.children.forEach((child) => {
                    if ('geometry' in child && child.geometry) {
                        const userData = child.userData as WaveUserData;
                        const cacheKey = `${Math.floor(userData?.currentSize * 100)}_64`;
                        if (!geometryCache.current.has(cacheKey)) {
                            (child.geometry as THREE.BufferGeometry).dispose();
                        }
                    }
                    if ('material' in child && child.material) {
                        (child.material as THREE.Material).dispose();
                    }
                });
            }

            geometryCache.current.forEach((geometry) => geometry.dispose());
            geometryCache.current.clear();
        };
    }, [isActive, interaction]);

    if (!isActive || !waveGroup) {
        return null;
    }

    return <primitive object={waveGroup}/>;
};

export default React.memo(WaveAnimation);