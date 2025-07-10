import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '../../navigation/AppNavigator';
import * as THREE from 'three';
import { preloadTextures, TextureKey } from '../../utils/TexturePreloader';

const PlanetAnimationScreen: React.FC = () => {
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
                gl={{ antialias: true, debug: { checkShaderErrors: false, onShaderError: null } }}
                camera={{ position: [0, 20, 20], fov: 90 }}
            >
                <Suspense
                    fallback={
                        <mesh>
                            <sphereGeometry args={[1, 32, 32]} />
                            <meshBasicMaterial color="lightblue" />
                        </mesh>
                    }
                >
                    <PlanetOrbit textures={textures} />
                </Suspense>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
            </Canvas>
        </View>
    );
};

const PlanetOrbit: React.FC<{ textures: Record<TextureKey, THREE.Texture> | null }> = ({
                                                                                           textures,
                                                                                       }) => {
    const planetRef = useRef<THREE.Mesh>(null!);
    const angleRef = useRef(0);

    useFrame(() => {
        if (planetRef.current) {
            angleRef.current += 0.01;
            const radius = 5;
            planetRef.current.position.x = radius * Math.cos(angleRef.current);
            planetRef.current.position.z = radius * Math.sin(angleRef.current);
            planetRef.current.rotation.y += 0.005;
        }
    });

    return (
        <mesh ref={planetRef}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial map={textures?.earth ?? null} />
        </mesh>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
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
});

export default PlanetAnimationScreen;