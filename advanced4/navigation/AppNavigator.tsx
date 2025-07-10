/**
 * A lightweight custom navigation system for React Native applications.
 *
 * This component provides core navigation functionality similar to React Navigation, including:
 * - Stack-based navigation with push, pop, and replace operations
 * - Animated screen transitions with proper gesture handling
 * - Context-based navigation access throughout the app
 * - Prevention of navigation actions during transitions
 *
 * The system uses React Context and hooks for a familiar API while maintaining
 * better control over transitions and animations.
 */

import React, {useState, useEffect, createContext, useContext, useCallback} from 'react';
import {View, StyleSheet, Animated, Dimensions} from 'react-native';

/**
 * Navigation state type definition
 * Stores the stack of routes and current index
 */
export type NavigationState = {
    routes: {
        name: string;
        params?: any;
        key: string;
    }[];
    index: number;
};

/**
 * Navigation context type definition
 * Defines the shape of navigation functions and state
 */
export type NavigationContextType = {
    state: NavigationState;
    navigate: (name: string, params?: any) => void;
    goBack: () => void;
    push: (name: string, params?: any) => void;
    replace: (name: string, params?: any) => void;
};

// Create navigation context
const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

/**
 * Custom hook to access navigation functions and state
 * Can be used similarly to useNavigation from React Navigation
 */
export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};

/**
 * Custom hook to access current route parameters
 * Works similarly to useRoute from React Navigation
 */
export const useRoute = () => {
    const {state} = useNavigation();
    const currentRoute = state.routes[state.index];

    return {
        params: currentRoute.params || {},
        name: currentRoute.name,
        key: currentRoute.key,
    };
};

/**
 * Navigation provider component
 * Manages the navigation state and renders the appropriate screen
 * with smooth transitions and no white flash
 *
 * @param initialRouteName - Name of the first screen to display
 * @param screens - Object mapping screen names to components
 * @param children - Optional children to render if no screens match (fallback)
 */
export const NavigationProvider: React.FC<{
    initialRouteName: string;
    screens: Record<string, React.ComponentType<any>>;
    children?: React.ReactNode;
}> = ({children, initialRouteName, screens}) => {
    // Get window dimensions for animation
    const {width} = Dimensions.get('window');

    // Initialize navigation state with initial route
    const [state, setState] = useState<NavigationState>({
        routes: [
            {
                name: initialRouteName,
                params: {},
                key: `${initialRouteName}-${Date.now()}`,
            },
        ],
        index: 0,
    });

    // Animation for screen transitions
    const [slideAnim] = useState(new Animated.Value(0));

    // Track if we're in a transition
    const [isTransitioning, setIsTransitioning] = useState(false);

    /**
     * Navigate to a screen
     * If the screen is already in the stack, go back to it
     * Otherwise add it to the stack
     */
    const navigate = useCallback((name: string, params: any = {}) => {
        console.log(`Navigation: Navigating to ${name}`);

        if (isTransitioning) {
            console.log('Navigation: Skipping navigate - already in transition');
            return; // Prevent multiple navigations during transition
        }

        setIsTransitioning(true);
        slideAnim.setValue(width); // Start from off-screen right

        setState((prevState) => {
            const existingIndex = prevState.routes.findIndex(route => route.name === name);

            console.log(`Navigation: Found existing route: ${existingIndex !== -1 ? 'yes' : 'no'}`);

            if (existingIndex !== -1) {
                // Create updated route with new parameters
                const updatedRoute = {
                    ...prevState.routes[existingIndex],
                    params,  // Use the new params instead of keeping old ones
                    key: `${name}-${Date.now()}`, // New key to force re-render
                };

                // Create new routes array with updated route
                const updatedRoutes = [...prevState.routes];
                updatedRoutes[existingIndex] = updatedRoute;

                return {
                    routes: updatedRoutes.slice(0, existingIndex + 1),
                    index: existingIndex,
                };
            } else {
                // Add new screen
                return {
                    routes: [...prevState.routes.slice(0, prevState.index + 1), {
                        name,
                        params,
                        key: `${name}-${Date.now()}`,
                    }],
                    index: prevState.index + 1,
                };
            }
        });
    }, [width, isTransitioning]);

    /**
     * Push a new screen onto the stack
     * Always adds a screen even if it already exists
     */
    const push = useCallback((name: string, params: any = {}) => {
        if (isTransitioning) return; // Prevent multiple navigations during transition

        setIsTransitioning(true);
        slideAnim.setValue(width); // Start from off-screen right

        setState((prevState) => ({
            routes: [...prevState.routes, {
                name,
                params,
                key: `${name}-${Date.now()}`,
            }],
            index: prevState.routes.length,
        }));
    }, [width, isTransitioning]);

    /**
     * Go back to the previous screen
     */
    const goBack = useCallback(() => {
        if (isTransitioning) return; // Prevent multiple navigations during transition

        setState((prevState) => {
            if (prevState.index > 0) {
                setIsTransitioning(true);
                slideAnim.setValue(-width / 4); // Start slightly to the left for back animation
                return {
                    ...prevState,
                    index: prevState.index - 1,
                };
            }
            return prevState;
        });
    }, [width, isTransitioning]);

    /**
     * Replace the current screen
     */
    const replace = useCallback((name: string, params: any = {}) => {
        if (isTransitioning) return; // Prevent multiple navigations during transition

        setIsTransitioning(true);
        slideAnim.setValue(width / 2); // Start from middle-right for replace animation

        setState((prevState) => {
            const newRoutes = [...prevState.routes];
            newRoutes[prevState.index] = {
                name,
                params,
                key: `${name}-${Date.now()}`,
            };

            return {
                ...prevState,
                routes: newRoutes,
            };
        });
    }, [width, isTransitioning]);

    // Animate screen transitions when route changes
    useEffect(() => {
        if (isTransitioning) {
            console.log('Navigation: Starting animation');
            Animated.timing(slideAnim, {
                toValue: 0, // Animate to normal position
                duration: 300, // Animation duration (ms)
                useNativeDriver: true, // Better performance
            }).start(() => {
                console.log('Navigation: Animation complete');
                setIsTransitioning(false); // Mark transition as complete
            });
        }
    }, [state.index, isTransitioning]);

    // Get the component for the current screen
    const CurrentScreen = screens[state.routes[state.index].name];

    // For debugging - log the current route when it changes
    useEffect(() => {
        const currentRoute = state.routes[state.index];
        console.log(`Navigation: Current screen is ${currentRoute.name} with key ${currentRoute.key}`);
    }, [state.index, state.routes]);

    return (
        <NavigationContext.Provider value={{state, navigate, goBack, push, replace}}>
            <View style={styles.container}>
                <Animated.View
                    style={[
                        styles.screenContainer,
                        {
                            transform: [
                                {translateX: slideAnim}
                            ]
                        }
                    ]}
                >
                    {CurrentScreen ? <CurrentScreen/> : children}
                </Animated.View>
            </View>
        </NavigationContext.Provider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff', // Background to prevent transparency issues
    },
    screenContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
});