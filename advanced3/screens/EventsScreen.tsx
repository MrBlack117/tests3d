/**
 * Main events management screen for the astrology application.
 *
 * This component serves as the central hub for managing astrological events, featuring:
 * - Dynamic event listing with planet-specific data loading
 * - Automated transit event calculation based on natal chart positions
 * - Interactive calendar range selection for transit calculations
 * - Animation and visual feedback during data loading operations
 * - Integration with the custom navigation system for seamless transitions
 * - Local storage synchronization for persistent event data
 *
 * The screen implements a custom focus detection system to refresh data
 * when returning from other screens and optimizes API calls through
 * controlled loading states.
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    Alert,
    Animated,
    FlatList,
    Modal,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Event, NatalChartEntry, PlanetDataByDate} from '../types';
import {fetchPlanetPositions} from '../utils/api';
import Icon from 'react-native-vector-icons/FontAwesome';
import EventItem from '../components/EventItem';
import {
    AspectType,
    checkForAspect,
    checkNatalChartExists,
    createTransitEvent,
    getAspectInfluence,
    loadEventsFromStorage,
    loadNatalChart,
    saveEventsToStorage,
    validateDateRange
} from '../utils/eventHelpers';
import {useNavigation} from '../navigation/AppNavigator';
import CalendarRange from "../components/CalendarRange";
import PlanetDataService from '../utils/PlanetDataService';

/**
 * Custom hook to detect when screen comes into focus
 * Works with our custom navigation system to provide similar
 * functionality to React Navigation's useFocusEffect
 */
const useScreenFocus = (callback: () => void | (() => void)) => {
    const navigation = useNavigation();
    const {state} = navigation;
    const prevIndexRef = useRef(state.index);
    const prevRouteNameRef = useRef(state.routes[state.index].name);
    const executedRef = useRef(false);

    useEffect(() => {
        const currentRoute = state.routes[state.index];

        if (currentRoute.name === 'Events') {
            if (prevRouteNameRef.current !== currentRoute.name || prevIndexRef.current !== state.index || !executedRef.current) {
                const cleanupFunction = callback();
                executedRef.current = true;

                prevIndexRef.current = state.index;
                prevRouteNameRef.current = currentRoute.name;

                return cleanupFunction;
            }
        } else {
            prevIndexRef.current = state.index;
            prevRouteNameRef.current = currentRoute.name;
        }
    }, [state.index, state.routes, callback]);
};

