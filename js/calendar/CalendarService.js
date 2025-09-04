import { EVENT_PATTERN, PARTICIPANT_PATTERN } from '../config/constants.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

/**
 * Service for Google Calendar API operations
 */
export class CalendarService {
    constructor(authService) {
        this.authService = authService;
    }

    /**
     * Get list of user's calendars
     * @returns {Promise<Array>} Array of calendar objects
     */
    async getCalendars() {
        return this.authService.executeAuthenticatedCall(async () => {
            const response = await gapi.client.calendar.calendarList.list();
            return response.result.items || [];
        });
    }

    /**
     * Get writable calendars (excludes read-only calendars)
     * @returns {Promise<Array>} Array of writable calendar objects
     */
    async getWritableCalendars() {
        const calendars = await this.getCalendars();
        return calendars.filter(calendar => calendar.accessRole !== 'reader');
    }

    /**
     * Get events from a specific calendar
     * @param {string} calendarId - The calendar ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of event objects
     */
    async getCalendarEvents(calendarId, options = {}) {
        const defaultOptions = {
            timeMin: new Date().toISOString(),
            showDeleted: false,
            singleEvents: true,
            orderBy: 'startTime',
        };

        const queryOptions = { ...defaultOptions, ...options, calendarId };

        return this.authService.executeAuthenticatedCall(async () => {
            const response = await gapi.client.calendar.events.list(queryOptions);
            return response.result.items || [];
        });
    }

    /**
     * Get all events from all calendars
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of event objects with calendar information
     */
    async getAllEvents(options = {}) {
        try {
            const calendars = await this.getCalendars();
            
            const eventPromises = calendars.map(async (calendar) => {
                try {
                    const events = await this.getCalendarEvents(calendar.id, options);
                    return events.map(event => ({
                        ...event,
                        calendarId: calendar.id,
                        calendarName: calendar.summary
                    }));
                } catch (error) {
                    console.warn(`Failed to fetch events from calendar ${calendar.summary}:`, error);
                    return [];
                }
            });

            const eventArrays = await Promise.all(eventPromises);
            return eventArrays.flat();
        } catch (error) {
            ErrorHandler.handle(error, 'calendar_fetch_all');
            throw error;
        }
    }

    /**
     * Create a calendar event
     * @param {Object} eventData - Event data object
     * @param {string} calendarId - Target calendar ID
     * @returns {Promise<Object>} Created event object
     */
    async createEvent(eventData, calendarId) {
        return this.authService.executeAuthenticatedCall(async () => {
            return new Promise((resolve, reject) => {
                const request = gapi.client.calendar.events.insert({
                    calendarId: calendarId,
                    resource: eventData,
                });

                request.execute((response) => {
                    if (response.error) {
                        reject(response.error);
                    } else {
                        resolve(response);
                    }
                });
            });
        });
    }

    /**
     * Update a calendar event
     * @param {string} eventId - Event ID to update
     * @param {Object} eventData - Updated event data
     * @param {string} calendarId - Calendar ID
     * @returns {Promise<Object>} Updated event object
     */
    async updateEvent(eventId, eventData, calendarId) {
        return this.authService.executeAuthenticatedCall(async () => {
            return new Promise((resolve, reject) => {
                const request = gapi.client.calendar.events.update({
                    calendarId: calendarId,
                    eventId: eventId,
                    resource: eventData,
                });

                request.execute((response) => {
                    if (response.error) {
                        reject(response.error);
                    } else {
                        resolve(response);
                    }
                });
            });
        });
    }

