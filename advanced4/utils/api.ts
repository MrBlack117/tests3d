/**
 * API module for astronomical calculations using JPL Horizons system.
 * Provides functions to fetch planetary data for astrology applications.
 * All requests are routed through a Cloudflare Workers proxy to avoid connectivity issues.
 */

import {PlanetData, NatalChartEntry} from '../types';

// Planet ID codes for JPL Horizons API requests
const planetCommandCodes = {
    Sun: '10',
    Moon: '301',
    Mercury: '199',
    Venus: '299',
    Mars: '499',
    Jupiter: '599',
    Saturn: '699',
    Uranus: '799',
    Neptune: '899',
};

// Proxy server URL that forwards requests to NASA Horizons API
const PROXY_URL = 'https://astro-proxy.mrblack1826.workers.dev/';

/**
 * Formats a date for Horizons API in YYYY-MMM-DD format.
 * @param date - Date object or ISO string to format
 * @returns Formatted date string for Horizons API
 * @throws Error if date is invalid
 */
function formatDateForHorizons(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
        console.error(`Invalid date passed to formatDateForHorizons: ${date}`);
        throw new Error(`Invalid date: ${date}`);
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = d.getFullYear();
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formats a date with time for Horizons API in YYYY-MMM-DD HH:MM format.
 * @param date - Date object to format
 * @returns Formatted date-time string for Horizons API
 */
function formatDateTimeForHorizons(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = date.getFullYear();
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Calculates approximate timezone offset in hours based on longitude.
 * Note: This is a simplified approach that doesn't account for political timezone boundaries.
 * @param longitude - Geographic longitude in degrees
 * @returns Estimated timezone offset in hours
 */
function getTimezoneOffset(longitude: number): number {
    return Math.round(longitude / 15); // Timezone in hours
}

/**
 * Converts local birth time to UTC based on longitude.
 * @param birthDate - Local birth date and time as ISO string
 * @param longitude - Geographic longitude in degrees
 * @returns Date object in UTC
 */
function convertToUTC(birthDate: string, longitude: number): Date {
    const timezoneOffset = getTimezoneOffset(longitude);
    const date = new Date(birthDate);
    date.setHours(date.getHours() - timezoneOffset);
    return date;
}

/**
 * Determines the zodiac sign and degree from ecliptic longitude.
 * @param longitude - Ecliptic longitude in degrees (0-360)
 * @returns Object with sign name and degree within the sign
 */
function getZodiacSign(longitude: number): { sign: string; degree: number } {
    const signs = [
        {name: 'Aries', start: 0},
        {name: 'Taurus', start: 30},
        {name: 'Gemini', start: 60},
        {name: 'Cancer', start: 90},
        {name: 'Leo', start: 120},
        {name: 'Virgo', start: 150},
        {name: 'Libra', start: 180},
        {name: 'Scorpio', start: 210},
        {name: 'Sagittarius', start: 240},
        {name: 'Capricorn', start: 270},
        {name: 'Aquarius', start: 300},
        {name: 'Pisces', start: 330},
    ];
    let sign = signs.find(s => longitude >= s.start && longitude < s.start + 30);
    if (!sign) sign = signs[0]; // If longitude >= 360, it's Aries
    const degreeInSign = longitude - sign.start;
    return {sign: sign.name, degree: degreeInSign};
}

/**
 * Makes a request through the Cloudflare Workers proxy to NASA Horizons API.
 * @param targetUrl - The original NASA Horizons API URL to fetch
 * @returns Promise resolving to the response text
 * @throws Error if the proxy request fails
 */
async function fetchThroughProxy(targetUrl: string): Promise<string> {
    // Construct the proxy URL with the encoded target URL as a query parameter
    const proxyRequestUrl = `${PROXY_URL}?url=${encodeURIComponent(targetUrl)}`;
    console.log(`Proxying request through: ${proxyRequestUrl}`);

    const response = await fetch(proxyRequestUrl);

    if (!response.ok) {
        throw new Error(`Proxy HTTP error: ${response.status} ${response.statusText}`);
    }

    return await response.text();
}

/**
 * Fetches a natal chart by querying planetary positions for birth date and location.
 * Uses a proxy server to avoid connectivity issues on certain devices.
 *
 * @param birthDate - Birth date and time as ISO string
 * @param latitude - Geographic latitude in degrees
 * @param longitude - Geographic longitude in degrees
 * @returns Promise resolving to array of natal chart entries
 */
export async function fetchNatalChart(birthDate: string, latitude: number, longitude: number): Promise<NatalChartEntry[]> {
    const utcDate = convertToUTC(birthDate, longitude);
    const dateTimeStr = formatDateTimeForHorizons(utcDate);

    const positions: NatalChartEntry[] = [];
    for (const planetName in planetCommandCodes) {
        const commandCode = planetCommandCodes[planetName as keyof typeof planetCommandCodes];
        // Construct the original NASA URL (we'll pass this to our proxy)
        const nasaUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='${commandCode}'&OBJ_DATA='YES'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='coord@399'&TLIST='${dateTimeStr}'&QUANTITIES='31'&ANG_FORMAT='DEG'&EXTRA_PREC='YES'&CSV_FORMAT='NO'&SITE_COORD='${longitude},${latitude},0'`;

        try {
            console.log(`Fetching data for ${planetName} via proxy`);

            // Use our proxy function instead of direct fetch
            const data = await fetchThroughProxy(nasaUrl);

            // Process the response to extract planetary positions
            const lines = data.split('\n');
            let inDataSection = false;
            let found = false;
            for (const line of lines) {
                if (line.includes('$$SOE')) inDataSection = true;
                if (line.includes('$$EOE')) break;
                if (inDataSection && line.trim() && !line.includes('$$SOE')) {
                    const cols = line.trim().split(/\s+/);
                    const longitudeIndex = cols.length === 5 ? 3 : 2;
                    const longitude = parseFloat(cols[longitudeIndex]);
                    if (isNaN(longitude)) {
                        console.error(`Failed to extract longitude for ${planetName} on ${dateTimeStr}. Columns: ${cols.join(', ')}`);
                        positions.push({name: planetName, longitude: 0, sign: 'Unknown', degreeInSign: 0});
                        break;
                    }

                    const zodiac = getZodiacSign(longitude);
                    positions.push({
                        name: planetName,
                        longitude,
                        sign: zodiac.sign,
                        degreeInSign: zodiac.degree,
                    });
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.error(`Data not found for ${planetName} on ${dateTimeStr}`);
                positions.push({name: planetName, longitude: 0, sign: 'Unknown', degreeInSign: 0});
            }
        } catch (err) {
            console.error(`Error fetching data for ${planetName} on ${dateTimeStr}:`, err);
            positions.push({name: planetName, longitude: 0, sign: 'Unknown', degreeInSign: 0});
        }
    }
    return positions;
}

/**
 * Fetches planet positions over a date range, used for transit calculations.
 * Uses a proxy server to avoid connectivity issues on certain devices.
 *
 * @param planetId - JPL Horizons planet ID
 * @param startDate - Start date as ISO string
 * @param endDate - End date as ISO string
 * @returns Promise resolving to array of positions with dates
 */
export async function fetchPlanetPositions(planetId: string, startDate: string, endDate: string): Promise<{
    date: string;
    longitude: number
}[]> {
    console.log(`fetchPlanetPositions called with planetId=${planetId}, startDate=${startDate}, endDate=${endDate}`);

    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
        console.error(`Invalid dates: startDate=${startDate}, endDate=${endDate}`);
        return [];
    }

    const startDateStr = formatDateForHorizons(startDateObj);
    const endDateStr = formatDateForHorizons(endDateObj);

    if (new Date(endDateStr) <= new Date(startDateStr)) {
        console.error(`End date (${endDateStr}) must be after start date (${startDateStr})`);
        return [];
    }

    // Construct the original NASA URL
    const nasaUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND='${planetId}'&OBJ_DATA='YES'&MAKE_EPHEM='YES'&EPHEM_TYPE='OBSERVER'&CENTER='coord@399'&START_TIME='${startDateStr}'&STOP_TIME='${endDateStr}'&STEP_SIZE='1d'&QUANTITIES='31'&ANG_FORMAT='DEG'&EXTRA_PREC='YES'&CSV_FORMAT='NO'&SITE_COORD='0,0,0'`;
    console.log(`Fetching planet positions for planet ${planetId} via proxy`);

    try {
        // Use our proxy function instead of direct fetch
        const data = await fetchThroughProxy(nasaUrl);

        // Process the data to extract daily positions
        const lines = data.split('\n');
        const positions: { date: string; longitude: number }[] = [];
        let inDataSection = false;

        const months: { [key: string]: string } = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
            'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };

        for (const line of lines) {
            if (line.includes('$$SOE')) {
                inDataSection = true;
                continue;
            }
            if (line.includes('$$EOE')) break;
            if (inDataSection && line.trim()) {
                const cols = line.trim().split(/\s+/);
                if (cols.length < 4) {
                    console.error(`Invalid data line for planet ${planetId}: ${line}`);
                    continue;
                }

                let longitudeIndex = 2;
                if (cols[2] === 'm' || cols[2] === '*' || cols[2] === 'C' || cols[2] === 'N' || cols[2] === 'A') {
                    longitudeIndex = 3;
                }

                if (cols.length <= longitudeIndex) {
                    console.error(`Not enough columns for longitude in line for planet ${planetId}: ${line}`);
                    continue;
                }

                const dateTimeStr = `${cols[0]} ${cols[1]}`;
                const [year, monthAbbr, day] = cols[0].split('-');
                const month = months[monthAbbr];
                if (!month) {
                    console.error(`Invalid month abbreviation for planet ${planetId}: ${monthAbbr} in ${dateTimeStr}`);
                    continue;
                }
                const normalizedDateStr = `${year}-${month}-${day}T${cols[1]}:00Z`;
                const dateObj = new Date(normalizedDateStr);
                if (isNaN(dateObj.getTime())) {
                    console.error(`Failed to parse date for planet ${planetId}: ${dateTimeStr}, normalized: ${normalizedDateStr}`);
                    continue;
                }

                const longitude = parseFloat(cols[longitudeIndex]);
                if (isNaN(longitude)) {
                    console.error(`Failed to extract longitude for planet ${planetId} on ${dateTimeStr}. Columns: ${cols.join(', ')}`);
                    continue;
                }

                positions.push({
                    date: dateObj.toISOString().split('T')[0],
                    longitude,
                });
            }
        }
        if (positions.length === 0) {
            console.warn(`No positions returned for planet ${planetId} from ${startDateStr} to ${endDateStr}`);
        } else {
            console.log(`Successfully retrieved ${positions.length} positions for planet ${planetId}`);
        }
        return positions;
    } catch (error) {
        console.error(`Error fetching positions for planet ${planetId} from ${startDate} to ${endDate}:`, error);
        return [];
    }
}

/**
 * Fetches orbital elements for a planet for a date range.
 * Returns data for each day in the range in a structured format.
 *
 * @param planetId - JPL Horizons planet ID
 * @param startDate - Start date as ISO string
 * @param endDate - End date as ISO string
 * @returns Promise resolving to array of planet data with dates
 */
export async function fetchPlanetData(
    planetId: string,
    startDate: string,
    endDate: string
): Promise<{ date: string; data: PlanetData }[]> {
    let formattedStartDate = formatDateForHorizons(new Date(startDate));
    let formattedEndDate = formatDateForHorizons(new Date(endDate));

    // Check and ensure start date is before end date
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (endDateObj < startDateObj) {
        console.warn(`[API] Start date ${startDate} is after end date ${endDate}, swapping dates.`);
        const temp = formattedStartDate;
        formattedStartDate = formattedEndDate;
        formattedEndDate = temp;
    }

    // Construct the NASA API URL
    const nasaUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='${planetId}'&OBJ_DATA='YES'&MAKE_EPHEM='YES'&EPHEM_TYPE='ELEMENTS'&CENTER='500@10'&START_TIME='${formattedStartDate}'&STOP_TIME='${formattedEndDate}'&STEP_SIZE='1d'`;

    try {
        console.log(`Fetching orbital data for planet ${planetId} via proxy for range ${formattedStartDate} to ${formattedEndDate}`);

        // Use our proxy function and parse JSON from the response
        const responseText = await fetchThroughProxy(nasaUrl);
        const data = JSON.parse(responseText);

        // Parse the result into structured data
        const results: { date: string; data: PlanetData }[] = [];
        const lines = data.result.split('\n');

        let inDataSection = false;
        let currentDate = '';
        let currentData: {
            a?: number,
            e?: number,
            i?: number,
            om?: number,
            w?: number,
            M0?: number,
            T?: number
        } = {};

        for (const line of lines) {
            // Start of data section
            if (line.includes('$$SOE')) {
                inDataSection = true;
                continue;
            }

            // End of data section
            if (line.includes('$$EOE')) {
                inDataSection = false;
                continue;
            }

            // Process lines within the data section
            if (inDataSection) {
                // Date line (Julian day and Gregorian date)
                if (line.includes('=') && line.includes('A.D.')) {
                    // If we have collected data for a previous date, add it to results
                    if (currentDate && Object.keys(currentData).length >= 6) {
                        // Use default orbital period for reliability
                        const defaultPeriod = getPlanetOrbitalPeriod(planetId);

                        results.push({
                            date: currentDate,
                            data: {
                                a: currentData.a || 0,
                                e: currentData.e || 0,
                                i: currentData.i || 0,
                                om: currentData.om || 0,
                                w: currentData.w || 0,
                                M0: currentData.M0 || 0,
                                T: currentData.T || defaultPeriod,
                            }
                        });
                    }

                    // Extract date from the line
                    const datePart = line.split('=')[1].trim();
                    // Format: "A.D. 2025-Jul-01 00:00:00.0000 TDB"
                    const dateMatch = datePart.match(/A\.D\. (\d{4}-\w{3}-\d{2})/);
                    if (dateMatch) {
                        // Convert date from "2025-Jul-01" to "2025-07-01" format
                        const dateStr = dateMatch[1];
                        const months: { [key: string]: string } = {
                            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                        };

                        const [year, monthAbbr, day] = dateStr.split('-');
                        const month = months[monthAbbr];
                        if (month) {
                            currentDate = `${year}-${month}-${day}`;
                        } else {
                            currentDate = '';
                            console.error(`Could not parse month abbreviation: ${monthAbbr}`);
                        }
                    } else {
                        currentDate = '';
                        console.error(`Could not parse date from: ${datePart}`);
                    }

                    // Reset data for new day
                    currentData = {};
                }
                // Line with EC, QR and IN values
                else if (line.trim().startsWith('EC=')) {
                    const ecMatch = line.match(/EC=\s*([\d.E+-]+)/);
                    const inMatch = line.match(/IN=\s*([\d.E+-]+)/);

                    if (ecMatch) currentData.e = parseFloat(ecMatch[1]);
                    if (inMatch) currentData.i = parseFloat(inMatch[1]);
                }
                // Line with OM, W and Tp values
                else if (line.trim().startsWith('OM=')) {
                    const omMatch = line.match(/OM=\s*([\d.E+-]+)/);
                    const wMatch = line.match(/W =\s*([\d.E+-]+)/);

                    if (omMatch) currentData.om = parseFloat(omMatch[1]);
                    if (wMatch) currentData.w = parseFloat(wMatch[1]);
                }
                // Line with N, MA and TA values
                else if (line.trim().startsWith('N =')) {
                    const maMatch = line.match(/MA=\s*([\d.E+-]+)/);
                    if (maMatch) currentData.M0 = parseFloat(maMatch[1]);
                }
                // Line with A, AD and PR values
                else if (line.trim().startsWith('A =')) {
                    const aMatch = line.match(/A =\s*([\d.E+-]+)/);
                    const prMatch = line.match(/PR=\s*([\d.E+-]+)/);

                    if (aMatch) currentData.a = parseFloat(aMatch[1]);
                    if (prMatch) {
                        // PR in seconds, convert to days
                        currentData.T = parseFloat(prMatch[1]) / 86400;
                    } else {
                        currentData.T = getPlanetOrbitalPeriod(planetId);
                    }
                }
            }
        }

        // Add the last data set if it was collected
        if (currentDate && Object.keys(currentData).length >= 6) {
            const defaultPeriod = getPlanetOrbitalPeriod(planetId);
            results.push({
                date: currentDate,
                data: {
                    a: currentData.a || 0,
                    e: currentData.e || 0,
                    i: currentData.i || 0,
                    om: currentData.om || 0,
                    w: currentData.w || 0,
                    M0: currentData.M0 || 0,
                    T: currentData.T || defaultPeriod,
                }
            });
        }

        console.log(`Successfully fetched orbital data for planet ${planetId}: ${results.length} days`);
        return results;
    } catch (error) {
        console.error(`Error loading data for ${planetId}`, error);
        return [];
    }
}

/**
 * Returns the standard orbital period for a specific planet.
 * @param planetId - JPL Horizons planet ID
 * @returns Orbital period in days
 */
function getPlanetOrbitalPeriod(planetId: string): number {
    // Period in days
    switch (planetId) {
        case '10':
            return 365.25;    // Sun (relative to Earth)
        case '199':
            return 87.97;    // Mercury
        case '299':
            return 224.7;    // Venus
        case '399':
            return 365.25;   // Earth
        case '499':
            return 686.98;   // Mars
        case '599':
            return 4332.59;  // Jupiter
        case '699':
            return 10759.22; // Saturn
        case '799':
            return 30688.5;  // Uranus
        case '899':
            return 60190;    // Neptune
        default:
            return 365.25;      // Default to Earth's period
    }
}