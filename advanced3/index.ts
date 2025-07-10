/**
 * Application Entry Point
 *
 * This file serves as the main entry point for the application.
 * It registers the root App component with Expo's component registry
 * system, which handles the initialization of the React Native app
 * in both development and production environments.
 */

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);