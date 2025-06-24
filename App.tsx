import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { OrbitControls, Box } from '@react-three/drei';

export default function App() {
    return (
        <View style={styles.container}>
            <Text style={styles.header}>test expo 51</Text>
            <View style={styles.canvasWrapper}>
                <Canvas style={{ flex: 1 }}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[2, 2, 2]} intensity={1} />
                    <Box args={[1, 1, 1]} position={[0, 0, 0]}>
                        <meshStandardMaterial attach="material" color="orange" />
                    </Box>
                    <OrbitControls />
                </Canvas>
            </View>
            <StatusBar style="auto" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 40,
    },
    header: {
        fontSize: 22,
        fontWeight: 'bold',
        alignSelf: 'center',
        marginBottom: 12,
    },
    canvasWrapper: {
        flex: 1,
        borderWidth: 3,
        borderColor: 'dodgerblue',
        borderRadius: 12,
        overflow: 'hidden',
        marginHorizontal: 16,
        marginBottom: 16,
    },
});