import { EVENT_TYPES, TIME_CONSTANTS, REMINDERS_CONFIG, UI_TEXT } from '../config/constants.js';
import { DateTimeUtils } from '../utils/DateTimeUtils.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

/**
 * Creates calendar events and reminders for Eventinator
 */
export class EventCreator {
    constructor(calendarService) {
        this.calendarService = calendarService;
    }

    /**
     * Create a ticket purchase reminder
     * @param {Object} reminderData - Reminder configuration
     * @returns {Promise<Object>} Created reminder event
     */
    async createTicketReminder(reminderData) {
        try {
            ErrorHandler.validateRequiredFields({
                eventName: reminderData.eventName,
                participants: reminderData.participants,
                ticketDateTime: reminderData.ticketDateTime,
                calendarId: reminderData.calendarId
            });

            const participantCount = reminderData.participants.length;
            const noun = participantCount > 1 ? UI_TEXT.DA.TICKETS : UI_TEXT.DA.TICKET;
            
            const participantString = this.formatParticipants(reminderData.participants);

            const reminder = {
                summary: UI_TEXT.DA.BUY_TICKETS_FOR
                    .replace('{tickets}', noun)
                    .replace('{eventName}', reminderData.eventName),
                description: this.buildReminderDescription(
                    participantCount, 
                    noun, 
                    participantString,
                    reminderData.ticketUrl,
                    reminderData.ticketNotes
                ),
                start: {
                    dateTime: new Date(reminderData.ticketDateTime).toISOString(),
                    timeZone: DateTimeUtils.getTimezone(),
                },
                end: {
                    dateTime: DateTimeUtils.createReminderEndTime(reminderData.ticketDateTime),
                    timeZone: DateTimeUtils.getTimezone(),
                },
                reminders: {
                    useDefault: REMINDERS_CONFIG.DEFAULT,
                    overrides: REMINDERS_CONFIG.OVERRIDES,
                }
            };

            const createdEvent = await this.calendarService.createEvent(reminder, reminderData.calendarId);
            return createdEvent;

        } catch (error) {
            ErrorHandler.handleReminderCreationError(error);
            throw error;
        }
    }

    /**
     * Create a calendar event
     * @param {Object} eventData - Event configuration
     * @returns {Promise<Object>} Created calendar event
     */
    async createCalendarEvent(eventData) {
        try {
            ErrorHandler.validateRequiredFields({
                eventName: eventData.eventName,
                eventType: eventData.eventType,
                eventDateTime: eventData.eventDateTime,
                participants: eventData.participants,
                calendarId: eventData.calendarId
            });

            const eventTypeConfig = EVENT_TYPES[eventData.eventType.toUpperCase()];
            if (!eventTypeConfig) {
                throw new Error(`Invalid event type: ${eventData.eventType}`);
            }

            const participantString = this.formatParticipants(eventData.participants);

            const event = {
                summary: `${eventTypeConfig.emoji} ${eventTypeConfig.category}: ${eventData.eventName}`,
                location: eventData.location || '',
                description: `Deltagere: ${participantString}`,
                ...this.buildEventTiming(eventData)
            };

            const createdEvent = await this.calendarService.createEvent(event, eventData.calendarId);
            return createdEvent;

        } catch (error) {
            ErrorHandler.handleEventCreationError(error);
            throw error;
        }
    }

    /**
     * Create both reminder and event in sequence
     * @param {Object} combinedData - Combined reminder and event data
     * @returns {Promise<Object>} Object with reminder and event results
     */
    async createReminderAndEvent(combinedData) {
        const results = {};

        try {
            // Create reminder first
            if (combinedData.createReminder) {
                results.reminder = await this.createTicketReminder({
                    eventName: combinedData.eventName,
                    participants: combinedData.participants,
                    ticketDateTime: combinedData.ticketDateTime,
                    ticketUrl: combinedData.ticketUrl,
                    ticketNotes: combinedData.ticketNotes,
                    calendarId: combinedData.reminderCalendarId
                });
            }

            // Create event
            if (combinedData.createEvent) {
                results.event = await this.createCalendarEvent({
                    eventName: combinedData.eventName,
                    eventType: combinedData.eventType,
                    eventDateTime: combinedData.eventDateTime,
                    participants: combinedData.participants,
                    location: combinedData.location,
                    isAllDay: combinedData.isAllDay,
                    durationHours: combinedData.durationHours,
                    durationDays: combinedData.durationDays,
                    calendarId: combinedData.eventCalendarId
                });
            }

            return results;

        } catch (error) {
            ErrorHandler.handleGeneralError(error);
            throw error;
        }
    }

