/**
 * A utility component that prepares the 3D scene for rendering.
 * Optimizes initial load performance by pre-compiling shaders and materials
 * before animation begins, reducing potential lag when the scene first renders.
 *
 * Key functions:
 * - Pre-compiles scene materials and shaders
 * - Signals readiness to parent component after preparation
 * - Adds a small delay to ensure smooth initialization
 */

import React, {useEffect} from 'react';
import {useThree} from '@react-three/fiber';

type InitializerProps = { onReady: () => void };

const Initializer: React.FC<InitializerProps> = ({onReady}) => {
    const {gl, scene, camera, invalidate} = useThree();

    useEffect(() => {
        try {
            // Pre-compile all materials and shaders in the scene
            gl.compile(scene, camera);
        } catch (e) {
            console.warn('compile skipped:', e);
        }
        // Trigger a re-render after compilation
        invalidate();

        // Signal readiness after a short delay to ensure smooth initialization
        const id = setTimeout(onReady, 1000);

        return () => clearTimeout(id);
    }, []);

    return null;
};

export default Initializer;