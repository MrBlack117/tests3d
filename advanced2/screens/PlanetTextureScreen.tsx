import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber/native';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '../navigation/AppNavigator';
import { preloadTextures, TextureKey } from '../utils/TexturePreloader';
import * as THREE from 'three';

const PlanetTextureScreen: React.FC = () => {
    const navigation = useNavigation();
    const [textures, setTextures] = useState<Record<TextureKey, THREE.Texture> | null>(null);

    useEffect(() => {
        const loadTextures = async () => {
            try {
                const loadedTextures = await preloadTextures();
                setTextures(loadedTextures);
            } catch (error) {
                console.error('Failed to preload textures:', error);
            }
        };
        loadTextures();
    }, []);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Icon name="arrow-left" size={18} color="white" />
                <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <Canvas
                style={styles.canvas}
                gl={{antialias: true, debug: {checkShaderErrors: false, onShaderError: null}}}
            >
                <Suspense
                    fallback={
                        <mesh>
                            <sphereGeometry args={[1, 32, 32]} />
                            <meshBasicMaterial color="lightblue" />
                        </mesh>
                    }
                >
                    {textures && (
                        <mesh>
                            <sphereGeometry args={[1, 32, 32]} />
                            <meshStandardMaterial map={textures.earth} />
                        </mesh>
                    )}
                </Suspense>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
            </Canvas>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
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
    canvas: {
        width: 320,
        height: 240,
        borderWidth: 3,
        borderColor: 'lightblue',
    },
});

export default PlanetTextureScreen;