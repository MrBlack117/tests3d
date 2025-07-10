/**
 * A customizable date range selector component with calendar visualization.
 *
 * This component provides an interactive calendar interface for selecting date ranges,
 * with features including:
 * - Visual highlighting of the selected date range
 * - Navigation between months
 * - Two-step selection process (start date followed by end date)
 * - Automatic range adjustment for logical date selection
 * - Visual indicators for today's date and selected range
 *
 * The component handles edge cases like selecting end dates before start dates
 * by automatically swapping values to ensure valid ranges.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

interface CalendarRangeProps {
    startDate: Date;
    endDate: Date;
    onRangeSelected: (start: Date, end: Date) => void;
}

const CalendarRange: React.FC<CalendarRangeProps> = ({ startDate, endDate, onRangeSelected }) => {
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date(startDate));
    const [selectedStart, setSelectedStart] = useState<Date>(startDate);
    const [selectedEnd, setSelectedEnd] = useState<Date>(endDate);
    const [selectionMode, setSelectionMode] = useState<'start' | 'end'>('start');

    // Update when input props change
    useEffect(() => {
        setSelectedStart(startDate);
        setSelectedEnd(endDate);
    }, [startDate, endDate]);

    /**
     * Returns the number of days in a given month.
     * Handles leap years and varying month lengths automatically.
     */
    const getDaysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    /**
     * Returns the day of week (0-6) for the first day of a month.
     * Used for proper calendar grid alignment.
     */
    const getFirstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    // Switch to previous month
    const prevMonth = () => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() - 1);
        setCurrentMonth(newMonth);
    };

    // Switch to next month
    const nextMonth = () => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(newMonth.getMonth() + 1);
        setCurrentMonth(newMonth);
    };

    // Month names for header display
    const monthNames = [
        'January', 'February', 'March', 'April',
        'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'
    ];

    // Day names for column headers
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    /**
     * Handles date selection logic including:
     * - Determining if selecting start or end date
     * - Managing valid date ranges
     * - Swapping dates if end is selected before start
     * - Notifying parent component of changes
     */
    const selectDate = (date: Date) => {
        if (selectionMode === 'start') {
            // When selecting start date
            setSelectedStart(date);
            // If selected start date is after end date, move end date
            if (date > selectedEnd) {
                const newEnd = new Date(date);
                newEnd.setDate(date.getDate() + 3); // Default 3-day period
                setSelectedEnd(newEnd);
            }
            setSelectionMode('end');
        } else {
            // When selecting end date
            if (date < selectedStart) {
                // If selected end date is before start date, swap them
                setSelectedEnd(selectedStart);
                setSelectedStart(date);
            } else {
                setSelectedEnd(date);
            }
            setSelectionMode('start');

            // Call callback with updated range
            const finalStart = date < selectedStart ? date : selectedStart;
            const finalEnd = date >= selectedStart ? date : selectedStart;
            onRangeSelected(finalStart, finalEnd);
        }
    };

    // Memoized function to check if date is within selected range
    const isInRange = useMemo(() => {
        return (date: Date) => date >= selectedStart && date <= selectedEnd;
    }, [selectedStart, selectedEnd]);

    // Memoized function to check if date is start or end date of range
    const isRangeEdge = useMemo(() => {
        return (date: Date) => {
            return date.getTime() === selectedStart.getTime() ||
                date.getTime() === selectedEnd.getTime();
        };
    }, [selectedStart, selectedEnd]);

    /**
     * Generates and renders the calendar grid with appropriate styling
     * for selected dates, today's date, and date range.
     */
    const renderCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const today = new Date();

        const days = [];
        // Add empty cells for first day offset
        for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
            days.push(
                <View key={`empty-${i}`} style={styles.calendarDay} />
            );
        }

        // Add month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = today.toDateString() === date.toDateString();
            const inRange = isInRange(date);
            const isEdge = isRangeEdge(date);

            days.push(
                <TouchableOpacity
                    key={`day-${day}`}
                    style={[
                        styles.calendarDay,
                        inRange && styles.dayInRange,
                        isEdge && styles.rangeEdgeDay,
                    ]}
                    onPress={() => selectDate(date)}
                >
                    <Text
                        style={[
                            styles.calendarDayText,
                            isToday && styles.todayText,
                            inRange && styles.dayInRangeText,
                            isEdge && styles.rangeEdgeText,
                        ]}
                    >
                        {day}
                    </Text>
                </TouchableOpacity>
            );
        }

        return days;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
                    <Icon name="chevron-left" size={16} color="#333" />
                </TouchableOpacity>
                <Text style={styles.monthYearText}>
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                    <Icon name="chevron-right" size={16} color="#333" />
                </TouchableOpacity>
            </View>

            <View style={styles.weekDays}>
                {weekDays.map((day) => (
                    <Text key={day} style={styles.weekDayText}>
                        {day}
                    </Text>
                ))}
            </View>

            <View style={styles.calendarGrid}>
                {renderCalendarDays()}
            </View>

            <View style={styles.rangeInfo}>
                <Text style={styles.rangeText}>
                    Selected period: {selectedStart.toLocaleDateString()} — {selectedEnd.toLocaleDateString()}
                </Text>
                <Text style={styles.instructionText}>
                    {selectionMode === 'start' ? 'Select start date' : 'Select end date'}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 10,
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    navButton: {
        padding: 10,
    },
    monthYearText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    weekDays: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 10,
    },
    weekDayText: {
        fontSize: 12,
        color: '#666',
        width: '14.28%',
        textAlign: 'center',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarDay: {
        width: '14.28%',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarDayText: {
        fontSize: 14,
        color: '#333',
    },
    todayText: {
        fontWeight: 'bold',
        color: '#4A00E0',
    },
    dayInRange: {
        backgroundColor: 'rgba(74, 0, 224, 0.1)',
    },
    dayInRangeText: {
        color: '#4A00E0',
    },
    rangeEdgeDay: {
        backgroundColor: '#4A00E0',
        borderRadius: 20,
        overflow: 'hidden',
    },
    rangeEdgeText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    rangeInfo: {
        marginTop: 16,
        padding: 10,
        backgroundColor: 'rgba(74, 0, 224, 0.05)',
        borderRadius: 8,
    },
    rangeText: {
        color: '#333',
        textAlign: 'center',
        marginBottom: 4,
    },
    instructionText: {
        color: '#666',
        textAlign: 'center',
        fontSize: 12,
        fontStyle: 'italic',
    }
});

export default CalendarRange;