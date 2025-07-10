/**
 * Utility functions for event management and astrological calculations.
 * Provides helper functions for fetching, creating, and validating events.
 *
 * Functions:
 * - Loading and saving events from/to storage
 * - Loading natal chart data
 * - Date formatting for API requests
 * - Date validation for events
 * - Creating transit events
 * - Checking for astrological aspects
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Event, NatalChartEntry } from '../types';

/**
 * Formats a date to the format required by the JPL Horizons API
 * Converts a date to the "YYYY-MMM-DD" format (e.g., 2025-Jan-01)
 */
export function formatDateForHorizons(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
        throw new Error(`Invalid date: ${date}`);
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = d.getFullYear();
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Validates date range for transit event fetching
 * @returns Error message if invalid, null if valid
 */
export function validateDateRange(startDate: Date, endDate: Date): string | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return 'Invalid date selected. Please choose valid dates.';
    }

    if (startDate < today) {
        return 'Start date cannot be in the past.';
    }

    if (endDate < today) {
        return 'End date cannot be in the past.';
    }

    if (endDate <= startDate) {
        return 'End date must be after the start date.';
    }

    return null;
}

/**
 * Loads events from AsyncStorage
 * @param testEvent Optional default test event to include if no events are saved
 */
export async function loadEventsFromStorage(testEvent?: Event): Promise<Event[]> {
    try {
        const savedEvents = await AsyncStorage.getItem('events');
        console.log('STORAGE: Loading events from storage - status:', savedEvents ? 'Found' : 'Not found');

        let initialEvents: Event[] = savedEvents ? JSON.parse(savedEvents) : [];

        // Add test event only if provided and not already in the list
        if (testEvent && Object.keys(testEvent).length > 0) {
            const hasTestEvent = initialEvents.some(
                (event) => event.name === testEvent.name && event.peakDate === testEvent.peakDate
            );
            if (!hasTestEvent) initialEvents = [testEvent, ...initialEvents];
        }

        return initialEvents;
    } catch (error) {
        console.error('STORAGE ERROR: Failed loading events from AsyncStorage:', error);
        return testEvent && Object.keys(testEvent).length > 0 ? [testEvent] : [];
    }
}

/**
 * Saves events to AsyncStorage
 */
export async function saveEventsToStorage(events: Event[]): Promise<boolean> {
    try {
        await AsyncStorage.setItem('events', JSON.stringify(events));
        console.log('STORAGE: Saved events to storage, count:', events.length);
        return true;
    } catch (error) {
        console.error('STORAGE ERROR: Failed saving events to AsyncStorage:', error);
        return false;
    }
}

/**
 * Loads natal chart data from AsyncStorage
 */
export async function loadNatalChart(): Promise<NatalChartEntry[] | null> {
    try {
        const natalChartStr = await AsyncStorage.getItem('natalChart');
        console.log('NATAL CHART: Loading from storage - status:',
            natalChartStr ? `Found (${JSON.parse(natalChartStr).length} planets)` : 'Not found or empty');

        if (!natalChartStr) return null;

        const chart = JSON.parse(natalChartStr);
        if (!Array.isArray(chart) || chart.length === 0) {
            console.warn('NATAL CHART: Retrieved invalid data format or empty array');
            return null;
        }

        return chart;
    } catch (error) {
        console.error('NATAL CHART ERROR: Failed loading from AsyncStorage:', error);
        return null;
    }
}

/**
 * Checks if a natal chart exists in AsyncStorage
 */
export async function checkNatalChartExists(): Promise<boolean> {
    try {
        const natalChartStr = await AsyncStorage.getItem('natalChart');

        // Improved validation to check for valid data structure
        let isValid = false;

        if (natalChartStr) {
            try {
                const chart = JSON.parse(natalChartStr);
                isValid = Array.isArray(chart) && chart.length > 0;
            } catch (parseError) {
                console.error('NATAL CHART ERROR: Invalid JSON format:', parseError);
                isValid = false;
            }
        }

        console.log('NATAL CHART: Existence check - status:',
            isValid ? 'Valid chart exists' : 'No valid chart found',
            'Raw data length:', natalChartStr?.length || 0);

        return isValid;
    } catch (error) {
        console.error('NATAL CHART ERROR: Failed checking existence:', error);
        return false;
    }
}

/**
 * Calculates if there is an aspect between two planetary positions
 * @param natalLongitude Longitude of the natal planet
 * @param transitLongitude Longitude of the transit planet
 * @param aspectAngle Angle of the aspect to check for
 * @param orb Maximum allowed deviation from the exact aspect angle
 * @returns The difference if within orb, null otherwise
 */
export function checkForAspect(
    natalLongitude: number,
    transitLongitude: number,
    aspectAngle: number,
    orb: number
): number | null {
    // Calculate minimum difference accounting for 360° circle
    const diff = Math.min(
        Math.abs(transitLongitude - natalLongitude - aspectAngle),
        Math.abs(transitLongitude - natalLongitude - aspectAngle + 360),
        Math.abs(transitLongitude - natalLongitude - aspectAngle - 360)
    );

    return diff <= orb ? diff : null;
}

/**
 * Type for astrological aspects
 */
export type AspectType =
    | 'Conjunction'
    | 'Opposition'
    | 'Trine'
    | 'Square'
    | 'Sextile'
    | 'SemiSquare'
    | 'Quincunx'
    | 'SemiSextile';

/**
 * Creates a transit event object
 */
export function createTransitEvent(
    natalPlanet: string,
    transitPlanet: string,
    aspectType: AspectType,
    startDate: string,
    endDate: string,
    peakDate: string,
    influence: 'positive' | 'negative'
): Event {
    return {
        name: `${aspectType} between ${transitPlanet} and ${natalPlanet}`,
        startDate,
        endDate,
        peakDate,
        planet: transitPlanet,
        influence,
        isTransitEvent: true,
        transitEvent: {
            natalPlanet,
            transitPlanet,
            aspectType,
            date: peakDate,
            influence,
        },
    };
}

/**
 * Determines if an aspect type has a positive or negative influence
 */
export function getAspectInfluence(aspectType: AspectType): 'positive' | 'negative' {
    return ['Conjunction', 'Opposition', 'Square', 'SemiSquare', 'Quincunx'].includes(aspectType)
        ? 'negative'
        : 'positive';
}