import { STORAGE_KEYS } from '../config/constants.js';

/**
 * Service for managing localStorage operations
 */
export class LocalStorageService {
    /**
     * Get an item from localStorage
     * @param {string} key - The storage key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} The stored value or default
     */
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item !== null ? item : defaultValue;
        } catch (error) {
            console.warn(`Failed to get localStorage item '${key}':`, error);
            return defaultValue;
        }
    }

    /**
     * Get a JSON item from localStorage
     * @param {string} key - The storage key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} The parsed JSON value or default
     */
    static getJSON(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item !== null ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn(`Failed to get/parse localStorage JSON item '${key}':`, error);
            return defaultValue;
        }
    }

    /**
     * Set an item in localStorage
     * @param {string} key - The storage key
     * @param {*} value - The value to store
     * @returns {boolean} True if successful
     */
    static set(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error(`Failed to set localStorage item '${key}':`, error);
            return false;
        }
    }

    /**
     * Set a JSON item in localStorage
     * @param {string} key - The storage key
     * @param {*} value - The value to store as JSON
     * @returns {boolean} True if successful
     */
    static setJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Failed to set localStorage JSON item '${key}':`, error);
            return false;
        }
    }

    /**
     * Remove an item from localStorage
     * @param {string} key - The storage key
     * @returns {boolean} True if successful
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Failed to remove localStorage item '${key}':`, error);
            return false;
        }
    }

    /**
     * Check if a key exists in localStorage
     * @param {string} key - The storage key
     * @returns {boolean} True if key exists
     */
    static has(key) {
        return localStorage.getItem(key) !== null;
    }

    /**
     * Clear all localStorage items
     * @returns {boolean} True if successful
     */
    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
            return false;
        }
    }

    // Application-specific methods

    /**
     * Get the access token
     * @returns {string|null} The access token or null
     */
    static getAccessToken() {
        return this.get(STORAGE_KEYS.ACCESS_TOKEN);
    }

    /**
     * Set the access token
     * @param {string} token - The access token
     */
    static setAccessToken(token) {
        this.set(STORAGE_KEYS.ACCESS_TOKEN, token);
    }

    /**
     * Remove the access token
     */
    static removeAccessToken() {
        this.remove(STORAGE_KEYS.ACCESS_TOKEN);
    }

    /**
     * Get automatic authorize setting
     * @returns {boolean} Whether automatic authorize is enabled
     */
    static getAutomaticAuthorize() {
        return this.get(STORAGE_KEYS.AUTOMATIC_AUTHORIZE) === 'true';
    }

    /**
     * Set automatic authorize setting
     * @param {boolean} enabled - Whether to enable automatic authorize
     */
    static setAutomaticAuthorize(enabled) {
        this.set(STORAGE_KEYS.AUTOMATIC_AUTHORIZE, enabled.toString());
    }

    /**
     * Get the latest used event calendar ID
     * @returns {string|null} The calendar ID or null
     */
    static getLatestEventCalendar() {
        return this.get(STORAGE_KEYS.LATEST_EVENT_CALENDAR);
    }

    /**
     * Set the latest used event calendar ID
     * @param {string} calendarId - The calendar ID
     */
    static setLatestEventCalendar(calendarId) {
        this.set(STORAGE_KEYS.LATEST_EVENT_CALENDAR, calendarId);
    }

    /**
     * Get the latest used reminder calendar ID
     * @returns {string|null} The calendar ID or null
     */
    static getLatestReminderCalendar() {
        return this.get(STORAGE_KEYS.LATEST_REMINDER_CALENDAR);
    }

    /**
     * Set the latest used reminder calendar ID
     * @param {string} calendarId - The calendar ID
     */
    static setLatestReminderCalendar(calendarId) {
        this.set(STORAGE_KEYS.LATEST_REMINDER_CALENDAR, calendarId);
    }

    /**
     * Get user preferences as an object
     * @returns {Object} User preferences object
     */
    static getPreferences() {
        return {
            automaticAuthorize: this.getAutomaticAuthorize(),
            latestEventCalendar: this.getLatestEventCalendar(),
            latestReminderCalendar: this.getLatestReminderCalendar()
        };
    }
}