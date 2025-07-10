/**
 * A screen component for creating new planetary events in the astrology application.
 *
 * This component provides a form interface for users to:
 * - Enter event names with validation
 * - Select dates with a native date picker
 * - Choose planets from a dropdown selector
 * - Set positive/negative influence types
 *
 * Events are saved to AsyncStorage and integrated with the app's
 * custom navigation system for a seamless user experience.
 */

import React, {useState} from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert, StatusBar,
} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {Picker} from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Event} from '../types';
import Icon from 'react-native-vector-icons/FontAwesome';
import {useNavigation} from '../navigation/AppNavigator';

const AddEventScreen: React.FC = () => {
    // Get navigation from our custom hook instead of props
    const navigation = useNavigation();

    // State for form fields
    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date());
    const [planet, setPlanet] = useState('Mercury');
    const [influence, setInfluence] = useState<'positive' | 'negative'>('positive');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Available planets for selection (excluding Earth and Sun)
    const planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];

    /**
     * Handles date selection from the date picker
     * Closes the picker and updates the date if a selection was made
     */
    const onDateChange = (_event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    /**
     * Validates the event form input
     * Checks for empty name, name length, and past dates
     * @returns boolean indicating if form is valid
     */
    const validateForm = (): boolean => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Event name cannot be empty.');
            return false;
        }
        if (name.length > 120) {
            Alert.alert('Validation Error', 'Event name cannot exceed 120 characters.');
            return false;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
            Alert.alert('Validation Error', 'Event date cannot be in the past.');
            return false;
        }
        return true;
    };

    /**
     * Saves the new event to AsyncStorage
     * Creates an Event object from the form data and adds it to existing events
     */
    const saveEvent = async () => {
        // Form validation
        if (!validateForm()) {
            return;
        }

        const eventDate = date.toISOString().split('T')[0];
        const newEvent: Event = {
            name,
            startDate: eventDate,
            endDate: eventDate,
            peakDate: eventDate,
            planet,
            influence,
            isLoading: false,
        };

        try {
            // Load existing events from storage
            const savedEvents = await AsyncStorage.getItem('events');
            let events: Event[] = savedEvents ? JSON.parse(savedEvents) : [];
            events.push(newEvent);
            await AsyncStorage.setItem('events', JSON.stringify(events));
            console.log('Saved new event to AsyncStorage:', newEvent);

            // Use goBack instead of pop with our custom navigation
            navigation.goBack();
        } catch (error) {
            console.error('Error saving event to AsyncStorage:', error);
        }

        // Reset form
        setName('');
        setDate(new Date());
        setPlanet('Mercury');
        setInfluence('positive');
    };

    return (
        <LinearGradient colors={['#F0F0F0', '#FFFFFF']} style={styles.container}>
            <StatusBar
                translucent
                backgroundColor="transparent"
                barStyle="light-content"
            />
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                {/* Header with back button */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Icon name="arrow-left" size={18} color="#333333"/>
                    </TouchableOpacity>
                    <Text style={styles.headerText}>Add New Event</Text>
                    <View style={{width: 40}}/>
                </View>

                <View style={styles.inputContainer}>
                    {/* Event Name Input */}
                    <Text style={styles.label}>Event Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter event name"
                        placeholderTextColor="#999999"
                        value={name}
                        onChangeText={setName}
                    />

                    {/* Date Selection */}
                    <Text style={styles.label}>Event Date</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.dateButtonText}>
                            {date.toLocaleDateString()}
                        </Text>
                        <Icon name="calendar" size={18} color="#333333"/>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                        />
                    )}

                    {/* Planet Selection */}
                    <Text style={styles.label}>Planet</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={planet}
                            style={styles.picker}
                            onValueChange={(itemValue) => setPlanet(itemValue as string)}
                        >
                            {planets.map((p) => (
                                <Picker.Item key={p} label={p} value={p} color="#333333"/>
                            ))}
                        </Picker>
                    </View>

                    {/* Influence Type Selection (Positive/Negative) */}
                    <Text style={styles.label}>Influence</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[
                                styles.influenceButton,
                                influence === 'positive' && styles.influenceButtonActivePositive,
                            ]}
                            onPress={() => setInfluence('positive')}
                        >
                            <Icon
                                name="smile-o"
                                size={18}
                                color={influence === 'positive' ? '#FFFFFF' : '#333333'}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.influenceButton,
                                influence === 'negative' && styles.influenceButtonActiveNegative,
                            ]}
                            onPress={() => setInfluence('negative')}
                        >
                            <Icon
                                name="frown-o"
                                size={18}
                                color={influence === 'negative' ? '#FFFFFF' : '#333333'}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity style={styles.addButton} onPress={saveEvent}>
                        <LinearGradient
                            colors={['#4A00E0', '#8E2DE2']}
                            style={styles.addButtonGradient}
                        >
                            <Text style={styles.addButtonText}>Save Event</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {flex: 1},
    scrollViewContent: {paddingBottom: 20, paddingHorizontal: 16},
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 50,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    headerText: {fontSize: 20, fontWeight: 'bold', color: '#333333'},
    backButton: {
        backgroundColor: '#E0E0E0',
        padding: 8,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
        height: 40,
    },
    inputContainer: {
        marginTop: 10,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    label: {fontSize: 16, fontWeight: '600', color: '#333333', marginBottom: 8},
    input: {
        backgroundColor: '#E0E0E0',
        color: '#333333',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        fontSize: 16,
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
    pickerContainer: {
        backgroundColor: '#E0E0E0',
        borderRadius: 8,
        marginBottom: 16,
    },
    picker: {color: '#333333', height: 50},
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 10,
    },
    influenceButton: {
        flex: 1,
        backgroundColor: '#E0E0E0',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    influenceButtonActivePositive: {backgroundColor: '#4CAF50'},
    influenceButtonActiveNegative: {backgroundColor: '#F44336'},
    addButton: {borderRadius: 8, overflow: 'hidden'},
    addButtonGradient: {padding: 14, alignItems: 'center'},
    addButtonText: {color: '#FFFFFF', fontSize: 16, fontWeight: 'bold'},
});

export default AddEventScreen;