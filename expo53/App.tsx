import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { Canvas } from '@react-three/fiber/native';

export default function App() {
  return (
      <View style={styles.container}>
        <Text style={styles.header}>test expo 53</Text>
        <View style={styles.canvasWrapper}>
          <Canvas style={{ flex: 1 }} gl={{antialias: true, debug: {checkShaderErrors: false, onShaderError: null}}}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[2, 2, 2]} intensity={1} />
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="orange" />
            </mesh>
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