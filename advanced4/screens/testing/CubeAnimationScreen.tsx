import React, {useRef} from 'react';
import {Canvas, useFrame} from '@react-three/fiber/native';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {useNavigation} from '../../navigation/AppNavigator';
import * as THREE from 'three';

const Cube: React.FC = () => {
    const cubeRef = useRef<THREE.Mesh>(null!);

    useFrame(() => {
        if (cubeRef.current) {
            cubeRef.current.rotation.x += 0.01;
            cubeRef.current.rotation.y += 0.01;
        }
    });

    return (
        <mesh ref={cubeRef}>
            <boxGeometry args={[1, 1, 1]}/>
            <meshBasicMaterial color="blue"/>
        </mesh>
    );
};

const CubeAnimationScreen: React.FC = () => {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Icon name="arrow-left" size={18} color="white"/>
                <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <Canvas gl={{antialias: true, debug: {checkShaderErrors: false, onShaderError: null}}}>
                <Cube/>
            </Canvas>
        </View>
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

export default CubeAnimationScreen;