/**
 * TexturePreloader module for centralized texture mapping, preloading, and caching.
 * Handles all logic for loading and accessing textures for the solar system visualization.
 */

import * as THREE from 'three';

// Centralized mapping of textures for planets and effects
const textureMap = {
    sun: require('../assets/textures/sun.jpg'),
    earth: require('../assets/textures/earth.jpg'),
    quantum: require('../assets/textures/quantum.jpg'),
    mars: require('../assets/textures/mars.jpg'),
    mercury: require('../assets/textures/mercury.jpg'),
    neptune: require('../assets/textures/neptune.jpg'),
    saturn: require('../assets/textures/saturn.jpg'),
    uranus: require('../assets/textures/uranus.jpg'),
    venus: require('../assets/textures/venus.jpg'),
    jupiter: require('../assets/textures/jupiter.jpg'),
};

export type TextureKey = keyof typeof textureMap;

// Human-readable names for each texture
export const textureNames: Record<TextureKey, string> = {
  earth: 'Earth',
  jupiter: 'Jupiter',
  mars: 'Mars',
  mercury: 'Mercury',
  neptune: 'Neptune',
  quantum: 'Quantum',
  saturn: 'Saturn',
  sun: 'Sun',
  uranus: 'Uranus',
  venus: 'Venus'
};

// Cache for loaded textures
let textureCache: Record<TextureKey, THREE.Texture> = {};

// Loading status flags
let isLoading = false;
let isLoaded = false;
let hasError = false;
let loadError: Error | null = null;

/**
 * Preloads all textures needed for the solar system visualization.
 * Returns a promise that resolves to an object containing all loaded textures.
 */
export const preloadTextures = async (): Promise<Record<TextureKey, THREE.Texture>> => {
    const textureLoader = new THREE.TextureLoader();
    const texturePromises: Promise<[TextureKey, THREE.Texture]>[] = [];

    for (const key of Object.keys(textureMap) as TextureKey[]) {
        const texturePromise = new Promise<[TextureKey, THREE.Texture]>((resolve, reject) => {
            textureLoader.load(
                textureMap[key],
                (loadedTexture) => {
                    loadedTexture.colorSpace = THREE.SRGBColorSpace;
                    loadedTexture.needsUpdate = true;
                    resolve([key, loadedTexture]);
                },
                undefined,
                (error) => {
                    console.error(`Failed to load texture for ${key}:`, error);
                    reject(error);
                }
            );
        });
        texturePromises.push(texturePromise);
    }

    const loadedTextures = await Promise.all(texturePromises);
    return loadedTextures.reduce((acc, [key, texture]) => {
        acc[key] = texture;
        return acc;
    }, {} as Record<TextureKey, THREE.Texture>);
};

/**
 * Initializes and preloads all textures. Should be called once at app startup.
 */
export const initializeTextures = async () => {
  if (isLoading || isLoaded) return;
  isLoading = true;
  const start = performance.now();
  try {
    textureCache = await preloadTextures();
    isLoaded = true;
    isLoading = false;
    const duration = performance.now() - start;
    console.log(`[TexturePreloader] Textures loaded in ${duration.toFixed(1)} ms`);
  } catch (error) {
    hasError = true;
    loadError = error as Error;
    isLoading = false;
    const duration = performance.now() - start;
    console.error(`[TexturePreloader] Texture loading failed after ${duration.toFixed(1)} ms`, error);
  }
};

/**
 * Returns a loaded texture by its key.
 */
export const getTexture = (key: TextureKey): THREE.Texture | undefined => {
  return textureCache[key];
};

/**
 * Returns the current loading status for textures.
 */
export const getTextureLoadStatus = () => {
  return {
    isLoading,
    isLoaded,
    hasError,
    error: loadError,
    loadedCount: Object.keys(textureCache).length,
    totalCount: Object.keys(textureNames).length
  };
};

export default {
  initializeTextures,
  getTexture,
  getTextureLoadStatus,
  textureNames,
  preloadTextures,
  textureMap
};