const EventsScreen = () => {
    const navigation = useNavigation();
    const [events, setEvents] = useState<Event[]>([]);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
    const [natalChartExists, setNatalChartExists] = useState(false);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 7)));
    const [isLoadingTransit, setIsLoadingTransit] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [progressAnim] = useState(new Animated.Value(0));
    const [actionMenuVisible, setActionMenuVisible] = useState(false);

    /**
     * Initialize the component on first mount
     * Loads saved events and checks for natal chart existence
     */
    useEffect(() => {
        const initializeEvents = async () => {
            const loadedEvents = await loadEventsFromStorage({} as Event);
            setEvents(loadedEvents);

            const hasNatalChart = await checkNatalChartExists();
            setNatalChartExists(hasNatalChart);

            setIsInitialLoadComplete(true);
        };
        initializeEvents();
    }, []);

    /**
     * Update data when returning to this screen
     * Re-checks for new events and natal chart updates
     */
    useScreenFocus(
        useCallback(() => {
            const updateEvents = async () => {
                const loadedEvents = await loadEventsFromStorage({} as Event);
                setEvents(loadedEvents);

                const hasNatalChart = await checkNatalChartExists();
                setNatalChartExists(hasNatalChart);
            };

            updateEvents();
            return () => {
                // Cleanup function if needed
            };
        }, [])
    );

    /**
     * Updates both start and end dates when selected in the calendar
     */
    const handleDateRangeSelected = (start: Date, end: Date) => {
        setStartDate(start);
        setEndDate(end);
    };

    /**
     * Handles user selection of an event
     * Either directly navigates to animation or initiates data loading first
     *
     * @param event The selected event
     */
    const selectEvent = async (event: Event) => {
        // Ignore selection if event is already loading
        if (event.isLoading) return;

        // Define date range for data check
        const currentDate = new Date();
        const startDateStr = currentDate.toISOString().split('T')[0];
        const endDateStr = event.peakDate;

        try {
            // Check if all required data is already available
            const hasAllData = await PlanetDataService.checkDataAvailability(startDateStr, endDateStr);

            if (hasAllData) {
                // If data is available, load it and navigate immediately
                const planetDataByDate = await PlanetDataService.getAllStoredData();
                if (planetDataByDate) {
                    navigateToSolarSystem(event, planetDataByDate);
                } else {
                    // This branch should rarely execute since we checked availability
                    throw new Error('Failed to retrieve stored planet data');
                }
            } else {
                // If data is not available, load it with auto-navigation
                loadPlanetDataForEvent(event, true);
            }
        } catch (error) {
            console.error('Error checking or loading planet data:', error);
            // Fallback to load data with auto-navigation
            loadPlanetDataForEvent(event, true);
        }
    };

    /**
     * Navigates to the solar system animation screen with event data
     *
     * @param event The event to visualize
     * @param planetDataByDate Planetary data for all dates in the animation range
     */
    const navigateToSolarSystem = (event: Event, planetDataByDate: PlanetDataByDate) => {
        if (!event.influence) {
            console.warn('Event is missing influence:', event);
            return;
        }

        if (!planetDataByDate || !planetDataByDate[event.peakDate]) {
            console.warn('Missing planetary data for event date:', event.peakDate);
            return;
        }

        // Navigate to solar system screen with required parameters
        navigation.navigate('SolarSystem', {
            event,
            planetDataByDate,
            preloadedTextures: {},
        });
    };

    /**
     * Removes an event from the list and storage
     */
    const deleteEvent = async (index: number) => {
        setEvents((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            saveEventsToStorage(updated);
            return updated;
        });
    };

    /**
     * Loads planetary data for a specified event's date range
     * Handles loading state display and automatically navigates when complete
     *
     * @param event The event to load data for
     * @param autoNavigate Whether to automatically navigate to animation when loading completes
     * @returns The loaded planetary data or null on failure
     */
    const loadPlanetDataForEvent = async (event: Event, autoNavigate: boolean = false) => {
        // Find event's index to update loading state
        const eventIndex = events.findIndex(e =>
            e.name === event.name && e.peakDate === event.peakDate);

        if (eventIndex === -1) return null;

        // Set loading state for the event
        setEvents((prevEvents) => {
            const updatedEvents = [...prevEvents];
            updatedEvents[eventIndex] = {...event, isLoading: true};
            return updatedEvents;
        });

        // Start loading animation indicator
        Animated.loop(
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: false,
            })
        ).start();

        // Define date range for data loading
        const currentDate = new Date();
        const startDateStr = currentDate.toISOString().split('T')[0];
        const endDateStr = event.peakDate;

        try {
            // Load planetary data for the entire date range
            await PlanetDataService.fetchAndStoreDataForRange(startDateStr, endDateStr);

            // Retrieve all stored data
            const planetDataByDate = await PlanetDataService.getAllStoredData();

            // Verify that peak date data was successfully loaded
            if (!planetDataByDate || !planetDataByDate[endDateStr]) {
                throw new Error('Failed to load data for event peak date');
            }

            // Update event to reflect completed loading
            setEvents((prevEvents) => {
                const updatedEvents = [...prevEvents];
                updatedEvents[eventIndex] = {...event, isLoading: false};
                saveEventsToStorage(updatedEvents);
                return updatedEvents;
            });

            // Automatically navigate if requested
            if (autoNavigate) {
                navigateToSolarSystem(event, planetDataByDate);
            }

            return planetDataByDate;
        } catch (error) {
            console.error('Error loading planet data:', error);

            // Reset loading state on error
            setEvents((prevEvents) => {
                const updatedEvents = [...prevEvents];
                updatedEvents[eventIndex] = {...event, isLoading: false};
                return updatedEvents;
            });

            Alert.alert('Error', 'Failed to load planetary data. Please try again.');
            return null;
        } finally {
            progressAnim.setValue(0);
        }
    };

    /**
     * Calculates transit events based on natal chart and selected date range
     * Complex astrological calculation that identifies planetary aspects
     * between natal positions and current transits
     */
    const fetchTransitEventsData = async () => {
        const validationError = validateDateRange(startDate, endDate);
        if (validationError) {
            Alert.alert('Validation Error', validationError);
            return;
        }

        const hasNatalChart = await checkNatalChartExists();
        setNatalChartExists(hasNatalChart);

        if (!hasNatalChart) {
            Alert.alert(
                'Natal Chart Required',
                'Please create your natal chart first before fetching transit events.',
                [
                    {text: "Cancel", style: "cancel"},
                    {
                        text: "Go to Natal Chart",
                        onPress: () => navigation.navigate('NatalChart')
                    }
                ]
            );
            return;
        }

        setIsLoadingTransit(true);

        try {
            const natalChart = (await loadNatalChart()) ?? [];

            if (!natalChart || !Array.isArray(natalChart) || natalChart.length === 0) {
                console.error('TRANSITS ERROR: Natal chart data is invalid or empty');
            }

            const transitPlanets = [
                {id: '199', name: 'Mercury'},
                {id: '299', name: 'Venus'},
                {id: '499', name: 'Mars'},
                {id: '599', name: 'Jupiter'},
                {id: '699', name: 'Saturn'},
                {id: '799', name: 'Uranus'},
                {id: '899', name: 'Neptune'},
            ];

            const aspectOrbs: Record<AspectType, number> = {
                Conjunction: 8,
                Opposition: 8,
                Trine: 6,
                Square: 6,
                Sextile: 4,
                SemiSquare: 2,
                Quincunx: 3,
                SemiSextile: 2,
            };

            const aspects: { type: AspectType; angle: number }[] = [
                {type: 'Conjunction', angle: 0},
                {type: 'Opposition', angle: 180},
                {type: 'Trine', angle: 120},
                {type: 'Square', angle: 90},
                {type: 'Sextile', angle: 60},
                {type: 'SemiSquare', angle: 45},
                {type: 'Quincunx', angle: 150},
                {type: 'SemiSextile', angle: 30},
            ];

            // Initialize empty data map and try to pre-fill from storage when possible
            const transitData: { [key: string]: { date: string; longitude: number }[] } = {};

            // Fetch transit positions for each planet over the selected date range
            for (const planet of transitPlanets) {
                transitData[planet.name] = await fetchPlanetPositions(planet.id, startDate.toISOString(), endDate.toISOString());
            }

            // Track active and completed transit events
            const activeEvents: {
                [key: string]: {
                    startDate: string;
                    endDate: string;
                    peakDate: string;
                    peakDiff: number;
                    natalPlanet: string;
                    transitPlanet: string;
                    aspectType: AspectType;
                    influence: 'positive' | 'negative';
                };
            } = {};
            const transitEvents: Event[] = [];

            // Calculate aspects between natal chart and transit positions
            natalChart.forEach((natalPlanet: NatalChartEntry) => {
                const natalName = natalPlanet.name;
                if (natalName === 'Sun' || natalName === 'Moon') return;
                const natalLongitude = natalPlanet.longitude;

                transitPlanets.forEach((transitPlanet) => {
                    const transitPositions = transitData[transitPlanet.name];
                    if (!transitPositions || transitPositions.length === 0) {
                        return;
                    }

                    aspects.forEach((aspect) => {
                        const orb = aspectOrbs[aspect.type];
                        const eventKey = `${natalName}-${transitPlanet.name}-${aspect.type}`;

                        transitPositions.forEach((position) => {
                            const diff = checkForAspect(
                                natalLongitude,
                                position.longitude,
                                aspect.angle,
                                orb
                            );

                            if (diff !== null) {
                                const date = position.date;

                                if (!activeEvents[eventKey]) {
                                    activeEvents[eventKey] = {
                                        startDate: date,
                                        endDate: date,
                                        peakDate: date,
                                        peakDiff: diff,
                                        natalPlanet: natalName,
                                        transitPlanet: transitPlanet.name,
                                        aspectType: aspect.type,
                                        influence: getAspectInfluence(aspect.type),
                                    };
                                } else {
                                    activeEvents[eventKey].endDate = date;
                                    if (diff < activeEvents[eventKey].peakDiff) {
                                        activeEvents[eventKey].peakDate = date;
                                        activeEvents[eventKey].peakDiff = diff;
                                    }
                                }
                            } else if (activeEvents[eventKey]) {
                                const event = activeEvents[eventKey];
                                transitEvents.push(
                                    createTransitEvent(
                                        event.natalPlanet,
                                        event.transitPlanet,
                                        event.aspectType,
                                        event.startDate,
                                        event.endDate,
                                        event.peakDate,
                                        event.influence
                                    )
                                );
                                delete activeEvents[eventKey];
                            }
                        });

                        if (activeEvents[eventKey]) {
                            const event = activeEvents[eventKey];
                            transitEvents.push(
                                createTransitEvent(
                                    event.natalPlanet,
                                    event.transitPlanet,
                                    event.aspectType,
                                    event.startDate,
                                    event.endDate,
                                    event.peakDate,
                                    event.influence
                                )
                            );
                            delete activeEvents[eventKey];
                        }
                    });
                });
            });

            // Add transit events to the existing events list
            setEvents((prevEvents) => {
                const updatedEvents = [...prevEvents, ...transitEvents];
                saveEventsToStorage(updatedEvents);
                return updatedEvents;
            });
        } catch (error) {
            console.error('TRANSITS ERROR: Failed calculating transit events:', error);
            Alert.alert('Error', 'Failed to fetch transit events. Please try again.');
        } finally {
            setIsLoadingTransit(false);
            setModalVisible(false);
        }
    };

    /**
     * Render the screen header with title
     */
    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
                <Text style={styles.appTitle}>Astro Balance</Text>
                <Text style={styles.headerText}>Events</Text>
            </View>
        </View>
    );

    /**
     * Render the action menu modal with options
     */
    const renderActionMenu = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={actionMenuVisible}
            onRequestClose={() => setActionMenuVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setActionMenuVisible(false)}>
                <View style={styles.actionMenuOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.actionMenuContainer}>
                            <TouchableOpacity
                                style={styles.actionMenuItem}
                                onPress={() => {
                                    setActionMenuVisible(false);
                                    navigation.navigate('AddEvent');
                                }}
                            >
                                <Icon name="pencil" size={16} color="#4A00E0" style={styles.actionMenuIcon}/>
                                <Text style={styles.actionMenuText}>Create Event Manually</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionMenuItem}
                                onPress={() => {
                                    setActionMenuVisible(false);
                                    setModalVisible(true);
                                }}
                            >
                                <Icon name="calendar" size={16} color="#4A00E0" style={styles.actionMenuIcon}/>
                                <Text style={styles.actionMenuText}>Calculate Transit Events</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    /**
     * Render the date selection modal
     */
    const renderModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Time Range</Text>
                    <CalendarRange
                        startDate={startDate}
                        endDate={endDate}
                        onRangeSelected={handleDateRangeSelected}
                    />
                    <View style={styles.modalButtonsContainer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.fetchButton, isLoadingTransit && styles.disabledButton]}
                            onPress={fetchTransitEventsData}
                            disabled={isLoadingTransit}
                        >
                            <LinearGradient
                                colors={['#4A00E0', '#8E2DE2']}
                                style={styles.fetchButtonGradient}
                            >
                                <Text style={styles.fetchButtonText}>
                                    {isLoadingTransit ? 'Calculating...' : 'Calculate Events'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    /**
     * Render empty state when no events exist
     */
    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Icon name="calendar-o" size={60} color="rgba(0,0,0,0.2)"/>
            <Text style={styles.emptyText}>No Events Yet</Text>
            <Text style={styles.emptySubText}>
                Create events manually or calculate transit events{"\n"}
                to start balancing your astrological influences
            </Text>
        </View>
    );

    /**
     * Render floating action buttons
     */
    const renderFloatingButtons = () => (
        <View style={styles.floatingButtonsContainer}>
            <TouchableOpacity
                style={styles.natalChartButton}
                onPress={() => navigation.navigate('TestMenu')}
            >
                <LinearGradient
                    colors={['rgba(74, 0, 224, 0.9)', 'rgba(142, 45, 226, 0.9)']}
                    style={styles.floatingButton}
                >
                    <Icon name="bug" size={22} color="#FFFFFF"/>
                </LinearGradient>
                <Text style={styles.buttonLabel}>Test Menu</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.natalChartButton}
                onPress={() => navigation.navigate('NatalChart')}
            >
                <LinearGradient
                    colors={['rgba(74, 0, 224, 0.9)', 'rgba(142, 45, 226, 0.9)']}
                    style={styles.floatingButton}
                >
                    <Icon name="star" size={22} color="#FFFFFF"/>
                </LinearGradient>
                <Text style={styles.buttonLabel}>Natal Chart</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.addEventButton}
                onPress={() => setActionMenuVisible(true)}
            >
                <LinearGradient
                    colors={['rgba(74, 0, 224, 0.9)', 'rgba(142, 45, 226, 0.9)']}
                    style={[styles.floatingButton, styles.mainFloatingButton]}
                >
                    <Icon name="plus" size={24} color="#FFFFFF"/>
                </LinearGradient>
                <Text style={styles.buttonLabel}>Add Event</Text>
            </TouchableOpacity>
        </View>
    );

    // Sort events by peak date for display
    const sortedEvents = [...events].sort((a, b) => {
        const dateA = new Date(a.peakDate);
        const dateB = new Date(b.peakDate);
        return dateA.getTime() - dateB.getTime();
    });

    return (
        <View style={styles.mainContainer}>
            <StatusBar
                translucent
                backgroundColor="transparent"
                barStyle="dark-content"
            />
            <LinearGradient
                colors={['#F0F0F0', '#FFFFFF']}
                style={styles.container}
            >
                {renderModal()}
                {renderActionMenu()}
                <SafeAreaView style={{flex: 1}}>
                    <FlatList
                        data={sortedEvents}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({item, index}) => (
                            <EventItem
                                item={item}
                                index={events.indexOf(item)}
                                onSelect={selectEvent}
                                onDelete={deleteEvent}
                            />
                        )}
                        ListHeaderComponent={renderHeader}
                        ListEmptyComponent={isInitialLoadComplete ? renderEmptyList : null}
                        contentContainerStyle={[
                            styles.scrollContent,
                            events.length === 0 && styles.emptyScrollContent
                        ]}
                    />
                </SafeAreaView>
                {renderFloatingButtons()}
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F0F0F0',
    },
    container: {
        flex: 1
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
        paddingTop: 8,
    },
    emptyScrollContent: {
        flexGrow: 1
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingTop: 50,
        paddingHorizontal: 8,
    },
    headerTitleContainer: {
        flexDirection: 'column',
    },
    appTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#8E2DE2',
        marginBottom: 4,
    },
    headerText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#666666',
    },
    floatingButtonsContainer: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    natalChartButton: {
        alignItems: 'center',
        marginRight: 16,
    },
    addEventButton: {
        alignItems: 'center',
    },
    floatingButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 3},
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    mainFloatingButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    buttonLabel: {
        marginTop: 4,
        fontSize: 12,
        color: '#666666',
        fontWeight: '500',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 16,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        padding: 24,
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        height: 48,
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 8,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F2F2F2',
        height: '100%',
    },
    cancelButtonText: {
        color: '#666666',
        fontSize: 16,
        fontWeight: '500',
    },
    fetchButton: {
        flex: 2,
        borderRadius: 8,
        overflow: 'hidden',
        height: '100%',
    },
    disabledButton: {
        opacity: 0.7,
    },
    fetchButtonGradient: {
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
    },
    fetchButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold'
    },
    datePickersContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    webDateInputsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    webDateInput: {
        flex: 1,
        backgroundColor: '#E0E0E0',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 4,
        marginBottom: 12,
        fontSize: 16,
        color: '#333333',
        borderWidth: 0,
    },
    actionMenuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionMenuContainer: {
        position: 'absolute',
        bottom: 90,
        right: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 6,
        minWidth: 220,
    },
    actionMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    actionMenuIcon: {
        marginRight: 12,
        width: 20,
    },
    actionMenuText: {
        fontSize: 16,
        color: '#333333',
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: 'rgba(0,0,0,0.6)',
        marginTop: 24,
        marginBottom: 12,
    },
    emptySubText: {
        fontSize: 16,
        color: 'rgba(0,0,0,0.4)',
        textAlign: 'center',
        lineHeight: 22,
    },
    clearAllButton: {
        backgroundColor: '#F44336',
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    clearAllButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default EventsScreen;