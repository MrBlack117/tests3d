/**
 * Event item component for displaying astrological events in a list.
 *
 * This component renders an individual event with:
 * - Event name and all relevant dates (start, peak, end)
 * - Associated planet
 * - Visual indicator for positive/negative influence
 * - Loading state visualization
 * - Delete button functionality
 *
 * The component implements a simplified UX where a single click either
 * navigates directly to animation (if data is available) or triggers
 * loading with automatic navigation after completion.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Event } from '../types';

interface EventItemProps {
    item: Event;
    index: number;
    onSelect: (event: Event) => void;
    onDelete: (index: number) => void;
}

/**
 * Formats a date string into a DD.MM.YYYY format.
 * @param dateString ISO format date string
 * @returns Formatted date string (e.g., "11.11.2011")
 */
const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
};

/**
 * EventItem component renders an individual event in the list
 */
const EventItem: React.FC<EventItemProps> = ({ item, index, onSelect, onDelete }) => {
    // Transit events have a special label to distinguish them
    const isTransit = item.isTransitEvent;

    // Normalize dates to compare them (ignoring time components)
    const startDate = new Date(item.startDate).toDateString();
    const peakDate = new Date(item.peakDate).toDateString();
    const endDate = new Date(item.endDate).toDateString();

    // Determine which dates to show
    const showStart = startDate !== peakDate;
    const showEnd = endDate !== peakDate && endDate !== startDate;

    // If the event is currently loading, render a loading state
    if (item.isLoading) {
        return (
            <View style={[styles.itemContainer, styles.loadingItem]}>
                <View style={styles.itemContent}>
                    <View style={styles.nameContainer}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.loadingText}>Loading planetary data...</Text>
                    </View>
                    <ActivityIndicator size="small" color="#4A00E0" />
                </View>

                {/* Influence indicator remains visible during loading */}
                <View style={[
                    styles.influenceIndicator,
                    item.influence === 'positive' ? styles.positiveInfluence : styles.negativeInfluence
                ]} />
            </View>
        );
    }

    // Normal (non-loading) event display
    return (
        <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
        >
            <View style={styles.itemContent}>
                <View style={styles.nameContainer}>
                    <Text style={styles.itemName}>{item.name}</Text>

                    {/* Inline dates display */}
                    <View style={styles.datesContainer}>
                        {showStart && (
                            <>
                                <Text style={styles.dateValue}>{formatDate(item.startDate)}</Text>
                                <Text style={styles.dateSeparator}> — </Text>
                            </>
                        )}
                        <Text style={styles.peakDateValue}>{formatDate(item.peakDate)}</Text>
                        {showEnd && (
                            <>
                                <Text style={styles.dateSeparator}> — </Text>
                                <Text style={styles.dateValue}>{formatDate(item.endDate)}</Text>
                            </>
                        )}
                    </View>

                    {/* Transit label if applicable */}
                    {isTransit && (
                        <View style={styles.transitBadge}>
                            <Text style={styles.transitText}>Transit</Text>
                        </View>
                    )}
                </View>

                <View style={styles.rightContainer}>
                    <View style={styles.planetContainer}>
                        <Text style={styles.planetName}>{item.planet}</Text>
                    </View>

                    {/* Delete button */}
                    <TouchableOpacity
                        onPress={() => onDelete(index)}
                        style={styles.deleteButton}
                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                        <Icon name="trash" size={16} color="#999999" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Colored bar indicating positive/negative influence */}
            <View style={[
                styles.influenceIndicator,
                item.influence === 'positive' ? styles.positiveInfluence : styles.negativeInfluence
            ]} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    itemContainer: {
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        backgroundColor: '#FFFFFF',
        borderColor: '#E0E0E0',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        position: 'relative',
        overflow: 'hidden',
    },
    loadingItem: {
        backgroundColor: 'rgba(245, 245, 250, 0.9)',
        borderColor: '#E0E0E0',
    },
    loadingText: {
        fontSize: 12,
        color: '#666666',
        marginTop: 2,
    },
    itemContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    nameContainer: {
        flexDirection: 'column',
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333333',
        marginBottom: 6,
    },
    datesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    dateValue: {
        fontSize: 12,
        color: '#666666',
    },
    peakDateValue: {
        fontSize: 12,
        color: '#4A00E0',
        fontWeight: '500',
    },
    dateSeparator: {
        fontSize: 12,
        color: '#999999',
        marginHorizontal: 4,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    planetContainer: {
        backgroundColor: '#F0F0F0',
        borderRadius: 16,
        paddingVertical: 4,
        paddingHorizontal: 10,
        marginRight: 10,
    },
    planetName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#555555',
    },
    deleteButton: {
        padding: 5,
    },
    transitBadge: {
        backgroundColor: '#E0E7FF',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    transitText: {
        fontSize: 10,
        color: '#4A00E0',
        fontWeight: '500',
    },
    influenceIndicator: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 6,
    },
    positiveInfluence: {
        backgroundColor: '#34C759',
    },
    negativeInfluence: {
        backgroundColor: '#FF3B30',
    },
});

export default EventItem;