/**
 * A component that handles celestial body animations in a 3D space
 *
 * This component manages the complete animation lifecycle for planetary orbits:
 * - Calculates interpolated positions between dates for smooth motion
 * - Controls animation timing and synchronization
 * - Transforms heliocentric coordinates to geocentric visualization
 * - Manages Earth texture state changes for special effects
 * - Provides position data to child components and external subscribers
 */

import React, {useState, useRef, useEffect, useCallback} from 'react';
import {useFrame} from '@react-three/fiber/native';
import CelestialBody from './CelestialBody';
import * as THREE from 'three';
import {PlanetDataByDate, CelestialBodyConfig} from '../types';
import {
    calculateCelestialPosition,
    transformToGeocentricVisualization
} from '../utils/orbitalCalculations';

/**
 * Earth texture states for visual transitions during interactions
 */
enum EarthTextureState {
    NORMAL = 'normal',
    QUANTUM = 'quantum',
    RESTORING = 'restoring'
}

/**
 * Positions of all planets in the current animation frame
 */
interface PlanetPositions {
    [key: string]: {
        x: number;
        y: number;
        z: number;
    };
}

interface AnimationHandlerProps {
    startDate: string;                // Animation start date
    endDate: string;                  // Animation end date
    animationDuration: number;        // Duration in seconds
    onDateChange: (date: Date) => void; // Callback for current date updates
    planetDataByDate: PlanetDataByDate; // Orbital data for all planets by date
    celestialBodies: CelestialBodyConfig[]; // Configuration for visual representation
    isAnimationActive: boolean;       // Whether animation is currently running
    setIsAnimationActive: React.Dispatch<React.SetStateAction<boolean>>;
    onTextureChange?: () => void;     // Callback for Earth texture changes
    selectedPlanet?: string;          // Currently selected planet for highlighting
    influence?: 'positive' | 'negative'; // Type of planetary interaction
    isBrainAnimationFinished?: boolean; // Brain animation completion flag for texture sync
    onPositionUpdate?: (name: string, position: { x: number; y: number; z: number }) => void;
    readyToAnimate: boolean;          // Whether all resources are loaded and ready
    preloadedTextures?: { [key: string]: THREE.Texture }; // Pre-loaded texture maps
    restoreEarthTexture?: boolean;    // Flag to restore Earth's texture to normal
    onFramesRendered?: (frames: number) => void; // Callback for tracking rendered frames
}

