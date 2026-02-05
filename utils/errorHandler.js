// errorHandler.js - Centralized error handling

import { ERROR_MESSAGES } from './constants.js';

/**
 * Error class for API-related errors
 */
export class APIError extends Error {
    constructor(provider, message, statusCode = null) {
        super(message);
        this.name = 'APIError';
        this.provider = provider;
        this.statusCode = statusCode;
    }
}

/**
 * Error class for storage-related errors
 */
export class StorageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'StorageError';
    }
}

/**
 * Parse API error response and create user-friendly error message
 * @param {Response} response - Fetch response object
 * @param {string} provider - API provider name
 * @returns {Promise<APIError>}
 */
export async function parseAPIError(response, provider) {
    let errorMessage = '';
    let errorData;

    try {
        const text = await response.text();
        console.error(`API Error Response (${provider}):`, text);

        try {
            errorData = JSON.parse(text);
        } catch (e) {
            errorData = { error: { message: text } };
        }

        // Handle specific status codes
        if (response.status === 402 && provider === 'deepseek') {
            errorMessage = ERROR_MESSAGES.INSUFFICIENT_BALANCE(provider);
        } else if (response.status === 401) {
            errorMessage = ERROR_MESSAGES.INVALID_API_KEY(provider);
        } else if (response.status === 429) {
            errorMessage = `${provider} rate limit exceeded. Please wait and try again.`;
        } else if (response.status >= 500) {
            errorMessage = `${provider} server error. Please try again later.`;
        } else if (errorData && errorData.error && errorData.error.message) {
            errorMessage = ERROR_MESSAGES.API_ERROR(provider, errorData.error.message);
        } else {
            errorMessage = ERROR_MESSAGES.API_ERROR(provider, `HTTP ${response.status}`);
        }
    } catch (error) {
        errorMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
    }

    return new APIError(provider, errorMessage, response.status);
}

/**
 * Handle and log errors consistently
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 */
export function logError(error, context = '') {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}] ` : '';

    console.error(`${timestamp} ${contextStr}${error.name}: ${error.message}`);

    if (error.stack) {
        console.error('Stack trace:', error.stack);
    }

    // Log additional properties for custom errors
    if (error instanceof APIError) {
        console.error(`Provider: ${error.provider}, Status Code: ${error.statusCode}`);
    }
}

/**
 * Get user-friendly error message
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyError(error) {
    if (error instanceof APIError || error instanceof StorageError) {
        return error.message;
    }

    // Handle network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
        return ERROR_MESSAGES.NETWORK_ERROR;
    }

    // Default unknown error
    return ERROR_MESSAGES.UNKNOWN_ERROR;
}
