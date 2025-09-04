import { LocalStorageService } from '../storage/LocalStorageService.js';
import { AutocompleteManager } from '../storage/AutocompleteManager.js';

/**
 * Manages application state and provides reactive state updates
 */
export class AppState {
    constructor() {
        this.state = {
            // Authentication state
            auth: {
                isInitialized: false,
                isAuthenticated: false,
                token: null
            },

            // Calendar state
            calendars: {
                list: [],
                writableCalendars: [],
                selectedEventCalendar: null,
                selectedReminderCalendar: null,
                isLoading: false
            },

            // Events state
            events: {
                list: [],
                filteredList: [],
                participants: [],
                eventNames: [],
                locations: [],
                isLoading: false,
                lastUpdated: null
            },

            // Form state
            form: {
                isValid: false,
                data: {},
                errors: [],
                isSubmitting: false
            },

            // UI state
            ui: {
                isMainVisible: false,
                isAuthorizeVisible: true,
                activeFilters: {
                    participants: [],
                    dateRange: null,
                    searchText: ''
                }
            },

            // Preferences
            preferences: {
                automaticAuthorize: false
            }
        };

        this.listeners = new Map();
        this.loadPreferences();
    }

    /**
     * Load preferences from localStorage
     */
    loadPreferences() {
        const preferences = LocalStorageService.getPreferences();
        this.updateState('preferences', preferences);
    }

    /**
     * Save preferences to localStorage
     */
    savePreferences() {
        const { preferences } = this.state;
        LocalStorageService.setAutomaticAuthorize(preferences.automaticAuthorize);
        LocalStorageService.setLatestEventCalendar(this.state.calendars.selectedEventCalendar);
        LocalStorageService.setLatestReminderCalendar(this.state.calendars.selectedReminderCalendar);
    }

    /**
     * Subscribe to state changes
     * @param {string} path - State path to watch (e.g., 'auth.isAuthenticated')
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this.listeners.has(path)) {
            this.listeners.set(path, new Set());
        }

        this.listeners.get(path).add(callback);

        // Return unsubscribe function
        return () => {
            const pathListeners = this.listeners.get(path);
            if (pathListeners) {
                pathListeners.delete(callback);
                if (pathListeners.size === 0) {
                    this.listeners.delete(path);
                }
            }
        };
    }

    /**
     * Get current state or a specific path
     * @param {string} path - Optional path to get (e.g., 'auth.isAuthenticated')
     * @returns {*} Current state or value at path
     */
    getState(path = null) {
        if (!path) return this.state;

        return this.getNestedValue(this.state, path);
    }

    /**
     * Update state at a specific path
     * @param {string} path - State path to update
     * @param {*} value - New value
     * @param {boolean} merge - Whether to merge objects (default: true)
     */
    updateState(path, value, merge = true) {
        const pathParts = path.split('.');
        const lastKey = pathParts.pop();
        let current = this.state;

        // Navigate to the parent object
        for (const key of pathParts) {
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }

        // Update the value
        if (merge && typeof current[lastKey] === 'object' && current[lastKey] !== null && typeof value === 'object' && value !== null) {
            current[lastKey] = { ...current[lastKey], ...value };
        } else {
            current[lastKey] = value;
        }

        // Notify listeners
        this.notifyListeners(path, current[lastKey]);
    }

    /**
     * Get nested value from object using dot notation
     * @param {Object} obj - Object to search
     * @param {string} path - Dot notation path
     * @returns {*} Value at path or undefined
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Notify listeners of state changes
     * @param {string} path - Changed path
     * @param {*} value - New value
     */
    notifyListeners(path, value) {
        // Notify exact path listeners
        const pathListeners = this.listeners.get(path);
        if (pathListeners) {
            pathListeners.forEach(callback => {
                try {
                    callback(value, path);
                } catch (error) {
                    console.error('Error in state listener:', error);
                }
            });
        }

        // Notify wildcard listeners (for parent paths)
        this.listeners.forEach((listeners, listenerPath) => {
            if (listenerPath.includes('*') && this.pathMatches(path, listenerPath)) {
                listeners.forEach(callback => {
                    try {
                        callback(value, path);
                    } catch (error) {
                        console.error('Error in wildcard state listener:', error);
                    }
                });
            }
        });
    }

