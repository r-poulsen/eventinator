import { ERROR_CODES, UI_TEXT } from '../config/constants.js';

/**
 * Centralized error handling and logging
 */
export class ErrorHandler {
    /**
     * Handle and log errors with appropriate user feedback
     * @param {Error|Object|string} error - The error to handle
     * @param {string} errorCode - Internal error code for debugging
     * @param {Function} toasterCallback - Callback to show toast message
     */
    static handle(error, errorCode = null, toasterCallback = null) {
        const errorMessage = this.extractErrorMessage(error);
        
        // Log to console for debugging
        if (errorCode) {
            console.error(`${errorCode}: ${errorMessage}`);
        } else {
            console.error(errorMessage);
        }

        // Show user-friendly message if toaster callback provided
        if (toasterCallback) {
            toasterCallback.error(errorMessage, errorCode);
        }

        return errorMessage;
    }

    /**
     * Extract a readable error message from various error types
     * @param {Error|Object|string} error - The error to extract message from
     * @returns {string} Extracted error message
     */
    static extractErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }

        // Handle Google API error format
        if (
            typeof error === 'object' &&
            'result' in error &&
            error.result &&
            error.result.error &&
            error.result.error.errors &&
            error.result.error.errors[0] &&
            error.result.error.errors[0].message
        ) {
            return error.result.error.errors[0].message;
        }

        // Handle standard Error objects
        if (error instanceof Error) {
            return error.message;
        }

        // Handle objects with message property
        if (typeof error === 'object' && error.message) {
            return error.message;
        }

        // Fallback
        return 'An unknown error occurred';
    }

    /**
     * Handle authentication errors specifically
     * @param {Error|Object|string} error - The authentication error
     * @param {Function} toasterCallback - Callback to show toast message
     */
    static handleAuthError(error, toasterCallback = null) {
        return this.handle(error, ERROR_CODES.AUTH_ERROR, toasterCallback);
    }

    /**
     * Handle calendar event creation errors
     * @param {Error|Object|string} error - The event creation error
     * @param {Function} toasterCallback - Callback to show toast message
     */
    static handleEventCreationError(error, toasterCallback = null) {
        return this.handle(error, ERROR_CODES.EVENT_CREATION, toasterCallback);
    }

    /**
     * Handle reminder creation errors
     * @param {Error|Object|string} error - The reminder creation error
     * @param {Function} toasterCallback - Callback to show toast message
     */
    static handleReminderCreationError(error, toasterCallback = null) {
        return this.handle(error, ERROR_CODES.REMINDER_CREATION, toasterCallback);
    }

    /**
     * Handle token expiration errors
     * @param {Error|Object|string} error - The token error
     * @param {Function} cleanupCallback - Callback to clean up expired tokens
     * @param {Function} toasterCallback - Callback to show toast message
     */
    static handleTokenError(error, cleanupCallback = null, toasterCallback = null) {
        if (cleanupCallback) {
            cleanupCallback();
        }
        return this.handle(error, ERROR_CODES.TOKEN_EXPIRED, toasterCallback);
    }

    /**
     * Handle general application errors
     * @param {Error|Object|string} error - The general error
     * @param {Function} toasterCallback - Callback to show toast message
     */
    static handleGeneralError(error, toasterCallback = null) {
        return this.handle(error, ERROR_CODES.GENERAL_ERROR, toasterCallback);
    }

    /**
     * Create a retry wrapper for async operations
     * @param {Function} operation - The async operation to retry
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} delay - Delay between retries in ms
     * @returns {Promise} Promise that resolves with operation result or rejects after max retries
     */
    static async withRetry(operation, maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                console.warn(`Attempt ${attempt} failed:`, error);
                
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Wait before next attempt
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Validate required fields and throw error if any are missing
     * @param {Object} fields - Object with field names as keys and values to validate
     * @throws {Error} If any required field is missing or empty
     */
    static validateRequiredFields(fields) {
        const missingFields = [];
        
        for (const [fieldName, value] of Object.entries(fields)) {
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                missingFields.push(fieldName);
            }
        }
        
        if (missingFields.length > 0) {
            throw new Error(`Required fields missing: ${missingFields.join(', ')}`);
        }
    }
}