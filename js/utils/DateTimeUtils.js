import { TIME_CONSTANTS, DEFAULT_SETTINGS, LOCALE_CONFIG } from '../config/constants.js';

/**
 * Utility class for handling date and time operations
 */
export class DateTimeUtils {
    /**
     * Sets a datetime-local input to a specific offset from today
     * @param {string} inputId - The ID of the datetime input element
     * @param {number} daysOffset - Number of days to offset from today
     * @param {number} hours - Hour of day to set (24-hour format)
     */
    static setDateTimeInput(inputId, daysOffset, hours) {
        // Get current date and time
        let date = new Date();

        // Add offset days
        date.setDate(date.getDate() + daysOffset);

        // Set the time
        date.setHours(hours);
        date.setMinutes(0);
        date.setSeconds(0);

        // Get the timezone offset in minutes
        let timezoneOffset = date.getTimezoneOffset();

        // Subtract the timezone offset from the date
        date.setMinutes(date.getMinutes() - timezoneOffset);

        // Format the date and time in the format required by datetime-local inputs
        let dateTime = date.toISOString().substring(0, 16);

        // Set the input value
        const input = document.getElementById(inputId);
        if (input) {
            input.value = dateTime;
        }
    }

    /**
     * Initialize default datetime inputs for the application
     */
    static initializeDefaultDateTimes() {
        this.setDateTimeInput(
            "ticket_dt", 
            DEFAULT_SETTINGS.TICKET_REMINDER_DAYS_OFFSET, 
            DEFAULT_SETTINGS.TICKET_REMINDER_HOURS
        );
        this.setDateTimeInput(
            "event_dt", 
            DEFAULT_SETTINGS.EVENT_DAYS_OFFSET, 
            DEFAULT_SETTINGS.EVENT_HOURS
        );
    }

    /**
     * Format a date for display in Danish locale
     * @param {Date|string} date - Date to format
     * @param {boolean} includeTime - Whether to include time in the format
     * @returns {string} Formatted date string
     */
    static formatDate(date, includeTime = false) {
        const dateObj = new Date(date);
        const options = includeTime ? LOCALE_CONFIG.DATETIME_OPTIONS : LOCALE_CONFIG.DATE_OPTIONS;
        return dateObj.toLocaleString(LOCALE_CONFIG.LOCALE, options);
    }

    /**
     * Calculate end time for an event
     * @param {string} startDateTime - Start date time string
     * @param {number} durationHours - Duration in hours
     * @returns {string} End date time in ISO string format
     */
    static calculateEndTime(startDateTime, durationHours) {
        return new Date(
            Date.parse(startDateTime) + durationHours * TIME_CONSTANTS.HOURS_MS
        ).toISOString();
    }

    /**
     * Calculate end date for an all-day event
     * @param {string} startDate - Start date string
     * @param {number} durationDays - Duration in days
     * @returns {string} End date in ISO string format (date part only)
     */
    static calculateEndDate(startDate, durationDays) {
        return new Date(
            Date.parse(startDate) + durationDays * TIME_CONSTANTS.DAYS_MS
        ).toISOString().slice(0, 10);
    }

    /**
     * Get the current timezone
     * @returns {string} Current timezone
     */
    static getTimezone() {
        return LOCALE_CONFIG.TIMEZONE;
    }

    /**
     * Create a reminder end time (15 minutes after start)
     * @param {string} startDateTime - Start date time string
     * @returns {string} End date time in ISO string format
     */
    static createReminderEndTime(startDateTime) {
        return new Date(
            Date.parse(startDateTime) + DEFAULT_SETTINGS.REMINDER_DURATION_MINUTES * TIME_CONSTANTS.MINUTES_MS
        ).toISOString();
    }

    /**
     * Check if two dates are the same day
     * @param {Date} date1 - First date
     * @param {Date} date2 - Second date
     * @returns {boolean} True if same day
     */
    static isSameDay(date1, date2) {
        return date1.getTime() === date2.getTime();
    }

    /**
     * Format date range for all-day events
     * @param {string} startDate - Start date string
     * @param {string} endDate - End date string
     * @returns {string} Formatted date range
     */
    static formatAllDayDateRange(startDate, endDate) {
        let startDateObj = new Date(startDate);
        let endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() - 1);

        if (endDateObj < startDateObj) {
            endDateObj = new Date(endDate);
        }

        if (this.isSameDay(startDateObj, endDateObj)) {
            return this.formatDate(startDateObj);
        } else {
            return `${this.formatDate(startDateObj)} - ${this.formatDate(endDateObj)}`;
        }
    }
}