    /**
     * Check if a path matches a wildcard pattern
     * @param {string} path - Actual path
     * @param {string} pattern - Pattern with possible wildcards
     * @returns {boolean} Whether path matches pattern
     */
    pathMatches(path, pattern) {
        const pathParts = path.split('.');
        const patternParts = pattern.split('.');

        if (patternParts.length > pathParts.length) return false;

        for (let i = 0; i < patternParts.length; i++) {
            if (patternParts[i] !== '*' && patternParts[i] !== pathParts[i]) {
                return false;
            }
        }

        return true;
    }

    // Authentication state methods
    
    /**
     * Set authentication initialization state
     * @param {boolean} initialized - Whether auth is initialized
     */
    setAuthInitialized(initialized) {
        this.updateState('auth.isInitialized', initialized);
    }

    /**
     * Set authentication state
     * @param {boolean} authenticated - Whether user is authenticated
     * @param {string} token - Access token
     */
    setAuthenticated(authenticated, token = null) {
        this.updateState('auth', {
            isAuthenticated: authenticated,
            token: token
        });

        // Update UI visibility
        this.updateState('ui', {
            isMainVisible: authenticated,
            isAuthorizeVisible: !authenticated
        });
    }

    // Calendar state methods

    /**
     * Set calendars list
     * @param {Array} calendars - List of calendars
     */
    setCalendars(calendars) {
        const writableCalendars = calendars.filter(cal => cal.accessRole !== 'reader');
        
        this.updateState('calendars', {
            list: calendars,
            writableCalendars: writableCalendars,
            isLoading: false
        });

        // Set selected calendars from preferences
        const preferences = LocalStorageService.getPreferences();
        if (preferences.latestEventCalendar) {
            this.setSelectedEventCalendar(preferences.latestEventCalendar);
        }
        if (preferences.latestReminderCalendar) {
            this.setSelectedReminderCalendar(preferences.latestReminderCalendar);
        }
    }

    /**
     * Set calendar loading state
     * @param {boolean} isLoading - Whether calendars are loading
     */
    setCalendarsLoading(isLoading) {
        this.updateState('calendars.isLoading', isLoading);
    }

    /**
     * Set selected event calendar
     * @param {string} calendarId - Calendar ID
     */
    setSelectedEventCalendar(calendarId) {
        this.updateState('calendars.selectedEventCalendar', calendarId);
        LocalStorageService.setLatestEventCalendar(calendarId);
    }

    /**
     * Set selected reminder calendar
     * @param {string} calendarId - Calendar ID
     */
    setSelectedReminderCalendar(calendarId) {
        this.updateState('calendars.selectedReminderCalendar', calendarId);
        LocalStorageService.setLatestReminderCalendar(calendarId);
    }

    // Events state methods

    /**
     * Set events list
     * @param {Array} events - List of events
     */
    setEvents(events) {
        // Extract unique participants, event names, and locations
        const participants = new Set();
        const eventNames = new Set();
        const locations = new Set();

        events.forEach(event => {
            // Extract participants
            if (event.description) {
                const participantMatches = event.description.match(/(?:Participants|Deltagere): (.+)/u);
                if (participantMatches) {
                    participantMatches[1].split(/,|og|and/).forEach(name => {
                        const cleanName = name.trim();
                        if (cleanName) participants.add(cleanName);
                    });
                }
            }

            // Extract event names
            const eventNameMatch = event.summary?.match(/^[🎶🎥😀🏈🎭🎉🎫] [A-Å]\w+: (.+)/u);
            if (eventNameMatch) {
                eventNames.add(eventNameMatch[1]);
            }

            // Extract locations
            if (event.location) {
                locations.add(event.location);
            }
        });

        this.updateState('events', {
            list: events,
            filteredList: events,
            participants: Array.from(participants).sort(),
            eventNames: Array.from(eventNames).sort(),
            locations: Array.from(locations).sort(),
            isLoading: false,
            lastUpdated: new Date()
        });

        // Update autocomplete data
        this.updateAutocompleteData(eventNames, locations, participants);
    }

