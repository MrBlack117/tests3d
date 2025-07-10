import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import React from 'react';
import { NavigationProvider, useNavigation } from './navigation/AppNavigator';

// Импорт всех экранов
import CubeRenderScreen from './screens/CubeRenderScreen';
import CubeAnimationScreen from './screens/CubeAnimationScreen';
import PlanetTextureScreen from './screens/PlanetTextureScreen';
import PlanetAnimationScreen from './screens/PlanetAnimationScreen';
import ModelDisplayScreen from './screens/ModelDisplayScreen';
import WaveTestScreen from './screens/WaveTestScreen';

// Главный экран с навигацией
const HomeScreen: React.FC = () => {
  const navigation = useNavigation();

  const screens = [
    { name: 'Cube Render', screen: 'CubeRender' },
    { name: 'Cube Animation', screen: 'CubeAnimation' },
    { name: 'Planet Texture', screen: 'PlanetTexture' },
    { name: 'Planet Animation', screen: 'PlanetAnimation' },
    { name: 'Model Display', screen: 'ModelDisplay' },
    { name: 'Wave Test', screen: 'WaveTest' }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tests 3D Navigation</Text>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer}>
        {screens.map((screen, index) => (
          <TouchableOpacity
            key={index}
            style={styles.button}
            onPress={() => navigation.navigate(screen.screen)}
          >
            <Text style={styles.buttonText}>{screen.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// Компонент рендера экранов
const ScreenRenderer: React.FC = () => {
  const navigation = useNavigation();

  switch (navigation.currentScreen) {
    case 'CubeRender':
      return <CubeRenderScreen />;
    case 'CubeAnimation':
      return <CubeAnimationScreen />;
    case 'PlanetTexture':
      return <PlanetTextureScreen />;
    case 'PlanetAnimation':
      return <PlanetAnimationScreen />;
    case 'ModelDisplay':
      return <ModelDisplayScreen />;
    case 'WaveTest':
      return <WaveTestScreen />;
    case 'Home':
    default:
      return <HomeScreen />;
  }
};

// Главный компонент приложения
export default function App() {
  return (
    <NavigationProvider>
      <ScreenRenderer />
    </NavigationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
