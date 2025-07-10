/**
 * Manages automatic camera movements and transitions throughout the solar system visualization.
 * Positions the camera strategically based on the current animation state to provide
 * optimal viewing angles for each phase of the experience.
 *
 * Uses GSAP for smooth camera animations between different states:
 * - Planet orbits view
 * - Brain animation close-up
 * - Wave animation between planets
 * - Final overview position
 */

import React, {useEffect, useRef} from "react";
import * as THREE from "three";
import {OrbitControls as OrbitControlsType} from "three-stdlib/controls/OrbitControls";
import {useFrame, useThree} from "@react-three/fiber";
import gsap from "gsap";

interface CameraControllerProps {
    cameraMode: 'auto' | 'manual';
    isAnimationActive: boolean;
    startBrainAnimation: boolean;
    isBrainAnimationFinished: boolean;
    waveStage: 'none' | 'active';
    earthPos: { x: number; y: number; z: number };
    targetPos: { x: number; y: number; z: number };
    initialCameraPosition: [number, number, number];
    selectedPlanet?: string;
}

// Camera controller component
const CameraController: React.FC<CameraControllerProps> = ({
                                                               cameraMode,
                                                               isAnimationActive,
                                                               startBrainAnimation,
                                                               isBrainAnimationFinished,
                                                               waveStage,
                                                               earthPos,
                                                               targetPos,
                                                               initialCameraPosition,
                                                               selectedPlanet
                                                           }) => {
    const {camera, controls} = useThree();
    const animationState = useRef<string>("initial");
    const orbitControls = controls as OrbitControlsType | undefined;

    // Calculate distance between Earth and target planet
    const distanceToTarget = useRef<number>(0);

    // Update distance calculation when positions change
    useEffect(() => {
        if (earthPos && targetPos && selectedPlanet) {
            distanceToTarget.current = Math.sqrt(
                Math.pow(targetPos.x - earthPos.x, 2) +
                Math.pow(targetPos.y - earthPos.y, 2) +
                Math.pow(targetPos.z - earthPos.z, 2)
            );
        }
    }, [earthPos, targetPos, selectedPlanet]);

    // Main camera animation loop - check current state and transition camera accordingly
    useFrame(() => {
        if (!camera || !orbitControls || cameraMode !== 'auto') return;

        // PHASE 1: Planet orbital animation view
        if (isAnimationActive && animationState.current !== "planets") {
            animationState.current = "planets";

            // Calculate optimal camera distance based on target planet's distance
            const distanceFactor = Math.max(2, Math.min(4, distanceToTarget.current * 100));

            // Position camera to see horizontal orbital plane with slight elevation
            gsap.to(camera.position, {
                x: initialCameraPosition[0] * distanceFactor * 0.6,
                y: initialCameraPosition[1] * 0.8, // Keep some height for perspective
                z: initialCameraPosition[2] * distanceFactor * 0.6,
                duration: 3,
                ease: 'power2.out',
            });

            // Keep focus on Earth (center)
            gsap.to(orbitControls.target, {
                x: 0,
                y: 0,
                z: 0,
                duration: 2.5,
                ease: 'power2.out',
                onUpdate: () => orbitControls.update()
            });
        }
        // PHASE 2: Brain animation close-up view
        else if (startBrainAnimation && !isBrainAnimationFinished && animationState.current !== "brain") {
            animationState.current = "brain";

            // Zoom in on the head for brain animation
            gsap.to(camera.position, {
                x: initialCameraPosition[0] * 0.3,
                y: initialCameraPosition[1] * 0.4,
                z: initialCameraPosition[2] * 0.3,
                duration: 2.5,
                ease: 'power2.inOut',
            });

            // Keep focus on brain/Earth center
            gsap.to(orbitControls.target, {
                x: 0,
                y: 0,
                z: 0,
                duration: 2,
                ease: 'power2.inOut',
                onUpdate: () => orbitControls.update()
            });
        }
        // PHASE 3: Wave animation view - between Earth and target planet
        else if (waveStage === 'active' && animationState.current !== "waves") {
            animationState.current = "waves";

            // Create a midpoint between Earth and target planet for camera focus
            const midPoint = new THREE.Vector3().lerpVectors(
                new THREE.Vector3(earthPos.x, earthPos.y, earthPos.z),
                new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z),
                0.5
            );

            // Calculate distance between planets to determine optimal camera position
            const planetsDistance = new THREE.Vector3(
                targetPos.x - earthPos.x,
                targetPos.y - earthPos.y,
                targetPos.z - earthPos.z
            ).length();

            // Ensure camera is far enough to see both planets clearly
            const cameraDistance = Math.max(planetsDistance * 2.5, 30);

            // Position camera to see both planets and the wave effect between them
            gsap.to(camera.position, {
                x: midPoint.x + cameraDistance * 0.7,
                y: midPoint.y + cameraDistance * 0.5,
                z: midPoint.z + cameraDistance * 0.7,
                duration: 3,
                ease: 'power2.inOut',
            });

            // Focus on the midpoint between planets
            gsap.to(orbitControls.target, {
                x: midPoint.x,
                y: midPoint.y,
                z: midPoint.z,
                duration: 2.5,
                ease: 'power2.inOut',
                onUpdate: () => orbitControls.update()
            });
        }
        // PHASE 4: Final overview position after all animations complete
        else if (waveStage === 'none' && isBrainAnimationFinished && animationState.current !== "final") {
            animationState.current = "final";

            // Reset to a balanced overview position
            gsap.to(camera.position, {
                x: initialCameraPosition[0] * 0.8,
                y: initialCameraPosition[1] * 0.8,
                z: initialCameraPosition[2] * 0.8,
                duration: 3,
                ease: 'power2.inOut',
            });

            // Focus back on Earth/center
            gsap.to(orbitControls.target, {
                x: 0,
                y: 0,
                z: 0,
                duration: 2.5,
                ease: 'power2.inOut',
                onUpdate: () => orbitControls.update()
            });
        }

        // Ensure controls are updated each frame
        orbitControls.update();
    });

    return null;
};

export default CameraController;