/**
 * Core type definitions for the astrology application.
 * Contains interfaces for planetary data, events, configurations,
 * and navigation parameters used throughout the app.
 */

/**
 * Represents the orbital elements of a planet.
 * These elements define the planet's orbit according to Keplerian mechanics.
 */
export interface PlanetData {
    a: number;    // Semi-major axis (in km)
    e: number;    // Eccentricity
    i: number;    // Inclination (in degrees)
    om: number;   // Longitude of ascending node (in degrees)
    w: number;    // Argument of perihelion (in degrees)
    M0: number;   // Mean anomaly at epoch (in degrees)
    T: number;    // Orbital period (in days)
}

/**
 * Maps dates to planetary data for each celestial body
 * Used for interpolation in the animation system
 */
export interface PlanetDataByDate {
    [date: string]: PlanetData[];
}

/**
 * Represents an astrological event, either a manual entry or transit event.
 * Contains timing information, associated planet, and influence type.
 */
export interface Event {
    name: string;                               // Name/description of the event
    startDate: string;                          // Start date in ISO format
    endDate: string;                            // End date in ISO format
    peakDate: string;                           // Peak influence date in ISO format
    planet: string;                             // Associated planet
    influence: 'positive' | 'negative';         // Type of influence
    isLoading?: boolean;                        // Loading state indicator
    isTransitEvent?: boolean;                   // Whether this is a transit event
    transitEvent?: TransitEvent;                // Additional details for transit events
}

/**
 * Represents a transit event between planets.
 * Transit events occur when a moving planet forms an aspect with a natal planet.
 */
export interface TransitEvent {
    natalPlanet: string;                        // The fixed natal chart planet
    transitPlanet: string;                      // The moving transit planet
    aspectType: string;                         // Type of aspect (Conjunction, Opposition, etc.)
    date: string;                               // Date of the transit in ISO format
    influence: 'positive' | 'negative';         // Whether the aspect is considered positive or negative
}

/**
 * Configuration for visualizing a celestial body in the 3D solar system.
 */
export interface CelestialBodyConfig {
    name: string;     // Name of the celestial body
    color: string;    // Color used for rendering
    size: number;     // Relative size for visualization
}

/**
 * Navigation parameters for React Navigation stack.
 * Defines the type of parameters passed between screens.
 */
export type RootStackParamList = {
    Events: { newEvent?: Event; newTransitEvents?: Event[]; natalChart?: NatalChartEntry[] };
    SolarSystem: {
        event: Event;           // Event data (contains peakDate for animation end)
        planetDataByDate: PlanetDataByDate; // Planetary data for all days in animation range
        preloadedTextures?: { [key: string]: any };
    };
    ModelDisplay: undefined;
    WaveTest: undefined;
    ScrollTest: undefined;
    NatalChart: undefined;
    AddEvent: undefined;
    TransitEvents: undefined;
    TestMenu: undefined;
};

/**
 * Represents a planet's position in a birth chart.
 * Includes zodiac sign and degree information.
 */
export interface NatalChartEntry {
    name: string;         // Planet name
    longitude: number;    // Ecliptic longitude in degrees (0-360)
    sign: string;         // Zodiac sign
    degreeInSign: number; // Degrees within the sign (0-30)
}