const AnimationHandler: React.FC<AnimationHandlerProps> = ({
                                                               startDate,
                                                               endDate,
                                                               animationDuration,
                                                               onDateChange,
                                                               planetDataByDate,
                                                               celestialBodies,
                                                               isAnimationActive,
                                                               setIsAnimationActive,
                                                               onTextureChange,
                                                               selectedPlanet,
                                                               isBrainAnimationFinished,
                                                               onPositionUpdate,
                                                               preloadedTextures,
                                                               readyToAnimate,
                                                               restoreEarthTexture,
                                                               onFramesRendered,
                                                           }) => {
    // Animation date boundaries and duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalMs = end.getTime() - start.getTime();

    // State for planet positions and animation status
    const [currentDate, setCurrentDate] = useState(new Date(start));
    const [allPlanetPositions, setAllPlanetPositions] = useState<PlanetPositions>({});
    const [isAnimationComplete, setIsAnimationComplete] = useState(false);
    const [earthTextureState, setEarthTextureState] = useState<EarthTextureState>(EarthTextureState.NORMAL);

    // Refs for internal animation tracking
    const currentDateRef = useRef(new Date(start));
    const lastDateUpdateRef = useRef(0);
    const frameCountRef = useRef(0);
    const hasStartedRef = useRef(false);
    const accumulatedMsRef = useRef(0);

    // Cache for last calculated target positions for smooth micro-interpolation
    const cachedPositionsRef = useRef<{
        [key: string]: {
            target: { x: number, y: number, z: number },
            current: { x: number, y: number, z: number },
            velocity: { x: number, y: number, z: number }
        }
    }>({});

    // Find Earth's index for quick access
    const earthIndex = celestialBodies.findIndex((body) => body.name === 'Earth');

    /**
     * Handle Earth texture restoration when requested
     */
    useEffect(() => {
        if (restoreEarthTexture && earthTextureState !== EarthTextureState.NORMAL) {
            setEarthTextureState(EarthTextureState.RESTORING);
        }
    }, [restoreEarthTexture, earthTextureState]);

    /**
     * Change Earth texture when brain animation completes
     */
    useEffect(() => {
        if (isBrainAnimationFinished && earthTextureState === EarthTextureState.NORMAL) {
            setEarthTextureState(EarthTextureState.QUANTUM);
        }
    }, [isBrainAnimationFinished, earthTextureState]);

    /**
     * Calculates smoothly interpolated planet position between daily data points
     * Provides sub-day precision for animations
     *
     * @param planetIndex Index of the planet in celestialBodies array
     * @param exactDate Precise date and time for interpolation
     * @returns Interpolated 3D position or null if data is unavailable
     */
    const calculateInterpolatedPosition = useCallback((
        planetIndex: number,
        exactDate: Date
    ): { x: number; y: number; z: number } | null => {
        // Get date strings for current and next day
        const currentDateStr = exactDate.toISOString().split('T')[0];
        const nextDate = new Date(exactDate);
        nextDate.setDate(exactDate.getDate() + 1);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        // Check if we have orbital data for the current day
        if (!planetDataByDate[currentDateStr] ||
            !planetDataByDate[currentDateStr][planetIndex]) {
            return null;
        }

        // Calculate position for current day
        const currentDayData = planetDataByDate[currentDateStr][planetIndex];
        const currentPos = calculateCelestialPosition(currentDayData);

        // If no data for next day or dates are the same, return current position
        if (!planetDataByDate[nextDateStr] ||
            !planetDataByDate[nextDateStr][planetIndex] ||
            nextDateStr === currentDateStr) {
            return currentPos;
        }

        // Calculate position for next day
        const nextDayData = planetDataByDate[nextDateStr][planetIndex];
        const nextPos = calculateCelestialPosition(nextDayData);

        // Calculate progress through the day (0-1)
        const startOfDay = new Date(currentDateStr).getTime();
        const endOfDay = new Date(nextDateStr).getTime();
        const progress = (exactDate.getTime() - startOfDay) / (endOfDay - startOfDay);

        // Linear interpolation between positions
        return {
            x: currentPos.x + (nextPos.x - currentPos.x) * progress,
            y: currentPos.y + (nextPos.y - currentPos.y) * progress,
            z: currentPos.z + (nextPos.z - currentPos.z) * progress
        };
    }, [planetDataByDate]);

    /**
     * Wrapper for geocentric visualization transformation
     */
    const transformPlanetPosition = useCallback((
        bodyName: string,
        position: { x: number; y: number; z: number },
        earthPosition: { x: number; y: number; z: number }
    ) => {
        return transformToGeocentricVisualization(bodyName, position, earthPosition);
    }, []);

    /**
     * Main animation frame handler
     * Updates positions on each frame for maximum smoothness
     * Using consistent coordinate transformation for all celestial bodies
     */
    useFrame((_, delta) => {
         // Exit early if system is not ready or no time span to animate
         if (!readyToAnimate || totalMs <= 0) return;

        // Use delta from react-three-fiber for consistent frame time
        const deltaTime = Math.min(delta, 0.1);

        // Active planet animation processing
        if (isAnimationActive) {
            // Initialize accumulator on first run
            if (!hasStartedRef.current) {
                hasStartedRef.current = true;
                accumulatedMsRef.current = 0; // reset accumulated time
            }
            // Accumulate scaled deltaTime
            accumulatedMsRef.current += deltaTime * 1000;
            const elapsedFactor = accumulatedMsRef.current / (animationDuration * 1000);
            let elapsedMs = Math.min(elapsedFactor * totalMs, totalMs);
            // Handle final boundary: if reached or exceeded, finalize animation
            if (elapsedMs >= totalMs) {
                // Ensure exact end date
                const finalDate = new Date(end.getTime());
                currentDateRef.current = finalDate;
                setCurrentDate(finalDate);
                onDateChange(finalDate);
                setAllPlanetPositions(prev => ({...prev}));
                setIsAnimationActive(false);
                setIsAnimationComplete(true);
                if (onTextureChange) onTextureChange();
                return;
            }

            const exactDate = new Date(start.getTime() + elapsedMs);
            currentDateRef.current = exactDate;

            // Update UI date display at 10fps for smooth appearance
            // while keeping animation running at full framerate
            const now = Date.now();
            if (now - lastDateUpdateRef.current > 100) { // 10 times per second
                setCurrentDate(exactDate);
                onDateChange(exactDate);
                lastDateUpdateRef.current = now;
            }

            // Handle animation completion
            if (elapsedMs >= totalMs) {
                setAllPlanetPositions(prevPositions => {
                    return {...prevPositions};
                });
                setIsAnimationActive(false);
                setIsAnimationComplete(true);
                if (onTextureChange) onTextureChange();
                return;
            }

            // --- CENTRALIZED POSITION CALCULATION FOR ALL PLANETS ---

            // 1. Calculate Earth's position for reference
            const earthResult = calculateInterpolatedPosition(earthIndex, exactDate);
            const earthOriginalPosition = earthResult || {x: 0, y: 0, z: 0};

            // 2. Create new positions object by transforming ALL celestial bodies
            const newTargetPositions: PlanetPositions = {};
            const newSmoothedPositions: PlanetPositions = {};

            // 3. Calculate positions for ALL celestial bodies using the same transformation
            celestialBodies.forEach((body, index) => {
                // Get planet position (or use Earth's position for Earth)
                const planetResult = index === earthIndex
                    ? earthOriginalPosition
                    : calculateInterpolatedPosition(index, exactDate);

                // Transform ALL bodies using the same function
                // This function already handles special cases for Earth and Sun
                const newTargetPos = transformPlanetPosition(
                    body.name,
                    planetResult || {x: 0, y: 0, z: 0}, // Safe default if data is missing
                    earthOriginalPosition
                );

                newTargetPositions[body.name] = newTargetPos;

                // Initialize position cache for the body if it does not exist yet
                if (!cachedPositionsRef.current[body.name]) {
                    cachedPositionsRef.current[body.name] = {
                        target: newTargetPos,
                        current: newTargetPos,
                        velocity: {x: 0, y: 0, z: 0}
                    };
                } else {
                    // Update the target position
                    cachedPositionsRef.current[body.name].target = newTargetPos;
                }

                // Apply spring-damper physics model for smooth movement
                const cached = cachedPositionsRef.current[body.name];
                const current = cached.current;
                const target = cached.target;
                const velocity = cached.velocity;

                // Calculate smoothing coefficients
                // Smaller bodies move more smoothly
                const bodySize = body.size;
                const speedFactor = Math.min(0.8, 0.2 + bodySize * 0.15);
                const stiffness = 2.8 + (body.name === 'Sun' ? 1.0 : 0); // Sun is stiffer
                const damping = 0.8 - (bodySize * 0.02);

                // Spring-damper animation model: F = k*x - c*v
                const springForceX = (target.x - current.x) * stiffness;
                const springForceY = (target.y - current.y) * stiffness;
                const springForceZ = (target.z - current.z) * stiffness;

                // Update velocities with the physics model
                velocity.x = velocity.x * damping + springForceX * deltaTime * speedFactor;
                velocity.y = velocity.y * damping + springForceY * deltaTime * speedFactor;
                velocity.z = velocity.z * damping + springForceZ * deltaTime * speedFactor;

                // Update current positions
                current.x += velocity.x;
                current.y += velocity.y;
                current.z += velocity.z;

                // Save smoothed position
                newSmoothedPositions[body.name] = {
                    x: current.x,
                    y: current.y,
                    z: current.z
                };
            });

            // Update positions on every frame for maximum smoothness
            setAllPlanetPositions(newSmoothedPositions);

            // Notify external components of position updates
            if (onPositionUpdate) {
                Object.entries(newSmoothedPositions).forEach(([name, pos]) => {
                    onPositionUpdate(name, pos);
                });
            }

            // Increment frame counter and call callback if provided
            frameCountRef.current += 1;
            if (onFramesRendered) {
                onFramesRendered(frameCountRef.current);
            }
        } else if (isAnimationComplete) {
            // After animation is complete, continue to update external components
            if (onPositionUpdate && Object.keys(allPlanetPositions).length > 0) {
                // Use already calculated final positions, no interpolation
                Object.entries(allPlanetPositions).forEach(([name, pos]) => {
                    onPositionUpdate(name, pos);
                });
            }
        }
    });

    // Initialize Earth at center if no position data is available yet
    const hasPositions = Object.keys(allPlanetPositions).length > 0;
    if (!hasPositions && !isAnimationComplete && readyToAnimate) {
        setAllPlanetPositions({'Earth': {x: 0, y: 0, z: 0}});
    }

    return (
        <>
            {/* Render all celestial bodies with pre-calculated positions */}
            {celestialBodies.map((body) => (
                <CelestialBody
                    key={body.name}
                    name={body.name}
                    position={allPlanetPositions[body.name] || {x: 0, y: 0, z: 0}}
                    color={body.color}
                    size={body.size}
                    isAnimationActive={isAnimationActive}
                    changeTexture={body.name === 'Earth' ? earthTextureState : undefined}
                    selectedPlanet={selectedPlanet}
                    preloadedTextures={preloadedTextures}
                />
            ))}
        </>
    );
};

export default AnimationHandler;
