/**
 * Main screen for solar system visualization with interactive 3D model.
 *
 * This component provides an immersive 3D representation of the solar system with:
 * - Scientifically accurate planetary orbital motion based on real astronomical data
 * - Specialized visual effects showing interactions between Earth and other planets
 * - Interactive camera controls with automatic and manual modes
 * - Multi-phase animation sequence (orbital motion → brain visualization → wave effects)
 * - Smooth transitions between animation states with proper cleanup
 * - Texture preloading system to prevent visual glitches during rendering
 */

import React, {useState, useEffect, useCallback, useMemo, Suspense, useRef} from 'react';
import {View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, StatusBar} from 'react-native';
import {Canvas, useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {LinearGradient} from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import AnimationHandler from '../components/AnimationHandler';
import DateTimeDisplay from '../components/DateTimeDisplay';
import {CelestialBodyConfig, Event, PlanetDataByDate} from '../types';
import BrainHeadModel from '../components/BrainHeadModel';
import WaveAnimation from '../components/WaveAnimation';
import * as THREE from 'three';
import Initializer from '../components/Initializer';
import CameraController from '../components/CameraController';
import {preloadTextures} from '../utils/TexturePreloader';
import {useNavigation, useRoute} from '../navigation/AppNavigator';
import StarField from "../components/StarField";

/**
 * Type definition for the ConfirmExitDialog component props
 */
interface ConfirmExitDialogProps {
    visible: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Celestial bodies configuration: defines names, colors, and sizes of planets
 * in the solar system for visualization. Defined outside component to avoid
 * unnecessary recreation on each render.
 */
const celestialBodies: CelestialBodyConfig[] = [
    {name: 'Sun', color: 'yellow', size: 2},
    {name: 'Mercury', color: 'gray', size: 0.4},
    {name: 'Venus', color: 'orange', size: 0.7},
    {name: 'Earth', color: 'blue', size: 1},
    {name: 'Mars', color: 'red', size: 0.65},
    {name: 'Jupiter', color: 'brown', size: 1.5},
    {name: 'Saturn', color: 'gold', size: 1.25},
    {name: 'Uranus', color: 'cyan', size: 1},
    {name: 'Neptune', color: 'darkblue', size: 1},
];

/**
 * Isolated component for wave animation between planets
 * Optimized with React.memo to prevent unnecessary re-renders
 * when other parts of the scene change
 */
const WaveAnimationWrapper: React.FC<{
    earthPos: { x: number; y: number; z: number };
    targetPos: { x: number; y: number; z: number };
    waveStage: 'none' | 'active';
    interaction: 'positive' | 'negative';
    onComplete: () => void;
}> = React.memo(({earthPos, targetPos, waveStage, interaction, onComplete}) => {
    return (
        <WaveAnimation
            earthPosition={earthPos}
            targetPosition={targetPos}
            isActive={waveStage === 'active'}
            onComplete={onComplete}
            interaction={interaction}
        />
    );
});

/**
 * Component that tracks user interaction with the camera
 * Detects mouse/touch input and switches camera mode from automatic
 * to manual when user input is detected
 */
const CameraInteractionObserver: React.FC<{
    onUserInteraction: () => void;
    cameraMode: 'auto' | 'manual';
}> = ({onUserInteraction, cameraMode}) => {
    const {gl} = useThree();
    const userInteractedRef = useRef(false);

    useEffect(() => {
        // Reset interaction flag when switching to automatic mode
        if (cameraMode === 'auto') {
            userInteractedRef.current = false;
        }

        // Listen for mouse/touch events on the canvas
        const handleInteractionStart = () => {
            if (cameraMode === 'auto' && !userInteractedRef.current) {
                userInteractedRef.current = true;
                onUserInteraction();
            }
        };

        const canvas = gl.domElement;
        canvas.addEventListener('pointerdown', handleInteractionStart);

        return () => {
            canvas.removeEventListener('pointerdown', handleInteractionStart);
        };
    }, [gl, onUserInteraction, cameraMode]);

    return null;
};

/**
 * Dialog component that confirms if the user wants to exit the animation early
 * Provides clear visual feedback and action options
 */
const ConfirmExitDialog: React.FC<ConfirmExitDialogProps> = ({visible, onConfirm, onCancel}) => {
    if (!visible) return null;

    return (
        <View style={styles.confirmDialogOverlay}>
            <View style={styles.confirmDialogContainer}>
                <Text style={styles.confirmDialogTitle}>Exit Animation?</Text>
                <Text style={styles.confirmDialogMessage}>
                    Are you sure you want to exit before the animation completes?
                </Text>
                <View style={styles.confirmDialogButtons}>
                    <TouchableOpacity
                        style={[styles.confirmDialogButton, styles.confirmDialogButtonCancel]}
                        onPress={onCancel}
                    >
                        <Text style={styles.confirmDialogButtonText}>Stay</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.confirmDialogButton, styles.confirmDialogButtonConfirm]}
                        onPress={onConfirm}
                    >
                        <Text style={styles.confirmDialogButtonText}>Exit</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

/**
 * Main solar system screen component
 * Orchestrates the complete visualization experience including
 * planet animations, brain model effects, and wave propagation
 */
const SolarSystemScreen: React.FC = () => {

    // Use our custom navigation hooks
    const navigation = useNavigation();
    const route = useRoute();

    // Extract route parameters with updated structure
    const params = route.params || {};
    const selectedEvent: Event | undefined = params.event;
    const planetDataByDate: PlanetDataByDate = params.planetDataByDate || {};
    const animationDuration = 20;

    // Animation state management
    const [currentDate, setCurrentDate] = useState(new Date());
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = selectedEvent?.peakDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
    const [isAnimationActive, setIsAnimationActive] = useState(true);
    const [startBrainAnimation, setStartBrainAnimation] = useState(false);
    const [isBrainAnimationFinished, setIsBrainAnimationFinished] = useState(false);
    const [waveStage, setWaveStage] = useState<'none' | 'active'>('none');
    const [animationSequenceComplete, setAnimationSequenceComplete] = useState(false);

    // Planet and scene state
    const [planetPositions, setPlanetPositions] = useState<{
        [key: string]: { x: number; y: number; z: number };
    }>({});
    const [readyToAnimate, setReadyToAnimate] = useState(false);
    const [isSceneReady, setIsSceneReady] = useState(false);
    const [planetsRendered, setPlanetsRendered] = useState(false);
    const [animationFramesCount, setAnimationFramesCount] = useState(0);
    const MIN_FRAMES_BEFORE_SHOWING = 10;

    // Camera and UI state
    const [cameraMode, setCameraMode] = useState<'auto' | 'manual'>('auto');
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    // Texture management
    const [preloadedTextures, setPreloadedTextures] = useState<Record<string, THREE.Texture> | null>(null);
    const [texturesLoading, setTexturesLoading] = useState(true);
    const [shouldRestoreEarthTexture, setShouldRestoreEarthTexture] = useState(false);

    // Brain model loading state
    const [brainModelsLoaded, setBrainModelsLoaded] = useState(false);

    // Event data
    const selectedPlanet = selectedEvent?.planet;
    const interaction = selectedEvent?.influence;
    const initialCameraPosition: [number, number, number] = [30, 25, 45];

    /**
     * Preload textures when component mounts
     * Ensures all planet textures are ready before animation starts
     */
    useEffect(() => {
        const loadTextures = async () => {
            try {
                setTexturesLoading(true);

                console.log(`Starting texture preloading...`);
                const textures = await preloadTextures();

                console.log(`Textures loaded: ${Object.keys(textures).length}`);

                setPreloadedTextures(textures);
                setTexturesLoading(false);

                const textureKeys = Object.keys(textures).sort().join(", ");
                console.log(`Loaded textures: ${textureKeys}`);
            } catch (error) {
                console.error(`Failed to preload textures:`, error);
                setTexturesLoading(false);
            }
        };

        loadTextures();
    }, []);

    /**
     * Check if scene is ready for animation
     * Validates availability of planetary data, textures and initialization
     */
    useEffect(() => {
        // Check if we have planetDataByDate with entries
        const hasPlanetData = planetDataByDate &&
            Object.keys(planetDataByDate).length > 0 &&
            planetDataByDate[endDate] &&
            planetDataByDate[endDate].length === celestialBodies.length;

        if (hasPlanetData &&
            readyToAnimate &&
            !texturesLoading &&
            preloadedTextures &&
            brainModelsLoaded) {
            setIsSceneReady(true);
        }
    }, [planetDataByDate, endDate, readyToAnimate, texturesLoading, preloadedTextures, celestialBodies.length, brainModelsLoaded]);

    /**
     * Start brain animation after planetary animation completes
     * Uses a golden ratio timing for natural transition flow
     */
    useEffect(() => {
        if (!isAnimationActive && !startBrainAnimation) {
            const timeout = setTimeout(() => {
                setStartBrainAnimation(true);
            }, 1618); // Special time value based on the golden ratio (1.618)
            return () => clearTimeout(timeout);
        }
    }, [isAnimationActive, startBrainAnimation]);

    /**
     * Обработчик успешной загрузки 3D-моделей мозга
     */
    const handleBrainModelsLoaded = useCallback(() => {
        setBrainModelsLoaded(true);
    }, []);

    /**
     * Updates stored planet positions as they move during animation
     * These positions are used for camera control and wave effects
     */
    const handlePositionUpdate = useCallback((name: string, position: { x: number; y: number; z: number }) => {
        setPlanetPositions((prev) => ({...prev, [name]: position}));

        // Set planets as rendered once we have positions for Earth (indicates main planets are in place)
        if (name === 'Earth' && !planetsRendered) {
            setPlanetsRendered(true);
        }
    }, [planetsRendered]);

    // Memoized positions for performance optimization
    const earthPos = useMemo(
        () => planetPositions['Earth'] || {x: 0, y: 0, z: 0},
        [planetPositions['Earth']]
    );
    const targetPos = useMemo(
        () => planetPositions[selectedPlanet || 'Earth'] || {x: 0, y: 0, z: 0},
        [planetPositions[selectedPlanet || 'Earth'], selectedPlanet]
    );

    /**
     * Initiates wave animation after brain animation completes
     * Marks the transition from brain visualization to wave effects
     */
    const handleAnimationComplete = useCallback(() => {
        setIsBrainAnimationFinished(true);
        setTimeout(() => {
            setWaveStage('active');
        }, 100);
    }, []);

    /**
     * Handle wave animation completion
     * Sets flag to restore Earth texture and marks entire sequence as complete
     */
    const handleWaveAnimationComplete = useCallback(() => {
        setWaveStage('none');
        setShouldRestoreEarthTexture(true);

        // Add a small delay before marking animation sequence as complete
        // to ensure no transitional flicker of the return button
        setTimeout(() => {
            setAnimationSequenceComplete(true);
        }, 100);
    }, []);

    /**
     * Switches camera to manual mode when user interaction is detected
     * Gives user control over the viewpoint
     */
    const handleCameraInteraction = useCallback(() => {
        setCameraMode('manual');
    }, []);

    /**
     * Returns camera to automatic mode
     * Resumes cinematic camera movements
     */
    const resetToAutoCamera = useCallback(() => {
        setCameraMode('auto');
    }, []);

    /**
     * Handles back button press based on animation state
     * Shows confirmation dialog if exiting during important animation phases
     */
    const handleBackPress = useCallback(() => {
        // If animation is still active, or we're in the middle of important visuals,
        // show a confirmation dialog
        if (isAnimationActive || startBrainAnimation || waveStage === 'active') {
            setShowExitConfirm(true);
        } else {
            // Otherwise go back directly
            navigation.goBack();
        }
    }, [isAnimationActive, startBrainAnimation, waveStage, navigation]);

   /**
    * Handler for successful scene initialization
    */
   const handleReadyToAnimate = useCallback(() => {
       setReadyToAnimate(true);
   }, []);

   /**
    * Handler for counting rendered animation frames
    * Used to track the progress of the initial animation
    */
    const handleFramesRendered = useCallback((frames: number) => {
        setAnimationFramesCount(frames);
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar
                translucent
                backgroundColor="transparent"
                barStyle="light-content"
            />
            <DateTimeDisplay date={currentDate}/>
            <Canvas
                style={styles.canvas}
                frameloop={readyToAnimate && isAnimationActive ? 'always' : 'demand'}
                gl={{antialias: true, debug: {checkShaderErrors: false, onShaderError: null}}}
                onCreated={({gl, scene}) => {
                    scene.background = new THREE.Color('#07071c');
                }}
            >
                <Suspense
                    fallback={
                        <mesh>
                            <torusGeometry args={[1.2, 0.3, 16, 100]}/>
                            <meshStandardMaterial color="lightblue" metalness={0.5} roughness={0.2}/>
                        </mesh>
                    }
                >
                    <ambientLight intensity={1}/>
                    <pointLight position={[10, 10, 10]} intensity={1}/>

                    <Initializer onReady={handleReadyToAnimate}/>
                    <CameraInteractionObserver
                        onUserInteraction={handleCameraInteraction}
                        cameraMode={cameraMode}
                    />
                    <StarField/>

                    {isSceneReady && preloadedTextures && (
                        <>
                            <AnimationHandler
                                startDate={startDate}
                                endDate={endDate}
                                animationDuration={animationDuration}
                                onDateChange={setCurrentDate}
                                planetDataByDate={planetDataByDate}
                                celestialBodies={celestialBodies}
                                isAnimationActive={isAnimationActive}
                                setIsAnimationActive={setIsAnimationActive}
                                selectedPlanet={selectedPlanet}
                                influence={interaction}
                                isBrainAnimationFinished={isBrainAnimationFinished}
                                onPositionUpdate={handlePositionUpdate}
                                preloadedTextures={preloadedTextures}
                                readyToAnimate={readyToAnimate}
                                restoreEarthTexture={shouldRestoreEarthTexture}
                                onFramesRendered={handleFramesRendered}
                            />
                            <WaveAnimationWrapper
                                earthPos={earthPos}
                                targetPos={targetPos}
                                waveStage={waveStage}
                                interaction={interaction ?? 'positive'}
                                onComplete={handleWaveAnimationComplete}
                            />
                        </>
                    )}

                    <Suspense fallback={<mesh>
                        <torusGeometry/>
                        <meshStandardMaterial color="gray"/>
                    </mesh>}>
                        <BrainHeadModel startAnimation={startBrainAnimation}
                                        onAnimationComplete={handleAnimationComplete}
                                        onModelsLoaded={handleBrainModelsLoaded}/>
                    </Suspense>

                    {/* Automatic camera control, only active when cameraMode is 'auto' */}
                    {cameraMode === 'auto' && (
                        <CameraController
                            cameraMode={cameraMode}
                            isAnimationActive={isAnimationActive}
                            startBrainAnimation={startBrainAnimation}
                            isBrainAnimationFinished={isBrainAnimationFinished}
                            waveStage={waveStage}
                            earthPos={earthPos}
                            targetPos={targetPos}
                            initialCameraPosition={initialCameraPosition}
                            selectedPlanet={selectedPlanet}
                        />
                    )}
                </Suspense>
                <OrbitControls
                    makeDefault
                    target={[0, 0, 0]} // Always looks at Earth
                    enablePan={false}  // Disables panning
                    enableRotate={true} // Enables rotation
                    enableZoom={true}   // Enables zooming
                    minDistance={10}    // Minimum distance limit
                    maxDistance={100}   // Maximum distance limit
                    dampingFactor={0.1} // For smooth movement
                    enableDamping={true} // Enables damping (inertia)
                />
            </Canvas>

            <TouchableOpacity
                style={styles.backButtonContainer}
                onPress={handleBackPress}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={['rgba(50, 50, 100, 0.8)', 'rgba(30, 30, 70, 0.8)']}
                    style={styles.backButton}
                >
                    <Icon name="arrow-back" size={22} color="#FFFFFF"/>
                </LinearGradient>
            </TouchableOpacity>

            {/* Button to reset camera to automatic mode */}
            {cameraMode === 'manual' && !animationSequenceComplete && (
                <TouchableOpacity
                    style={styles.cameraButtonContainer}
                    onPress={resetToAutoCamera}
                    activeOpacity={0.7}
                >
                    <LinearGradient
                        colors={['rgba(50, 50, 100, 0.8)', 'rgba(30, 30, 70, 0.8)']}
                        style={styles.cameraButton}
                    >
                        <Icon name="videocam" size={18} color="#FFFFFF"/>
                        <Text style={styles.buttonText}> Auto</Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}

            {animationSequenceComplete && (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.returnButtonTouchable}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['rgba(74, 0, 224, 0.9)', 'rgba(142, 45, 226, 0.9)']}
                            style={styles.returnButton}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 0}}
                        >
                            <Icon name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{marginRight: 8}}/>
                            <Text style={styles.buttonText}>Return to Events</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            {/* Show loading indicator until planets are actually visible and enough frames rendered */}
            {(!isSceneReady || texturesLoading || !planetsRendered || animationFramesCount < MIN_FRAMES_BEFORE_SHOWING) && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ffffff"/>
                    <Text style={styles.loadingText}>Loading Solar System...</Text>
                </View>
            )}

            {/* Exit confirmation dialog */}
            <ConfirmExitDialog
                visible={showExitConfirm}
                onConfirm={() => {
                    setShowExitConfirm(false);
                    navigation.goBack();
                }}
                onCancel={() => setShowExitConfirm(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#05050f'
    },
    canvas: {
        flex: 1
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        zIndex: 10,
    },
    cameraButtonContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        zIndex: 10,
    },
    backButtonContainer: {
        position: 'absolute',
        top: 50,
        left: 16,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 3},
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(140, 140, 255, 0.5)',
    },
    cameraButton: {
        width: 90,
        height: 40,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 3},
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(140, 140, 255, 0.5)',
    },
    returnButtonTouchable: {
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 3},
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 10,
    },
    returnButton: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 25,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(5, 5, 15, 1)',
        zIndex: 20,
    },
    loadingText: {
        color: '#ffffff',
        fontSize: 18,
        marginTop: 10,
    },
    confirmDialogOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 30,
    },
    confirmDialogContainer: {
        backgroundColor: '#111133',
        borderRadius: 16,
        padding: 24,
        width: '80%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: 'rgba(140, 140, 255, 0.3)',
    },
    confirmDialogTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    confirmDialogMessage: {
        color: '#CCCCDD',
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    confirmDialogButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    confirmDialogButton: {
        flex: 1,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    confirmDialogButtonCancel: {
        backgroundColor: '#333355',
    },
    confirmDialogButtonConfirm: {
        backgroundColor: '#6644EE',
    },
    confirmDialogButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default SolarSystemScreen;
