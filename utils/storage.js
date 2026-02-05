// storage.js - Centralized storage management

import { DEFAULT_SETTINGS } from './constants.js';

/**
 * Get settings from chrome storage with defaults
 * @param {Array<string>} keys - Optional array of specific keys to retrieve
 * @returns {Promise<Object>} Settings object
 */
export async function getSettings(keys = null) {
    return new Promise((resolve, reject) => {
        const keysToGet = keys || Object.keys(DEFAULT_SETTINGS);

        chrome.storage.sync.get(keysToGet, (data) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            // Merge with defaults for any missing values
            const settings = { ...DEFAULT_SETTINGS, ...data };
            resolve(settings);
        });
    });
}

/**
 * Save settings to chrome storage
 * @param {Object} settings - Settings object to save
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set(settings, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve();
        });
    });
}

/**
 * Get a specific setting value
 * @param {string} key - Setting key
 * @returns {Promise<any>} Setting value
 */
export async function getSetting(key) {
    const settings = await getSettings([key]);
    return settings[key];
}

/**
 * Save a specific setting value
 * @param {string} key - Setting key
 * @param {any} value - Setting value
 * @returns {Promise<void>}
 */
export async function saveSetting(key, value) {
    return saveSettings({ [key]: value });
}

/**
 * Validate settings before saving
 * @param {Object} settings - Settings to validate
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
export function validateSettings(settings) {
    const errors = [];

    // Validate opacity
    if (settings.notificationOpacity !== undefined) {
        const opacity = parseFloat(settings.notificationOpacity);
        if (isNaN(opacity) || opacity < 0.1 || opacity > 1) {
            errors.push('Opacity must be between 0.1 and 1.0');
        }
    }

    // Validate display duration
    if (settings.displayDuration !== undefined) {
        const duration = parseInt(settings.displayDuration);
        if (isNaN(duration) || duration < 1 || duration > 10) {
            errors.push('Display duration must be between 1 and 10 seconds');
        }
    }

    // Validate API key for selected provider
    if (settings.apiProvider) {
        const keyField = `${settings.apiProvider}Key`;
        if (settings[keyField] !== undefined && !settings[keyField]) {
            errors.push(`API key required for ${settings.apiProvider}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
