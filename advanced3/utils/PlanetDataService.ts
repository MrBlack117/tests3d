/**
 * Planet Data Service module for managing orbital data storage.
 * Provides caching, retrieval, and updating of planetary orbital elements
 * to minimize API calls and ensure data availability for visualization.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {PlanetData} from '../types';
import {fetchPlanetData} from './api';

// Storage keys for persistent data
const PLANET_DATA_KEY = 'planet_data_v2';
const PLANET_DATA_META_KEY = 'planet_data_meta_v2';

// Planet IDs for JPL Horizons API requests
const PLANET_IDS = [
    {id: '10', name: 'Sun'},
    {id: '199', name: 'Mercury'},
    {id: '299', name: 'Venus'},
    {id: '399', name: 'Earth'},
    {id: '499', name: 'Mars'},
    {id: '599', name: 'Jupiter'},
    {id: '699', name: 'Saturn'},
    {id: '799', name: 'Uranus'},
    {id: '899', name: 'Neptune'},
];

type PlanetDataByDate = {
    [date: string]: PlanetData[];
};

type PlanetDataMeta = {
    lastCleanup: string; // date of last storage cleanup
    dataRange?: {
        start: string; // first date with available data
        end: string;   // last date with available data
    };
};

/**
 * Service for managing planetary orbital data
 * Handles storage, retrieval, and updating of orbital elements
 */
