/**
 * A test screen for visualizing and testing the BrainHeadModel component
 * in isolation from the main application flow.
 *
 * This screen is for development and testing purposes only
 * and is not intended for the final release.
 */

import React, {Suspense, useState, useCallback} from 'react';
import {Canvas} from '@react-three/fiber/native';
import {OrbitControls} from '@react-three/drei';
import {View, Button, TouchableOpacity, Text, StyleSheet} from 'react-native';
import BrainHeadModel from '../../components/BrainHeadModel';
import { useNavigation } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function ModelDisplayScreen() {
    // Get navigation functions
    const navigation = useNavigation();

    // State to control animation start
    const [startAnimation, setStartAnimation] = useState(false);

    /**
     * Initiates the brain model animation sequence
     */
    const handleStartAnimation = () => {
        setStartAnimation(true);
    };

    /**
     * Callback for when the animation completes
     * Resets the animation state to allow repeat testing
     */
    const handleAnimationComplete = useCallback(() => {
        setStartAnimation(false);
    }, []);

    return (
        <View style={styles.container}>
            {/* Back button navigation */}
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Icon name="arrow-left" size={18} color="white" />
                <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>

            {/* 3D rendering canvas with camera configuration */}
            <Canvas
                camera={{position: [0, 10, 15], fov: 75}}
                gl={{antialias: true, debug: {checkShaderErrors: false, onShaderError: null}}}
            >
                {/* Scene lighting */}
                <ambientLight intensity={0.3}/>
                <pointLight position={[10, 10, 10]} intensity={0.4}/>

                {/* Suspense for handling async loading of 3D models */}
                <Suspense
                    fallback={
                        <mesh>
                            <sphereGeometry args={[1, 32, 32]}/>
                            <meshStandardMaterial color="lightblue"/>
                        </mesh>
                    }
                >
                    {/* Brain head model component being tested */}
                    <BrainHeadModel
                        startAnimation={startAnimation}
                        onAnimationComplete={handleAnimationComplete}
                    />
                </Suspense>

                {/* Camera controls for interactive viewing */}
                <OrbitControls/>
            </Canvas>

            {/* Button to trigger animation for testing */}
            <View style={styles.bottomButtonContainer}>
                <Button title="Start Brain Animation" onPress={handleStartAnimation}/>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000', // Black background for 3D scene
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        color: 'white',
        marginLeft: 5,
        fontSize: 16,
    },
    bottomButtonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        zIndex: 10,
    }
});