    /**
     * Delete a calendar event
     * @param {string} eventId - Event ID to delete
     * @param {string} calendarId - Calendar ID
     * @returns {Promise<void>}
     */
    async deleteEvent(eventId, calendarId) {
        return this.authService.executeAuthenticatedCall(async () => {
            return new Promise((resolve, reject) => {
                const request = gapi.client.calendar.events.delete({
                    calendarId: calendarId,
                    eventId: eventId,
                });

                request.execute((response) => {
                    if (response.error) {
                        reject(response.error);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    /**
     * Get Eventinator-specific events (matching the emoji pattern)
     * @param {string} calendarId - Optional specific calendar ID
     * @returns {Promise<Array>} Array of Eventinator event objects
     */
    async getEventinatorEvents(calendarId = null) {
        try {
            let events;
            if (calendarId) {
                events = await this.getCalendarEvents(calendarId);
            } else {
                events = await this.getAllEvents();
            }

            return events.filter(event => 
                event.summary && EVENT_PATTERN.test(event.summary)
            );
        } catch (error) {
            ErrorHandler.handle(error, 'eventinator_events_fetch');
            throw error;
        }
    }

    /**
     * Extract participant names from event description
     * @param {string} description - Event description
     * @returns {Array<string>} Array of participant names
     */
    extractParticipants(description) {
        if (!description) return [];

        const matches = description.match(PARTICIPANT_PATTERN);
        if (!matches) return [];

        return matches[1]
            .split(/,|og|and/)
            .map(name => name.trim())
            .filter(name => name !== '');
    }

    /**
     * Extract event name from summary (removes emoji and category)
     * @param {string} summary - Event summary
     * @returns {string|null} Extracted event name or null if not matching pattern
     */
    extractEventName(summary) {
        if (!summary) return null;
        
        const matches = summary.match(EVENT_PATTERN);
        return matches ? matches[1] : null;
    }

    /**
     * Get unique participants from all events
     * @returns {Promise<Array<string>>} Array of unique participant names
     */
    async getAllParticipants() {
        try {
            const events = await this.getEventinatorEvents();
            const participantSet = new Set();

            events.forEach(event => {
                const participants = this.extractParticipants(event.description);
                participants.forEach(participant => participantSet.add(participant));
            });

            return Array.from(participantSet).sort();
        } catch (error) {
            ErrorHandler.handle(error, 'participants_fetch');
            throw error;
        }
    }

    /**
     * Get unique event names from all events
     * @returns {Promise<Array<string>>} Array of unique event names
     */
    async getAllEventNames() {
        try {
            const events = await this.getEventinatorEvents();
            const nameSet = new Set();

            events.forEach(event => {
                const eventName = this.extractEventName(event.summary);
                if (eventName) {
                    nameSet.add(eventName);
                }
            });

            return Array.from(nameSet).sort();
        } catch (error) {
            ErrorHandler.handle(error, 'event_names_fetch');
            throw error;
        }
    }

    /**
     * Get unique locations from all events
     * @returns {Promise<Array<string>>} Array of unique locations
     */
    async getAllLocations() {
        try {
            const events = await this.getEventinatorEvents();
            const locationSet = new Set();

            events.forEach(event => {
                if (event.location) {
                    locationSet.add(event.location);
                }
            });

            return Array.from(locationSet).sort();
        } catch (error) {
            ErrorHandler.handle(error, 'locations_fetch');
            throw error;
        }
    }

    /**
     * Search events by criteria
     * @param {Object} criteria - Search criteria
     * @param {string} criteria.text - Text to search in summary/description
     * @param {string} criteria.participant - Participant name to search for
     * @param {string} criteria.location - Location to search for
     * @param {Date} criteria.startDate - Start date range
     * @param {Date} criteria.endDate - End date range
     * @returns {Promise<Array>} Array of matching events
     */
    async searchEvents(criteria) {
        try {
            const events = await this.getEventinatorEvents();
            
            return events.filter(event => {
                // Text search
                if (criteria.text) {
                    const searchText = criteria.text.toLowerCase();
                    const eventText = `${event.summary || ''} ${event.description || ''}`.toLowerCase();
                    if (!eventText.includes(searchText)) return false;
                }

                // Participant search
                if (criteria.participant) {
                    const participants = this.extractParticipants(event.description);
                    const hasParticipant = participants.some(p => 
                        p.toLowerCase().includes(criteria.participant.toLowerCase())
                    );
                    if (!hasParticipant) return false;
                }

                // Location search
                if (criteria.location && event.location) {
                    if (!event.location.toLowerCase().includes(criteria.location.toLowerCase())) {
                        return false;
                    }
                }

                // Date range search
                if (criteria.startDate || criteria.endDate) {
                    const eventDate = new Date(event.start.dateTime || event.start.date);
                    
                    if (criteria.startDate && eventDate < criteria.startDate) return false;
                    if (criteria.endDate && eventDate > criteria.endDate) return false;
                }

                return true;
            });
        } catch (error) {
            ErrorHandler.handle(error, 'event_search');
            throw error;
        }
    }
}