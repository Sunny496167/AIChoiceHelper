// apiManager.js - Centralized API Key Management Service

import { BUILTIN_KEYS, DEFAULT_SETTINGS } from './constants.js';

/**
 * Get all settings from chrome storage, falling back to defaults.
 * @returns {Promise<Object>} Settings object
 */
export function getSettings() {
    return new Promise((resolve) => {
        const storageKeys = Object.keys(DEFAULT_SETTINGS).concat(['disabledBuiltinKeys']);
        chrome.storage.sync.get(storageKeys, (data) => {
            resolve({ ...DEFAULT_SETTINGS, ...data });
        });
    });
}

/**
 * Get the currently active API key based on user settings and any failed keys in the current session.
 * @param {Object} settings - Extension settings
 * @param {Set<string>} failedKeys - Set of built-in key IDs that have failed
 * @returns {Promise<string>} The API key to use
 */
export async function getActiveApiKey(settings, failedKeys = new Set()) {
    const provider = settings.apiProvider; // groq, gemini, deepseek, perplexity
    const customKeyField = `${provider}Key`;
    
    if (settings.apiMode === "custom" && settings[customKeyField]) {
        return settings[customKeyField];
    }

    // Filter to only enabled keys for the specific provider
    const providerKeys = BUILTIN_KEYS[provider] || [];
    const disabledKeys = settings.disabledBuiltinKeys || [];
    const availableBuiltinKeys = providerKeys.filter(key => key.enabled && !disabledKeys.includes(key.id));
    
    if (availableBuiltinKeys.length === 0) {
        throw new Error(`No built-in API keys are available for ${provider}.`);
    }

    const selectedBuiltinField = `selectedBuiltin${provider.charAt(0).toUpperCase() + provider.slice(1)}`;
    const selectedBuiltinKey = settings[selectedBuiltinField];

    // Try the user's specifically selected built-in key first, if it hasn't failed
    if (selectedBuiltinKey && !failedKeys.has(selectedBuiltinKey)) {
        const selectedKey = availableBuiltinKeys.find(key => key.id === selectedBuiltinKey);
        if (selectedKey) {
            return selectedKey.apiKey;
        }
    }

    // If auto-switch is enabled, find the highest priority key that hasn't failed
    if (settings.autoSwitchEnabled) {
        // Sort by priority (lower number = higher priority)
        const sortedKeys = [...availableBuiltinKeys].sort((a, b) => a.priority - b.priority);
        
        for (const key of sortedKeys) {
            if (!failedKeys.has(key.id)) {
                return key.apiKey;
            }
        }
    }

    // If all keys have failed or auto-switch is disabled and selected key failed
    throw new Error(`All available API keys for ${provider} have failed or rate limit exceeded.`);
}

/**
 * Identifies which built-in key corresponds to a given API key string.
 * Helpful for tracking which key failed.
 * @param {string} apiKey - The raw API key
 * @returns {string|null} The key ID, or null if it's a custom key
 */
export function identifyBuiltinKeyId(apiKey) {
    // Search across all providers
    for (const providerKeys of Object.values(BUILTIN_KEYS)) {
        const keyDef = providerKeys.find(k => k.apiKey === apiKey);
        if (keyDef) return keyDef.id;
    }
    return null;
}