class PlanetDataService {
    /**
     * Retrieves all stored planetary data from local storage
     * @returns Object containing planetary data by date or null if no data exists
     */
    async getAllStoredData(): Promise<PlanetDataByDate | null> {
        try {
            const data = await AsyncStorage.getItem(PLANET_DATA_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('[PlanetDataService] Error loading data from storage:', error);
            return null;
        }
    }

    /**
     * Saves planetary data to local storage
     * @param data - Object containing planet data organized by date
     */
    async saveAllData(data: PlanetDataByDate): Promise<void> {
        try {
            await AsyncStorage.setItem(PLANET_DATA_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('[PlanetDataService] Error saving data to storage:', error);
            throw error;
        }
    }

    /**
     * Retrieves metadata about stored planetary data
     * @returns Metadata object or null if no metadata exists
     */
    async getMetaData(): Promise<PlanetDataMeta | null> {
        try {
            const data = await AsyncStorage.getItem(PLANET_DATA_META_KEY);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('[PlanetDataService] Error loading metadata from storage:', error);
            return null;
        }
    }

    /**
     * Saves metadata about planetary data storage
     * @param meta - Metadata object to save
     */
    async setMetaData(meta: PlanetDataMeta): Promise<void> {
        try {
            await AsyncStorage.setItem(PLANET_DATA_META_KEY, JSON.stringify(meta));
        } catch (error) {
            console.error('[PlanetDataService] Error saving metadata to storage:', error);
            throw error;
        }
    }

    /**
     * Retrieves planetary data for a specific date
     * @param dateStr - Date string in YYYY-MM-DD format
     * @returns Array of planet data or null if no data exists for the date
     */
    async getPlanetDataForDate(dateStr: string): Promise<PlanetData[] | null> {
        try {
            const allData = await this.getAllStoredData();
            if (!allData) return null;
            return allData[dateStr] || null;
        } catch (error) {
            console.error(`[PlanetDataService] Error getting data for ${dateStr}:`, error);
            return null;
        }
    }

    /**
     * Retrieves the date range for which data is available
     * @returns Object containing start and end dates or null if no range exists
     */
    async getDataAvailabilityRange(): Promise<{ start: string; end: string } | null> {
        try {
            const meta = await this.getMetaData();
            return meta?.dataRange || null;
        } catch (error) {
            console.error('[PlanetDataService] Error getting data range:', error);
            return null;
        }
    }

    /**
     * Clears all planetary data from storage
     * Removes both data and metadata
     */
    async clearAllData(): Promise<void> {
        try {
            await AsyncStorage.multiRemove([PLANET_DATA_KEY, PLANET_DATA_META_KEY]);
            console.log('[PlanetDataService] All planet data successfully cleared');
        } catch (error) {
            console.error('[PlanetDataService] Error clearing planet data:', error);
            throw error;
        }
    }

    /**
     * Generates an array of date strings between two dates (inclusive)
     * @param startDateStr - Start date in YYYY-MM-DD format
     * @param endDateStr - End date in YYYY-MM-DD format
     * @returns Array of date strings between start and end dates
     */
    getDatesBetween(startDateStr: string, endDateStr: string): string[] {
        const result: string[] = [];
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error(`[PlanetDataService] Invalid date format: ${startDateStr} or ${endDateStr}`);
            return [];
        }

        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            result.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return result;
    }

    /**
     * Fetches and stores planetary data for a date range
     * Optimized version that uses a single request per planet for the entire date range
     * @param startDateStr - Start date in YYYY-MM-DD format
     * @param endDateStr - End date in YYYY-MM-DD format
     */
    async fetchAndStoreDataForRange(startDateStr: string, endDateStr: string): Promise<void> {
        try {
            console.log(`[PlanetDataService] Starting data fetch for range ${startDateStr} to ${endDateStr}`);

            // Get existing data or initialize empty object
            const existingData = await this.getAllStoredData() || {};

            // Generate list of dates to process
            const dateList = this.getDatesBetween(startDateStr, endDateStr);
            console.log(`[PlanetDataService] Will process data for ${dateList.length} dates`);

            // Fetch data for each planet across the entire date range
            for (const planet of PLANET_IDS) {
                try {
                    // Use default values for the Sun since it's at the center of the system
                    if (planet.id === '10') {
                        console.log(`[PlanetDataService] Using zero values for Sun`);

                        // Create zero values for Sun for all dates in the range
                        for (const date of dateList) {
                            // Initialize date array if it doesn't exist
                            if (!existingData[date]) {
                                existingData[date] = new Array(PLANET_IDS.length).fill(null);
                            }

                            // Find Sun's index in the array (typically 0)
                            const sunIndex = PLANET_IDS.findIndex(p => p.id === '10');
                            if (sunIndex !== -1) {
                                // Default data for Sun (all zeros since it's the center)
                                existingData[date][sunIndex] = {
                                    a: 0.0,  // semi-major axis
                                    e: 0.0,  // eccentricity
                                    i: 0.0,  // inclination
                                    om: 0.0, // longitude of ascending node
                                    w: 0.0,  // argument of periapsis
                                    M0: 0.0, // mean anomaly
                                    T: 0.0,  // orbital period
                                };
                            }
                        }
                        continue; // Skip API request for Sun
                    }

                    console.log(`[PlanetDataService] Fetching data for ${planet.name} for date range ${startDateStr} to ${endDateStr}`);

                    // Request data for the entire date range in one API call
                    const planetDataForRange = await fetchPlanetData(planet.id, startDateStr, endDateStr);

                    if (planetDataForRange.length === 0) {
                        console.warn(`[PlanetDataService] No data returned for ${planet.name}`);
                        continue;
                    }

                    console.log(`[PlanetDataService] Received data for ${planet.name}: ${planetDataForRange.length} days`);

                    // Save data for each date
                    for (const {date, data} of planetDataForRange) {
                        // Initialize date array if it doesn't exist
                        if (!existingData[date]) {
                            existingData[date] = new Array(PLANET_IDS.length).fill(null);
                        }

                        // Find planet's index in the array
                        const planetIndex = PLANET_IDS.findIndex(p => p.id === planet.id);
                        if (planetIndex !== -1) {
                            // Save data for this planet
                            existingData[date][planetIndex] = data;
                        }
                    }

                } catch (error) {
                    console.error(`[PlanetDataService] Error fetching data for ${planet.name}:`, error);
                }
            }

            // Verify data completeness for all dates and planets
            for (const date of dateList) {
                if (!existingData[date]) {
                    console.warn(`[PlanetDataService] Missing data for date: ${date}`);
                    continue;
                }

                const missingPlanets = PLANET_IDS.filter((_, index) => !existingData[date][index]);
                if (missingPlanets.length > 0) {
                    console.warn(`[PlanetDataService] Missing planet data for ${date}: ${missingPlanets.map(p => p.name).join(', ')}`);
                }
            }

            // Save all data to storage
            await this.saveAllData(existingData);

            // Update metadata with new date range
            const meta = await this.getMetaData() || {
                lastCleanup: startDateStr,
                dataRange: {start: startDateStr, end: startDateStr}
            };

            // Update date range in metadata
            if (!meta.dataRange) {
                meta.dataRange = {start: startDateStr, end: endDateStr};
            } else {
                // Expand existing range if new dates extend beyond current bounds
                const startDate = new Date(startDateStr);
                const endDate = new Date(endDateStr);
                const metaStartDate = new Date(meta.dataRange.start);
                const metaEndDate = new Date(meta.dataRange.end);

                if (startDate < metaStartDate) {
                    meta.dataRange.start = startDateStr;
                }

                if (endDate > metaEndDate) {
                    meta.dataRange.end = endDateStr;
                }
            }

            console.log(`[PlanetDataService] Updating metadata range: ${meta.dataRange.start} to ${meta.dataRange.end}`);
            await this.setMetaData(meta);

        } catch (error) {
            console.error('[PlanetDataService] Error in fetchAndStoreDataForRange:', error);
            throw error;
        }
    }

    /**
     * Initializes the planet data store
     * By default, loads data for current month plus 2 months ahead
     */
    async initializeDataStore(): Promise<void> {
        try {
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            // Remove all data before yesterday
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            await this.removeDataBeforeDate(yesterdayStr);

            // Check if metadata already exists
            const meta = await this.getMetaData();

            // If metadata exists and has a date range, check if it's current
            if (meta && meta.dataRange) {
                const currentDateStr = now.toISOString().split('T')[0];
                const endDate = new Date(meta.dataRange.end);

                // If data is current (covers the current date), do nothing
                if (endDate > now) {
                    console.log(`[PlanetDataService] Data store is already initialized with data until ${meta.dataRange.end}`);
                    return;
                }

                // Otherwise update data for the next 3 months
                const futureDate = new Date(now);
                futureDate.setMonth(futureDate.getMonth() + 2);
                const futureDateStr = futureDate.toISOString().split('T')[0];

                console.log(`[PlanetDataService] Updating data range from ${currentDateStr} to ${futureDateStr}`);
                await this.fetchAndStoreDataForRange(currentDateStr, futureDateStr);
                return;
            }

            // If no metadata exists, initialize store with data for current month + 2 months ahead
            const currentDateStr = now.toISOString().split('T')[0];
            const futureDate = new Date(now);
            futureDate.setMonth(futureDate.getMonth() + 2);
            const futureDateStr = futureDate.toISOString().split('T')[0];

            console.log(`[PlanetDataService] Initializing data store with range ${currentDateStr} to ${futureDateStr}`);
            await this.fetchAndStoreDataForRange(currentDateStr, futureDateStr);

        } catch (error) {
            console.error('[PlanetDataService] Error initializing data store:', error);
            throw error;
        }
    }

    /**
     * Removes all data and metadata before the specified date (not inclusive)
     * @param cutoffDateStr - Date in YYYY-MM-DD format, all dates before it will be deleted
     */
    async removeDataBeforeDate(cutoffDateStr: string): Promise<void> {
        try {
            const allData = await this.getAllStoredData();
            if (!allData) return;
            const cutoff = new Date(cutoffDateStr);
            // Keep only dates >= cutoffDateStr
            const filteredData: PlanetDataByDate = {};
            for (const dateStr of Object.keys(allData)) {
                if (new Date(dateStr) >= cutoff) {
                    filteredData[dateStr] = allData[dateStr];
                }
            }
            await this.saveAllData(filteredData);
            // Update metadata
            const meta = await this.getMetaData();
            if (meta && meta.dataRange) {
                // New start of the range is cutoffDateStr if there is remaining data, otherwise null
                const remainingDates = Object.keys(filteredData).sort();
                if (remainingDates.length > 0) {
                    meta.dataRange.start = remainingDates[0];
                } else {
                    meta.dataRange.start = cutoffDateStr;
                }
                await this.setMetaData(meta);
            }
            console.log(`[PlanetDataService] Removed all data before ${cutoffDateStr}`);
        } catch (error) {
            console.error('[PlanetDataService] Error removing old data:', error);
        }
    }

    /**
     * Checks if all data for the date range is available in storage
     *
     * @param startDate Start date in ISO format (YYYY-MM-DD)
     * @param endDate End date in ISO format (YYYY-MM-DD)
     * @returns Promise<boolean> True if all data is available
     */
    async checkDataAvailability(startDate: string, endDate: string): Promise<boolean> {
        try {
            // Get all stored data
            const allData = await this.getAllStoredData();
            if (!allData) return false;

            // Generate array of all dates in range
            const dateList: string[] = [];
            const start = new Date(startDate);
            const end = new Date(endDate);

            const current = new Date(start);
            while (current <= end) {
                dateList.push(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }

            // Check if data exists for all dates
            for (const date of dateList) {
                if (!allData[date] ||
                    !Array.isArray(allData[date]) ||
                    allData[date].length !== 9 ||
                    allData[date].some(data => data === null)) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Error checking data availability:', error);
            return false;
        }
    }
}

// Export a single instance of the service for use throughout the app
export default new PlanetDataService();