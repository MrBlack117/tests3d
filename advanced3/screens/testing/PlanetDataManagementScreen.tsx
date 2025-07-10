import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PlanetDataService from '../../utils/PlanetDataService';
import { useNavigation } from '../../navigation/AppNavigator';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { PlanetData } from '../../types';

const PlanetDataManagementScreen = () => {
    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(false);
    const [storedData, setStoredData] = useState<{[date: string]: PlanetData[]}>({});
    const [dateKeys, setDateKeys] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showDetails, setShowDetails] = useState<boolean>(false);
    const [isInitializing, setIsInitializing] = useState(false);

    // State variables for selecting date range to load data
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 3)));
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);
    const [isLoadingRange, setIsLoadingRange] = useState(false);

    // Load data on initial render
    useEffect(() => {
        loadStoredData();
    }, []);

    // Function to load all stored data
    const loadStoredData = async () => {
        setIsLoading(true);
        try {
            // Retrieve storage metadata
            const range = await PlanetDataService.getDataAvailabilityRange();
            if (!range) {
                setDateKeys([]);
                setStoredData({});
                setIsLoading(false);
                return;
            }

            // Get list of all dates in the range
            const startDate = new Date(range.start);
            const endDate = new Date(range.end);
            const datesList: string[] = [];

            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                datesList.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }

            setDateKeys(datesList);

            // Load data for the first date, if available
            if (datesList.length > 0) {
                const firstDateData = await PlanetDataService.getPlanetDataForDate(datesList[0]);
                if (firstDateData) {
                    setStoredData({ [datesList[0]]: firstDateData });
                    setSelectedDate(datesList[0]);
                }
            }

        } catch (error) {
            console.error('Failed to load stored data:', error);
            Alert.alert('Error', 'Failed to load planet data.');
        } finally {
            setIsLoading(false);
        }
    };

    // Load data for a specific date
    const loadDateData = async (date: string) => {
        setIsLoading(true);
        try {
            const data = await PlanetDataService.getPlanetDataForDate(date);
            if (data) {
                setStoredData(prev => ({ ...prev, [date]: data }));
                setSelectedDate(date);
            } else {
                Alert.alert('Information', `No data found for ${date}`);
            }
        } catch (error) {
            console.error(`Failed to load data for ${date}:`, error);
        } finally {
            setIsLoading(false);
        }
    };

    // Load data for the selected range
    const loadDataForSelectedRange = async () => {
        if (!startDate || !endDate) {
            Alert.alert('Error', 'Please select both start and end dates.');
            return;
        }

        if (startDate > endDate) {
            Alert.alert('Error', 'Start date cannot be after end date.');
            return;
        }

        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        setIsLoadingRange(true);
        try {
            await PlanetDataService.fetchAndStoreDataForRange(startStr, endStr);
            Alert.alert('Success', `Data loaded for range: ${startStr} to ${endStr}`);

            // Important: Completely refresh the list of available dates
            await loadStoredData();

            // After loading, select the first date of the new range for display
            const newDateData = await PlanetDataService.getPlanetDataForDate(startStr);
            if (newDateData) {
                setStoredData(prev => ({ ...prev, [startStr]: newDateData }));
                setSelectedDate(startStr);
            }
        } catch (error) {
            console.error('Failed to load data for range:', error);
            Alert.alert('Error', 'Failed to load data for selected range.');
        } finally {
            setIsLoadingRange(false);
        }
    };

    // Function to initialize data for 3 months
    const initializeDefaultData = async () => {
        setIsInitializing(true);
        try {
            await PlanetDataService.initializeDataStore();
            Alert.alert('Success', 'Data initialized for current month + 2 months ahead');
            loadStoredData(); // Refresh the data list
        } catch (error) {
            console.error('Failed to initialize default data:', error);
            Alert.alert('Error', 'Failed to initialize default data');
        } finally {
            setIsInitializing(false);
        }
    };

    // Clear all data
    const clearAllData = async () => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete all planet data? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            await PlanetDataService.clearAllData();
                            setDateKeys([]);
                            setStoredData({});
                            setSelectedDate(null);
                            Alert.alert('Success', 'All planet data has been deleted.');
                        } catch (error) {
                            console.error('Failed to clear data:', error);
                            Alert.alert('Error', 'Failed to delete planet data.');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Format PlanetData object for display
    const formatPlanetDataValue = (value: number): string => {
        return value.toFixed(4);
    };

    // Render the data table
    const renderDataTable = () => {
        if (!selectedDate || !storedData[selectedDate]) {
            return <Text style={styles.noDataText}>No data selected</Text>;
        }

        const planetNames = [
            'Sun', 'Mercury', 'Venus', 'Earth', 'Mars',
            'Jupiter', 'Saturn', 'Uranus', 'Neptune'
        ];

        const data = storedData[selectedDate];

        return (
            <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Planet</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1 }]}>M0</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1 }]}>e</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1 }]}>i</Text>
                    {showDetails && (
                        <>
                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>om</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>w</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>a</Text>
                            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>T</Text>
                        </>
                    )}
                </View>

                <View style={styles.tableBodyContainer}>
                    {data.map((planetData, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 1.5 }]}>{planetNames[index]}</Text>
                            {/* Добавляем проверку на null */}
                            <Text style={[styles.tableCell, { flex: 1 }]}>
                                {planetData ? formatPlanetDataValue(planetData.M0) : 'N/A'}
                            </Text>
                            <Text style={[styles.tableCell, { flex: 1 }]}>
                                {planetData ? formatPlanetDataValue(planetData.e) : 'N/A'}
                            </Text>
                            <Text style={[styles.tableCell, { flex: 1 }]}>
                                {planetData ? formatPlanetDataValue(planetData.i) : 'N/A'}
                            </Text>
                            {showDetails && (
                                <>
                                    <Text style={[styles.tableCell, { flex: 1 }]}>
                                        {planetData ? formatPlanetDataValue(planetData.om) : 'N/A'}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1 }]}>
                                        {planetData ? formatPlanetDataValue(planetData.w) : 'N/A'}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1 }]}>
                                        {planetData ? formatPlanetDataValue(planetData.a) : 'N/A'}
                                    </Text>
                                    <Text style={[styles.tableCell, { flex: 1 }]}>
                                        {planetData ? formatPlanetDataValue(planetData.T) : 'N/A'}
                                    </Text>
                                </>
                            )}
                        </View>
                    ))}
                </View>
            </View>
        );
    };


    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <Text style={styles.title}>Planet Data Management</Text>

                {/* Display number of available dates and date selection */}
                <View style={styles.statsContainer}>
                    <Text style={styles.statsText}>Available dates: {dateKeys.length}</Text>
                </View>

                {/* Date selection list */}
                <View style={styles.datePickerContainer}>
                    <Text style={styles.sectionTitle}>Select Date to View</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.datesList}
                        nestedScrollEnabled={true}
                    >
                        {dateKeys.map((date) => (
                            <TouchableOpacity
                                key={date}
                                style={[
                                    styles.dateButton,
                                    selectedDate === date && styles.dateButtonSelected
                                ]}
                                onPress={() => loadDateData(date)}
                            >
                                <Text style={[
                                    styles.dateButtonText,
                                    selectedDate === date && styles.dateButtonTextSelected
                                ]}>
                                    {date}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Toggle for showing detailed information */}
                <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>Show all parameters:</Text>
                    <TouchableOpacity
                        style={[styles.switchButton, showDetails && styles.switchButtonActive]}
                        onPress={() => setShowDetails(!showDetails)}
                    >
                        <Text style={styles.switchButtonText}>{showDetails ? 'ON' : 'OFF'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Таблица с данными */}
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#4A00E0" />
                        <Text style={styles.loadingText}>Loading data...</Text>
                    </View>
                ) : (
                    renderDataTable()
                )}

                {/* Выбор диапазона дат для загрузки */}
                <View style={styles.rangePickerContainer}>
                    <Text style={styles.sectionTitle}>Load Data for Date Range</Text>

                    <View style={styles.dateRangeRow}>
                        <TouchableOpacity
                            style={styles.datePickButton}
                            onPress={() => setShowStartDatePicker(true)}
                        >
                            <Text style={styles.datePickButtonText}>Start: {startDate.toISOString().split('T')[0]}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.datePickButton}
                            onPress={() => setShowEndDatePicker(true)}
                        >
                            <Text style={styles.datePickButtonText}>End: {endDate.toISOString().split('T')[0]}</Text>
                        </TouchableOpacity>
                    </View>

                    {showStartDatePicker && (
                        <DateTimePicker
                            value={startDate}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowStartDatePicker(false);
                                if (selectedDate) {
                                    setStartDate(selectedDate);
                                }
                            }}
                        />
                    )}

                    {showEndDatePicker && (
                        <DateTimePicker
                            value={endDate}
                            mode="date"
                            display="default"
                            onChange={(event, selectedDate) => {
                                setShowEndDatePicker(false);
                                if (selectedDate) {
                                    setEndDate(selectedDate);
                                }
                            }}
                        />
                    )}

                    {/* Улучшенная кнопка для загрузки данных на выбранный диапазон */}
                    <TouchableOpacity
                        style={styles.loadRangeButton}
                        onPress={loadDataForSelectedRange}
                        disabled={isLoadingRange}
                    >
                        <LinearGradient
                            colors={['#FF6F00', '#F57C00']}  // Изменен цвет для лучшего выделения
                            style={styles.loadRangeButtonGradient}
                        >
                            {isLoadingRange ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Icon name="date-range" size={20} color="#FFFFFF" />
                                    <Text style={styles.loadRangeButtonText}>Load Data for Selected Range</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Действия с данными */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[styles.actionButton, { flex: 1 }]}
                        onPress={initializeDefaultData}
                        disabled={isInitializing}
                    >
                        <LinearGradient
                            colors={['#4CAF50', '#388E3C']}
                            style={styles.actionButtonGradient}
                        >
                            {isInitializing ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Icon name="cloud-download" size={20} color="#FFFFFF" />
                                    <Text style={styles.actionButtonText}>Initialize 3-Month Data</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Вторая группа кнопок */}
                <View style={[styles.actionsContainer, { marginTop: 8 }]}>
                    <TouchableOpacity style={styles.actionButton} onPress={clearAllData}>
                        <LinearGradient
                            colors={['#F44336', '#D32F2F']}
                            style={styles.actionButtonGradient}
                        >
                            <Icon name="delete-forever" size={20} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Clear All Data</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionButton} onPress={loadStoredData}>
                        <LinearGradient
                            colors={['#2196F3', '#1976D2']}
                            style={styles.actionButtonGradient}
                        >
                            <Icon name="refresh" size={20} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Refresh List</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Кнопка возврата */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Back to Test Menu</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 30,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statsText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    datePickerContainer: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#444',
    },
    datesList: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    dateButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#E0E0E0',
        borderRadius: 6,
        marginRight: 8,
    },
    dateButtonSelected: {
        backgroundColor: '#4A00E0',
    },
    dateButtonText: {
        color: '#333',
        fontSize: 14,
    },
    dateButtonTextSelected: {
        color: '#FFFFFF',
    },
    switchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    switchLabel: {
        fontSize: 14,
        color: '#555',
        marginRight: 10,
    },
    switchButton: {
        backgroundColor: '#E0E0E0',
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    switchButtonActive: {
        backgroundColor: '#4CAF50',
    },
    switchButtonText: {
        color: '#333',
        fontSize: 12,
        fontWeight: 'bold',
    },
    tableContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 8,
        height: 440,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        backgroundColor: '#F5F5F5',
    },
    tableHeaderCell: {
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 12,
        color: '#333',
    },
    tableBodyContainer: {
        // Максимальная высота тела таблицы
        maxHeight: 220,  // Оставляем место для заголовков таблицы
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    tableCell: {
        textAlign: 'center',
        fontSize: 11,
        color: '#666',
    },
    noDataText: {
        textAlign: 'center',
        padding: 20,
        color: '#888',
        fontStyle: 'italic',
    },
    rangePickerContainer: {
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    dateRangeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    datePickButton: {
        flex: 1,
        backgroundColor: '#F0F0F0',
        padding: 10,
        borderRadius: 6,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    datePickButtonText: {
        color: '#333',
        fontSize: 14,
    },
    loadRangeButton: {
        marginTop: 12,
        borderRadius: 8,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    loadRangeButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    loadRangeButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    actionButton: {
        flex: 1,
        marginHorizontal: 4,
        borderRadius: 6,
        overflow: 'hidden',
    },
    actionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        marginLeft: 6,
    },
    backButton: {
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    backButtonText: {
        color: '#4A00E0',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    }
});

export default PlanetDataManagementScreen;