    /**
     * Build event timing (start/end) based on all-day or timed event
     * @param {Object} eventData - Event data with timing information
     * @returns {Object} Event timing object with start and end
     */
    buildEventTiming(eventData) {
        const timezone = DateTimeUtils.getTimezone();
        
        if (eventData.isAllDay) {
            const startDate = new Date(eventData.eventDateTime).toISOString().slice(0, 10);
            const endDate = DateTimeUtils.calculateEndDate(eventData.eventDateTime, eventData.durationDays || 1);
            
            return {
                start: { date: startDate, timeZone: timezone },
                end: { date: endDate, timeZone: timezone }
            };
        } else {
            const startDateTime = new Date(eventData.eventDateTime).toISOString();
            const endDateTime = DateTimeUtils.calculateEndTime(eventData.eventDateTime, eventData.durationHours || 2);
            
            return {
                start: { dateTime: startDateTime, timeZone: timezone },
                end: { dateTime: endDateTime, timeZone: timezone }
            };
        }
    }

    /**
     * Build reminder description with optional URL and notes
     * @param {number} participantCount - Number of participants
     * @param {string} noun - "billet" or "billetter"
     * @param {string} participantString - Formatted participant string
     * @param {string} ticketUrl - Optional ticket URL
     * @param {string} ticketNotes - Optional notes
     * @returns {string} Formatted description
     */
    buildReminderDescription(participantCount, noun, participantString, ticketUrl, ticketNotes) {
        let description = `${participantCount} ${noun}; Til ${participantString}`;
        
        if (ticketUrl && ticketUrl.trim()) {
            description += '\n\n' + ticketUrl.trim();
        }
        
        if (ticketNotes && ticketNotes.trim()) {
            description += '\n\n' + ticketNotes.trim();
        }
        
        return description;
    }

    /**
     * Format participant list for Danish locale
     * @param {Array<string>} participants - Array of participant names
     * @returns {string} Formatted participant string
     */
    formatParticipants(participants) {
        if (!Array.isArray(participants) || participants.length === 0) {
            return '';
        }

        const cleanParticipants = participants
            .map(p => typeof p === 'string' ? p.trim() : String(p).trim())
            .filter(p => p !== '');

        if (cleanParticipants.length === 0) return '';
        if (cleanParticipants.length === 1) return cleanParticipants[0];
        if (cleanParticipants.length === 2) {
            return `${cleanParticipants[0]} og ${cleanParticipants[1]}`;
        }

        const lastParticipant = cleanParticipants[cleanParticipants.length - 1];
        const otherParticipants = cleanParticipants.slice(0, -1);
        return `${otherParticipants.join(', ')} og ${lastParticipant}`;
    }

    /**
     * Validate event type
     * @param {string} eventType - Event type to validate
     * @throws {Error} If event type is invalid
     */
    validateEventType(eventType) {
        const validTypes = Object.keys(EVENT_TYPES).map(t => t.toLowerCase());
        if (!validTypes.includes(eventType.toLowerCase())) {
            throw new Error(`Invalid event type: ${eventType}. Valid types: ${validTypes.join(', ')}`);
        }
    }

    /**
     * Get available event types
     * @returns {Array<Object>} Array of event type objects with emoji, category and key
     */
    getAvailableEventTypes() {
        return Object.entries(EVENT_TYPES).map(([key, config]) => ({
            key: key.toLowerCase(),
            emoji: config.emoji,
            category: config.category,
            display: `${config.emoji} ${config.category}`
        }));
    }

    /**
     * Create a quick event with minimal data
     * @param {string} eventName - Event name
     * @param {Date|string} eventDate - Event date
     * @param {string} calendarId - Target calendar ID
     * @param {string} eventType - Event type (defaults to 'other')
     * @returns {Promise<Object>} Created event
     */
    async createQuickEvent(eventName, eventDate, calendarId, eventType = 'other') {
        const eventData = {
            eventName,
            eventType,
            eventDateTime: eventDate,
            participants: [],
            calendarId,
            isAllDay: true,
            durationDays: 1
        };

        return this.createCalendarEvent(eventData);
    }

    /**
     * Duplicate an existing event with modifications
     * @param {string} originalEventId - ID of event to duplicate
     * @param {string} originalCalendarId - Calendar ID of original event
     * @param {Object} modifications - Modifications to apply
     * @returns {Promise<Object>} Created duplicate event
     */
    async duplicateEvent(originalEventId, originalCalendarId, modifications = {}) {
        try {
            // This would require implementing getEvent in CalendarService first
            // const originalEvent = await this.calendarService.getEvent(originalEventId, originalCalendarId);
            
            // For now, throw an error indicating this feature needs the base method
            throw new Error('Event duplication requires CalendarService.getEvent() to be implemented');
            
        } catch (error) {
            ErrorHandler.handleGeneralError(error);
            throw error;
        }
    }
}