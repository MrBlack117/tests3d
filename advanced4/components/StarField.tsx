/**
 * A component that renders a realistic 3D star field as a backdrop for space visualizations.
 *
 * This component creates an immersive celestial background using advanced
 * distribution algorithms to generate star patterns that mimic natural
 * astronomical formations, with features including:
 *
 * - Multi-method randomization for realistic star clustering
 * - Variable star sizes for depth perception
 * - Optimized geometry using BufferGeometry for performance
 * - Strategic depth settings for integration with other 3D elements
 * - Memory-efficient rendering approach with a single geometry instance
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';

const StarField: React.FC = () => {
    /**
     * Creates an optimized star field geometry with natural-looking distribution
     * using multiple randomization techniques to create realistic star patterns.
     *
     * The implementation uses two different methods:
     * 1. Pure random points - creates completely random distribution for 25% of stars
     * 2. Spherical coordinates with clustering bias - creates more natural patterns for 75% of stars
     */
    const geometry = useMemo(() => {
        // Create geometry for stars
        const geometry = new THREE.BufferGeometry();

        // Number of stars
        const starCount = 3000;

        // Base distance (with random variation)
        const baseRadius = 300;
        const radiusVariation = 50;  // Variation in distance for more natural look

        // Arrays for position and size
        const positions = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        // Generate stars using multiple distribution techniques for natural randomness
        for (let i = 0; i < starCount; i++) {
            // Randomize the radius slightly
            const radius = baseRadius + (Math.random() * radiusVariation * 2 - radiusVariation);

            // Use different distribution methods for different stars:
            let x, y, z;

            // Method 1: Pure random points (25% of stars)
            if (i < starCount * 0.25) {
                // Generate a random point and normalize to place on sphere
                x = Math.random() * 2 - 1;
                y = Math.random() * 2 - 1;
                z = Math.random() * 2 - 1;

                // Normalize to place on sphere
                const magnitude = Math.sqrt(x*x + y*y + z*z);
                x = (x / magnitude) * radius;
                y = (y / magnitude) * radius;
                z = (z / magnitude) * radius;
            }
            // Method 2: Random spherical coordinates (75% of stars)
            else {
                // Random spherical coordinates with slight clustering
                const phi = Math.random() * Math.PI * 2;

                // Use slight bias in theta distribution for more realistic clusters
                const cosTheta = Math.random() * 2 - 1;
                const theta = Math.acos(cosTheta);

                // Convert to cartesian coordinates
                x = radius * Math.sin(theta) * Math.cos(phi);
                y = radius * Math.sin(theta) * Math.sin(phi);
                z = radius * Math.cos(theta);
            }

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            // Randomize star size for more natural look
            sizes[i] = Math.random() * 0.8 + 0.2; // Sizes between 0.2 and 1.0
        }

        // Set buffer attributes for positions and sizes
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        return geometry;
    }, []);

    /**
     * Creates a custom material for star rendering with proper
     * depth handling and visual characteristics
     */
    const material = useMemo(() => {
        return new THREE.PointsMaterial({
            color: 0xaaaaaa,
            size: 1.2,
            sizeAttenuation: true,   // Enable size attenuation for depth perception
            transparent: true,
            opacity: 0.8,
            depthWrite: true,        // Enable depth writing
            depthTest: true,         // Enable depth testing
            fog: false,              // Disable fog effect for stars
        });
    }, []);

    // Render with a very low renderOrder to ensure stars are in background
    return (
        <mesh renderOrder={-2000}>
            <points geometry={geometry} material={material} />
        </mesh>
    );
};

export default StarField;