    /**
     * Update autocomplete data
     * @param {Set} eventNames - Event names
     * @param {Set} locations - Locations
     * @param {Set} participants - Participants
     */
    updateAutocompleteData(eventNames, locations, participants) {
        AutocompleteManager.addBulkSuggestions('event_name', Array.from(eventNames));
        AutocompleteManager.addBulkSuggestions('location', Array.from(locations));
        AutocompleteManager.addBulkSuggestions('participants', Array.from(participants), 'participants_autocomplete');
    }

    /**
     * Set events loading state
     * @param {boolean} isLoading - Whether events are loading
     */
    setEventsLoading(isLoading) {
        this.updateState('events.isLoading', isLoading);
    }

    /**
     * Set filtered events list
     * @param {Array} filteredEvents - Filtered events
     */
    setFilteredEvents(filteredEvents) {
        this.updateState('events.filteredList', filteredEvents);
    }

    // Form state methods

    /**
     * Set form data and validation
     * @param {Object} formData - Form data
     * @param {Object} validation - Validation result
     */
    setFormState(formData, validation) {
        this.updateState('form', {
            data: formData,
            isValid: validation.isValid,
            errors: validation.errors
        });
    }

    /**
     * Set form submitting state
     * @param {boolean} isSubmitting - Whether form is being submitted
     */
    setFormSubmitting(isSubmitting) {
        this.updateState('form.isSubmitting', isSubmitting);
    }

    // UI state methods

    /**
     * Set UI filters
     * @param {Object} filters - Active filters
     */
    setActiveFilters(filters) {
        this.updateState('ui.activeFilters', filters);
    }

    /**
     * Set main UI visibility
     * @param {boolean} visible - Whether main UI is visible
     */
    setMainVisible(visible) {
        this.updateState('ui.isMainVisible', visible);
    }

    /**
     * Set authorize button visibility
     * @param {boolean} visible - Whether authorize button is visible
     */
    setAuthorizeVisible(visible) {
        this.updateState('ui.isAuthorizeVisible', visible);
    }

    // Preference methods

    /**
     * Set automatic authorize preference
     * @param {boolean} enabled - Whether automatic authorize is enabled
     */
    setAutomaticAuthorize(enabled) {
        this.updateState('preferences.automaticAuthorize', enabled);
        LocalStorageService.setAutomaticAuthorize(enabled);
    }

    // Utility methods

    /**
     * Reset application state
     */
    reset() {
        this.state = {
            auth: {
                isInitialized: false,
                isAuthenticated: false,
                token: null
            },
            calendars: {
                list: [],
                writableCalendars: [],
                selectedEventCalendar: null,
                selectedReminderCalendar: null,
                isLoading: false
            },
            events: {
                list: [],
                filteredList: [],
                participants: [],
                eventNames: [],
                locations: [],
                isLoading: false,
                lastUpdated: null
            },
            form: {
                isValid: false,
                data: {},
                errors: [],
                isSubmitting: false
            },
            ui: {
                isMainVisible: false,
                isAuthorizeVisible: true,
                activeFilters: {
                    participants: [],
                    dateRange: null,
                    searchText: ''
                }
            },
            preferences: {
                automaticAuthorize: false
            }
        };

        this.loadPreferences();
        this.notifyListeners('*', this.state);
    }

    /**
     * Get current application status
     * @returns {Object} Application status summary
     */
    getStatus() {
        return {
            isInitialized: this.state.auth.isInitialized,
            isAuthenticated: this.state.auth.isAuthenticated,
            hasCalendars: this.state.calendars.list.length > 0,
            hasEvents: this.state.events.list.length > 0,
            isLoading: this.state.calendars.isLoading || this.state.events.isLoading,
            formReady: this.state.auth.isAuthenticated && this.state.calendars.writableCalendars.length > 0
        };
    }
}