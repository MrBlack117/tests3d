/**
 * Root Application Component
 *
 * This is the top-level component that serves as the entry point for the application.
 * It configures the custom navigation system and provides the screen components.
 */

import React, { useEffect } from 'react';
import {NavigationProvider} from './navigation/AppNavigator';
import EventsScreen from './screens/EventsScreen';
import SolarSystemScreen from './screens/SolarSystemScreen';
import ModelDisplayScreen from './screens/testing/ModelDisplayScreen';
import WaveTestScreen from './screens/testing/WaveTestScreen';
import NatalChartScreen from './screens/NatalChartScreen';
import AddEventScreen from './screens/AddEventScreen';
import CubeRenderScreen from './screens/testing/CubeRenderScreen';
import CubeAnimationScreen from './screens/testing/CubeAnimationScreen';
import PlanetTextureScreen from './screens/testing/PlanetTextureScreen';
import PlanetAnimationScreen from './screens/testing/PlanetAnimationScreen';
import PlanetDataManagementScreen from "./screens/testing/PlanetDataManagementScreen";
import TestMenuScreen from './screens/testing/TestMenuScreen';
import {View, Text} from 'react-native';
import PlanetDataService from './utils/PlanetDataService';
import TextureManager from './utils/TexturePreloader';

// Define all screens used in the application
const screens = {
    Events: EventsScreen,
    SolarSystem: SolarSystemScreen,
    ModelDisplay: ModelDisplayScreen,
    WaveTest: WaveTestScreen,
    NatalChart: NatalChartScreen,
    AddEvent: AddEventScreen,
    CubeRender: CubeRenderScreen,
    CubeAnimation: CubeAnimationScreen,
    PlanetTexture: PlanetTextureScreen,
    PlanetAnimation: PlanetAnimationScreen,
    TestMenu: TestMenuScreen,
    PlanetDataManagement: PlanetDataManagementScreen,
};

/**
 * Main App component
 *
 * Configures the navigation system and wraps it with an ErrorBoundary
 * to catch and handle any errors that occur during rendering.
 */
export default function App() {
    // Initialize planet data service on app startup
    useEffect(() => {
        const initializeData = async () => {
            try {
                console.log('Initializing planet data service...');
                await PlanetDataService.initializeDataStore();
                console.log('Planet data service initialized successfully');
            } catch (error) {
                console.error('Failed to initialize planet data service:', error);
            }
        };

        const initializeTextures = async () => {
            try {
                console.log('Initializing textures...');
                await TextureManager.initializeTextures();
                console.log('Textures initialized successfully');
            } catch (error) {
                console.error('Failed to initialize textures:', error);
            }
        };

        initializeData();
        initializeTextures();
    }, []);

    return (
        <NavigationProvider
            initialRouteName="Events"
            screens={screens}
        >
            {/* Fallback content if no screen matches (this is rarely used) */}
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <Text>Screen not found</Text>
            </View>
        </NavigationProvider>
    );
}