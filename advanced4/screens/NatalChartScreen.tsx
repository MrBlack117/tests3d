/**
 * A comprehensive natal chart management screen for astrological applications.
 *
 * This component provides a complete interface for creating and viewing natal charts:
 * - Precise birthdate and time selection with native pickers
 * - Location search with geocoding through Nominatim API
 * - Intelligent debounced search with location suggestions
 * - API integration for fetching accurate planetary positions
 * - Persistent storage of natal chart data
 * - Visual display of calculated planetary positions with zodiac signs
 *
 * The natal chart data serves as the foundation for transit calculations
 * and personalized astrological interpretations throughout the application.
 */

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
    Alert,
    TextInput,
    ActivityIndicator,
    Keyboard, StatusBar,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchNatalChart} from '../utils/api';
import {NatalChartEntry} from '../types';
import Icon from 'react-native-vector-icons/FontAwesome';
import {useNavigation} from '../navigation/AppNavigator';

/**
 * Interface for location search results from Nominatim API
 */
interface LocationResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    importance: number;
}

const NatalChartScreen: React.FC = () => {
    // Get navigation from our custom hook
    const navigation = useNavigation();

    // State for birth information
    const [birthDate, setBirthDate] = useState(new Date());
    const [birthTime, setBirthTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [latitude, setLatitude] = useState(0);
    const [longitude, setLongitude] = useState(0);
    const [natalChart, setNatalChart] = useState<NatalChartEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [progressAnim] = useState(new Animated.Value(0));

    // Location search states
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
    const [showResults, setShowResults] = useState(false);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Load saved natal chart and location on component mount
     * Retrieves previously saved data from AsyncStorage
     */
    useEffect(() => {
        const loadSavedData = async () => {
            try {
                const savedChart = await AsyncStorage.getItem('natalChart');
                if (savedChart) {
                    const parsedChart = JSON.parse(savedChart);
                    setNatalChart(parsedChart);
                }

                // Load saved coordinates if available
                const savedLatitude = await AsyncStorage.getItem('birthLatitude');
                const savedLongitude = await AsyncStorage.getItem('birthLongitude');
                const savedLocationName = await AsyncStorage.getItem('birthLocationName');

                if (savedLatitude && savedLongitude) {
                    setLatitude(parseFloat(savedLatitude));
                    setLongitude(parseFloat(savedLongitude));
                }

                if (savedLocationName) {
                    setSelectedLocation(savedLocationName);
                }

                // Load saved birth date and time if available
                const savedBirthDate = await AsyncStorage.getItem('birthDate');
                const savedBirthTime = await AsyncStorage.getItem('birthTime');

                if (savedBirthDate) {
                    setBirthDate(new Date(savedBirthDate));
                }

                if (savedBirthTime) {
                    setBirthTime(new Date(savedBirthTime));
                }
            } catch (error) {
                console.error('Failed loading saved natal chart data:', error);
            }
        };

        loadSavedData();

        // Clean up any pending debounce timeout on unmount
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    /**
     * Handles date selection from the date picker
     */
    const onDateChange = (_event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setBirthDate(selectedDate);
    };

    /**
     * Handles time selection from the time picker
     */
    const onTimeChange = (_event: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime) setBirthTime(selectedTime);
    };

    /**
     * Search for location using Nominatim API
     * Handles geocoding requests with proper API usage limitations
     */
    const searchLocation = useCallback(async (query: string) => {
        if (query.length < 3) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
                    query
                )}&format=json&limit=3`, // Limit to 3 results
                {
                    headers: {
                        'User-Agent': 'AstroPlanetApp/1.0',
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data: LocationResult[] = await response.json();
            setSearchResults(data);
            setShowResults(true);
        } catch (error) {
            console.error('Failed searching location:', error);
            Alert.alert('Error', 'Failed to search location. Please try again.');
        } finally {
            setIsSearching(false);
        }
    }, []);

    /**
     * Implements debounce pattern for location search
     * Prevents excessive API calls while typing
     */
    const debouncedSearch = useCallback((text: string) => {
        setSearchQuery(text);

        // Clear previous timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Set a new timeout
        const timeout = setTimeout(() => {
            if (text.length >= 3) {
                searchLocation(text);
            }
        }, 500);

        debounceTimeoutRef.current = timeout as unknown as NodeJS.Timeout;
    }, [searchLocation]);

    /**
     * Handles the selection of a location from search results
     * Updates coordinates and saves location data
     */
    const selectLocationResult = (location: LocationResult) => {
        setLatitude(parseFloat(location.lat));
        setLongitude(parseFloat(location.lon));
        setSelectedLocation(location.display_name);

        // Save selected location
        AsyncStorage.setItem('birthLatitude', location.lat);
        AsyncStorage.setItem('birthLongitude', location.lon);
        AsyncStorage.setItem('birthLocationName', location.display_name);

        // Clear search results and hide results list
        setSearchResults([]);
        setShowResults(false);
        setSearchQuery('');
        Keyboard.dismiss();
    };

    /**
     * Manually trigger search when pressing search button
     */
    const handleSearchPress = () => {
        if (searchQuery.length >= 3) {
            searchLocation(searchQuery);
        } else {
            Alert.alert('Error', 'Please enter at least 3 characters to search');
        }
    };

    /**
     * Fetches the natal chart data from the API based on provided birth information
     * Validates inputs and handles the API request with proper error handling
     */
    const fetchNatalChartData = async () => {
        const today = new Date();

        // Combine date and time for complete validation
        const combinedBirthDateTime = new Date(
            birthDate.getFullYear(),
            birthDate.getMonth(),
            birthDate.getDate(),
            birthTime.getHours(),
            birthTime.getMinutes()
        );

        // Validate birthdate and time are not in the future
        if (combinedBirthDateTime > today) {
            Alert.alert('Validation Error', 'Birth date and time cannot be in the future.');
            return;
        }

        // Validate location has been selected
        if (latitude === 0 && longitude === 0) {
            Alert.alert('Error', 'Please select a location first');
            return;
        }

        setIsLoading(true);
        Animated.loop(
            Animated.timing(progressAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: false,
            }),
        ).start();

        try {
            // Combine date and time into a single string
            const birthDateStr = `${birthDate.toISOString().split('T')[0]}T${birthTime
                .toISOString()
                .split('T')[1]
                .slice(0, 5)}`;

            // Fetch natal chart from API
            const chart = await fetchNatalChart(birthDateStr, latitude, longitude);

            // Verify we have proper chart data
            if (!Array.isArray(chart) || chart.length === 0) {
                console.error('Received invalid or empty chart data');
                Alert.alert('Error', 'Received invalid natal chart data. Please try again.');
                return;
            }

            // Update state with the fetched chart
            setNatalChart(chart);

            // Save to AsyncStorage for use in other screens
            await AsyncStorage.setItem('natalChart', JSON.stringify(chart));

            // Save birth date and time for future use
            await AsyncStorage.setItem('birthDate', birthDate.toISOString());
            await AsyncStorage.setItem('birthTime', birthTime.toISOString());

            // Verify the save was successful
            const savedChartStr = await AsyncStorage.getItem('natalChart');

            if (!savedChartStr) {
                console.error('Failed to save chart to AsyncStorage');
                Alert.alert('Error', 'Failed to save natal chart. Please try again.');
                return;
            }

            // Hide search results if visible
            setShowResults(false);

        } catch (error) {
            console.error('Failed to fetch or save natal chart:', error);
            Alert.alert('Error', 'Failed to fetch natal chart. Please try again.');
        } finally {
            setIsLoading(false);
            progressAnim.setValue(0);
        }
    };

    /**
     * Clear selected location and related stored data
     */
    const clearSelectedLocation = () => {
        setSearchQuery('');
        setSelectedLocation(null);
        setLatitude(0);
        setLongitude(0);
        AsyncStorage.removeItem('birthLatitude');
        AsyncStorage.removeItem('birthLongitude');
        AsyncStorage.removeItem('birthLocationName');
    };

    return (
        <LinearGradient colors={['#F0F0F0', '#FFFFFF']} style={styles.container}>
            <StatusBar
                translucent
                backgroundColor="transparent"
                barStyle="light-content"
            />

            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={18} color="#333333"/>
                </TouchableOpacity>
                <Text style={styles.headerText}>Natal Chart</Text>
                <View style={{width: 40}}/>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollViewContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.inputContainer}>
                    {/* Birth Date Selection */}
                    <Text style={styles.label}>Birth Date</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                            setShowResults(false);
                            setShowDatePicker(true);
                        }}
                    >
                        <Text style={styles.dateButtonText}>{birthDate.toLocaleDateString()}</Text>
                        <Icon name="calendar" size={18} color="#333333"/>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={birthDate}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                        />
                    )}

                    {/* Birth Time Selection */}
                    <Text style={styles.label}>Birth Time</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => {
                            setShowResults(false);
                            setShowTimePicker(true);
                        }}
                    >
                        <Text style={styles.dateButtonText}>
                            {birthTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                        </Text>
                        <Icon name="clock-o" size={18} color="#333333"/>
                    </TouchableOpacity>
                    {showTimePicker && (
                        <DateTimePicker
                            value={birthTime}
                            mode="time"
                            display="default"
                            onChange={onTimeChange}
                        />
                    )}

                    {/* Location Selection */}
                    <Text style={styles.label}>Birth Location</Text>

                    {/* Location Input with selected location display */}
                    {selectedLocation ? (
                        <View style={styles.selectedLocationContainer}>
                            <View style={styles.selectedLocation}>
                                <Text
                                    style={styles.selectedLocationText}
                                    numberOfLines={2}
                                    ellipsizeMode="tail"
                                >
                                    {selectedLocation}
                                </Text>
                                <Text style={styles.coordinatesText}>
                                    Lat: {latitude.toFixed(4)}, Lon: {longitude.toFixed(4)}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.clearButton}
                                onPress={clearSelectedLocation}
                            >
                                <Icon name="times" size={18} color="#666666"/>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <View style={styles.searchContainer}>
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Enter city, address or place name"
                                    value={searchQuery}
                                    onChangeText={debouncedSearch}
                                    autoCorrect={false}
                                    onFocus={() => searchQuery.length >= 3 && setShowResults(true)}
                                />
                                <TouchableOpacity
                                    style={styles.searchButton}
                                    onPress={handleSearchPress}
                                >
                                    <Icon name="search" size={18} color="#FFFFFF"/>
                                </TouchableOpacity>
                            </View>

                            {/* Search Results */}
                            {showResults && (
                                <View style={styles.resultsContainer}>
                                    {isSearching ? (
                                        <ActivityIndicator size="small" color="#4A00E0"
                                                           style={styles.loadingIndicator}/>
                                    ) : searchResults.length > 0 ? (
                                        <ScrollView nestedScrollEnabled={true} style={styles.resultsList}>
                                            {searchResults.map((result) => (
                                                <TouchableOpacity
                                                    key={result.place_id}
                                                    style={styles.resultItem}
                                                    onPress={() => selectLocationResult(result)}
                                                >
                                                    <Text style={styles.resultText} numberOfLines={2}
                                                          ellipsizeMode="tail">
                                                        {result.display_name}
                                                    </Text>
                                                    <Text style={styles.resultCoords}>
                                                        Lat: {parseFloat(result.lat).toFixed(4)},
                                                        Lon: {parseFloat(result.lon).toFixed(4)}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    ) : searchQuery.length >= 3 ? (
                                        <Text style={styles.noResultsText}>No locations found</Text>
                                    ) : searchQuery.length > 0 ? (
                                        <Text style={styles.noResultsText}>Enter at least 3 characters</Text>
                                    ) : null}
                                </View>
                            )}
                        </>
                    )}

                    {/* Fetch Button */}
                    <TouchableOpacity
                        style={[styles.addButton, {marginTop: 16}]}
                        onPress={fetchNatalChartData}
                        disabled={isLoading}
                    >
                        <LinearGradient colors={['#4A00E0', '#8E2DE2']} style={styles.addButtonGradient}>
                            <Text style={styles.addButtonText}>
                                {isLoading ? 'Generating Chart...' : 'Get Natal Chart'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Loading Progress Bar */}
                    {isLoading && (
                        <Animated.View
                            style={[
                                styles.progressBar,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                },
                            ]}
                        />
                    )}
                </View>

                {/* Display Natal Chart Data */}
                {natalChart.length > 0 && (
                    <View style={styles.natalChartContainer}>
                        <Text style={styles.sectionTitle}>Natal Chart Data</Text>
                        {natalChart.map((item, index) => (
                            <View key={index} style={styles.natalItem}>
                                <Text style={styles.eventItem}>
                                    <Text style={styles.planetText}>{item.name}</Text>: {item.sign}{' '}
                                    {item.degreeInSign.toFixed(2)}° (Longitude: {item.longitude.toFixed(2)}°)
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 50,
        marginBottom: 10,
        paddingHorizontal: 16,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333333',
    },
    backButton: {
        backgroundColor: '#E0E0E0',
        padding: 8,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
        height: 40,
    },
    scrollViewContent: {
        paddingTop: 10,
        paddingBottom: 40,
        paddingHorizontal: 16
    },
    inputContainer: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
        position: 'relative',
        zIndex: 1,
    },
    natalChartContainer: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 12,
    },
    natalItem: {
        backgroundColor: '#F5F5F5',
        padding: 10,
        borderRadius: 8,
        marginBottom: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
        marginBottom: 8,
    },
    dateButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#E0E0E0',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    dateButtonText: {color: '#333333', fontSize: 16},
    searchContainer: {
        flexDirection: 'row',
        marginBottom: 6,
        alignItems: 'center',
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        marginRight: 8,
        fontSize: 16,
    },
    searchButton: {
        backgroundColor: '#4A00E0',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
    },
    selectedLocationContainer: {
        flexDirection: 'row',
        backgroundColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        alignItems: 'center',
    },
    selectedLocation: {
        flex: 1,
    },
    selectedLocationText: {
        fontSize: 16,
        color: '#333333',
        marginBottom: 4,
    },
    clearButton: {
        padding: 8,
    },
    coordinatesText: {
        fontSize: 12,
        color: '#666666',
        fontStyle: 'italic',
    },
    resultsContainer: {
        backgroundColor: '#F5F5F5',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        marginBottom: 16,
        maxHeight: 200,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    resultsList: {
        maxHeight: 200,
    },
    loadingIndicator: {
        padding: 16,
    },
    resultItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    resultText: {
        fontSize: 16,
        color: '#333333',
        marginBottom: 4,
    },
    resultCoords: {
        fontSize: 12,
        color: '#666666',
    },
    noResultsText: {
        fontSize: 14,
        color: '#666666',
        textAlign: 'center',
        padding: 16,
    },
    webDateInput: {
        backgroundColor: '#E0E0E0',
        color: '#333333',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 16,
        borderWidth: 0,
    },
    addButton: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    addButtonGradient: {padding: 14, alignItems: 'center'},
    addButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
    eventItem: {color: '#333333', fontSize: 16},
    planetText: {color: '#4CAF50', fontWeight: 'bold'},
    progressBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 3,
        backgroundColor: '#4A00E0',
    },
});

export default NatalChartScreen;