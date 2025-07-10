/**
 * Utility module for astronomical calculations in the solar system visualization.
 *
 * This module provides functions for calculating celestial body positions using
 * Keplerian orbital elements and converting between coordinate systems.
 * It implements core astronomical algorithms including:
 * - Kepler's equation solver with iterative approximation
 * - Coordinate transformations between orbital and reference frames
 * - Geocentric position calculations for Earth-centered visualization
 *
 * These calculations form the mathematical foundation for realistic
 * planetary motion in the simulation.
 */

import * as THREE from 'three';
import { PlanetData } from '../types';

// Orbit correction factors for better visualization
// Without these factors, outer planets would be very far from center
export const orbitCorrectionMap = {
    sun: 1,
    mercury: 1,
    venus: 1,
    earth: 1,
    mars: 1,
    jupiter: 1.7,  // Jupiter and outer planets are compressed toward center
    saturn: 3.2,   // for better visualization
    uranus: 4.0,
    neptune: 5,
} as const;

export type OrbitCorrectionKey = keyof typeof orbitCorrectionMap;

/**
 * Calculates celestial body position using Keplerian orbital elements.
 *
 * This function implements the core astronomical calculations:
 * 1. Calculates mean anomaly (M) based on orbital period and elapsed time
 * 2. Solves Kepler's equation to find eccentric anomaly (E)
 * 3. Calculates true anomaly and radius vector
 * 4. Transforms coordinates from orbital plane to heliocentric system
 *
 * @param data Orbital elements of the celestial body
 * @param elapsedDays Days elapsed since epoch
 * @returns Heliocentric coordinates {x, y, z}
 */
export function calculateCelestialPosition(
    data: PlanetData,
    elapsedDays: number = 0
): { x: number; y: number; z: number } {
    // Calculate mean anomaly (M) in radians, adjusting for elapsed time
    const n = (2 * Math.PI) / data.T;
    const M = THREE.MathUtils.degToRad(data.M0) + n * elapsedDays;

    // Solve Kepler's equation for eccentric anomaly (E)
    // Using iterative approximation with improved convergence approach
    let E = M; // Initial approximation
    let prevE = E - 1; // Ensure first iteration runs
    const tolerance = 1e-6; // Convergence tolerance
    const maxIterations = 10;
    let iterations = 0;

    while (Math.abs(E - prevE) > tolerance && iterations < maxIterations) {
        prevE = E;
        E = M + data.e * Math.sin(E);
        iterations++;
    }

    // Calculate true anomaly (f)
    const f = 2 * Math.atan(Math.sqrt((1 + data.e) / (1 - data.e)) * Math.tan(E / 2));
    // Calculate radius vector (r)
    const r = data.a * (1 - data.e * Math.cos(E));

    // Trigonometric constants for coordinate transformation
    const cosOM = Math.cos(THREE.MathUtils.degToRad(data.om));
    const sinOM = Math.sin(THREE.MathUtils.degToRad(data.om));
    const cosW = Math.cos(THREE.MathUtils.degToRad(data.w));
    const sinW = Math.sin(THREE.MathUtils.degToRad(data.w));
    const cosI = Math.cos(THREE.MathUtils.degToRad(data.i));
    const sinI = Math.sin(THREE.MathUtils.degToRad(data.i));

    // Intermediate coordinates in orbital plane
    const x_prime = r * (cosW * Math.cos(f) - sinW * Math.sin(f));
    const y_prime = r * (sinW * Math.cos(f) + cosW * Math.sin(f));
    const z_prime = r * Math.sin(f) * sinI;

    // Final coordinates in heliocentric system
    const x = x_prime * cosOM - y_prime * sinOM;
    const y = x_prime * sinOM + y_prime * cosOM;
    const z = z_prime * cosI;

    return {x, y, z};
}

/**
 * Visualization scale factor - reduces real astronomical distances
 * to reasonable proportions for screen display while maintaining
 * relative positioning.
 */
export const ORBIT_VISUALIZATION_SCALE = 0.00000009;

/**
 * Transforms heliocentric coordinates to geocentric (Earth-centered)
 * visualization coordinates with appropriate scaling and corrections.
 *
 * Handles special cases for Earth (always at center) and
 * Sun (positioned opposite to Earth). For other planets, applies
 * orbit correction factors to create a more balanced visual representation.
 *
 * @param bodyName Name of celestial body
 * @param position Heliocentric position of the body
 * @param earthPosition Heliocentric position of Earth
 * @returns Transformed and scaled coordinates for visualization
 */
export function transformToGeocentricVisualization(
    bodyName: string,
    position: {x: number, y: number, z: number},
    earthPosition: {x: number, y: number, z: number}
): {x: number, y: number, z: number} {
    // Earth is always at the center of our visualization
    if (bodyName === 'Earth') {
        return {x: 0, y: 0, z: 0};
    }

    // Sun is positioned opposite to Earth (inverse of Earth's position)
    if (bodyName === 'Sun') {
        const geoX = -earthPosition.x * ORBIT_VISUALIZATION_SCALE;
        const geoY = -earthPosition.y * ORBIT_VISUALIZATION_SCALE;
        const geoZ = -earthPosition.z * ORBIT_VISUALIZATION_SCALE;

        // Swap Y and Z for horizontal orbital display
        return {x: geoX, y: 0, z: geoY};
    }

    // For other planets, apply orbit correction factors for better visualization
    const correctionKey = bodyName.toLowerCase() as OrbitCorrectionKey;
    const correctionFactor = orbitCorrectionMap[correctionKey] || 1;

    // Calculate geocentric coordinates (relative to Earth)
    const geoX = (position.x - earthPosition.x) * ORBIT_VISUALIZATION_SCALE / correctionFactor;
    const geoY = (position.y - earthPosition.y) * ORBIT_VISUALIZATION_SCALE / correctionFactor;
    const geoZ = (position.z - earthPosition.z) * ORBIT_VISUALIZATION_SCALE / correctionFactor;

    // Swap Y and Z axes for horizontal orbital display
    return {x: geoX, y: geoZ, z: geoY};
}

/**
 * Interpolates between two sets of orbital elements for smooth transitions
 * Properly handles angular values to prevent discontinuities
 *
 * @param startData Starting orbital elements
 * @param endData Ending orbital elements
 * @param progress Interpolation factor (0-1)
 * @returns Interpolated orbital elements
 */
export function interpolateOrbitalElements(
    startData: PlanetData,
    endData: PlanetData,
    progress: number
): PlanetData {
    // Special function for interpolating angles (prevents jumps when crossing 360°)
    const interpolateAngle = (a1: number, a2: number, t: number) => {
        // Find shortest path between angles
        let diff = (a2 - a1) % 360;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        return (a1 + diff * t) % 360;
    };

    return {
        a: startData.a + progress * (endData.a - startData.a),
        e: startData.e + progress * (endData.e - startData.e),
        i: interpolateAngle(startData.i, endData.i, progress),
        om: interpolateAngle(startData.om, endData.om, progress),
        w: interpolateAngle(startData.w, endData.w, progress),
        M0: interpolateAngle(startData.M0, endData.M0, progress),
        T: startData.T + progress * (endData.T - startData.T)
    };
}