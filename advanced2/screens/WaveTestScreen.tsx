/**
 * A test screen for visualizing and debugging the WaveAnimation component
 * that renders wave effects between Earth and another planet.
 *
 * This screen allows testers to trigger different types of waves (positive/negative)
 * and observe their behavior in isolation from the main application.
 */

import React, {useState} from 'react';
import {View, Button, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import WaveAnimation from '../components/WaveAnimation';
import * as THREE from "three";
import Icon from 'react-native-vector-icons/FontAwesome';
import {useNavigation} from '../navigation/AppNavigator';

const WaveTestScreen: React.FC = () => {
    const navigation = useNavigation();
    const [waveStage, setWaveStage] = useState<'none' | 'active'>('none');
    const [interaction, setInteraction] = useState<'positive' | 'negative'>('positive');

    const earthPosition = {x: 0, y: 0, z: 0};
    const marsPosition = {x: 0, y: 0, z: -50};

    const handleStartWaves = () => {
        if (waveStage === 'none') {
            console.log(`Starting ${interaction} wave animation`);
            setWaveStage('active');
        }
    };

    const handleWaveComplete = () => {
        console.log('Wave animation completed, resetting');
        setWaveStage('none');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={18} color="#ffffff"/>
                </TouchableOpacity>
                <Text style={styles.headerText}>Wave Return Animation Test</Text>
                <View style={{width: 40}}/>
            </View>

            <Canvas
                camera={{position: [0, 40, 50], fov: 75}}
                style={styles.canvas}
                gl={{antialias: true, debug: {checkShaderErrors: false, onShaderError: null}}}
                onCreated={({gl, scene}) => {
                    scene.background = new THREE.Color('#0a0a1a');
                }}
            >
                <ambientLight intensity={0.6}/>
                <pointLight position={[10, 10, 10]} intensity={1.2}/>

                {/* Earth */}
                <mesh position={[earthPosition.x, earthPosition.y, earthPosition.z]}>
                    <sphereGeometry args={[1.5, 32, 32]}/>
                    <meshStandardMaterial color="#4a90e2" emissive="#001122"/>
                </mesh>

                {/* Target planet */}
                <mesh position={[marsPosition.x, marsPosition.y, marsPosition.z]}>
                    <sphereGeometry args={[1, 32, 32]}/>
                    <meshStandardMaterial color="#e24a4a" emissive="#220011"/>
                </mesh>

                <WaveAnimation
                    earthPosition={earthPosition}
                    targetPosition={marsPosition}
                    isActive={waveStage === 'active'}
                    onComplete={handleWaveComplete}
                    interaction={interaction}
                />

                <OrbitControls enableZoom={true} enableRotate={true}/>
            </Canvas>

            <View style={styles.controlPanel}>
                <View style={styles.infoPanel}>
                    <Text style={styles.infoText}>Status: {waveStage}</Text>
                    <Text style={styles.infoText}>Interaction: {interaction}</Text>
                    <Text style={styles.descriptionText}>
                        {interaction === 'positive'
                            ? "Green particles flow from target to Earth"
                            : "Blue particles flow from Earth to target"}
                    </Text>
                </View>

                <View style={styles.buttonContainer}>
                    <Button
                        title="Start Wave Animation"
                        onPress={handleStartWaves}
                        disabled={waveStage !== 'none'}
                    />
                    <View style={styles.interactionButtons}>
                        <TouchableOpacity
                            style={[styles.interactionButton,
                                interaction === 'positive' && styles.activeButton]}
                            onPress={() => setInteraction('positive')}
                            disabled={waveStage !== 'none'}
                        >
                            <Text style={styles.buttonText}>Positive</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.interactionButton,
                                interaction === 'negative' && styles.activeButton]}
                            onPress={() => setInteraction('negative')}
                            disabled={waveStage !== 'none'}
                        >
                            <Text style={styles.buttonText}>Negative</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a1a'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: 16,
        paddingBottom: 10,
        backgroundColor: '#0a0a1a',
        zIndex: 10,
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    backButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
        height: 40,
    },
    canvas: {
        flex: 1
    },
    controlPanel: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        zIndex: 10,
        backgroundColor: 'rgba(10, 10, 26, 0.9)',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    infoPanel: {
        marginBottom: 15,
    },
    infoText: {
        color: '#ffffff',
        fontSize: 14,
        marginBottom: 4,
    },
    descriptionText: {
        color: '#aaaaaa',
        fontSize: 12,
        marginTop: 8,
        fontStyle: 'italic',
    },
    buttonContainer: {
        gap: 10,
    },
    interactionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 10,
    },
    interactionButton: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    activeButton: {
        backgroundColor: 'rgba(74, 144, 226, 0.3)',
        borderWidth: 1,
        borderColor: '#4a90e2',
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
});

export default WaveTestScreen;