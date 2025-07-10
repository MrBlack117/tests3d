import React from 'react';
import {Canvas} from '@react-three/fiber/native';
import {View, StyleSheet, TouchableOpacity, Text} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import {useNavigation} from '../../navigation/AppNavigator';

const CubeRenderScreen: React.FC = () => {
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
            <Canvas
                style={styles.canvas}
                gl={{
                    preserveDrawingBuffer: true,
                    debug: { checkShaderErrors: false, onShaderError: null },
                }}
                camera={{ position: [0, 0, 5], fov: 75 }}
            >
                <ambientLight />
                <mesh position={[0, 0, 0]}>
                    <boxGeometry />
                    <meshBasicMaterial color="orange" />
                </mesh>
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
        borderColor: 'red',
    },
});

export default CubeRenderScreen;