import { DateTimeUtils } from '../utils/DateTimeUtils.js';
import { EVENT_PATTERN, PARTICIPANT_PATTERN } from '../config/constants.js';

/**
 * Enhanced event list display component
 */
export class EventList {
    constructor(containerId = 'event_table_container') {
        this.containerId = containerId;
        this.parentElement = document.getElementById(containerId);
        this.events = [];
        this.filteredEvents = [];
        this.filters = {
            participants: new Set(),
            dateRange: null,
            searchText: ''
        };
        this.sortConfig = {
            field: 'date',
            ascending: true
        };

        if (!this.parentElement) {
            throw new Error(`Container element with ID '${containerId}' not found`);
        }

        this.initialize();
    }

    /**
     * Initialize the event list component
     */
    initialize() {
        this.parentElement.innerHTML = '';
        this.parentElement.className = 'event-list-container';
    }

    /**
     * Add a single event to the list
     * @param {Object} event - Calendar event object
     */
    addEvent(event) {
        if (!event || !event.summary) {
            console.log('Skipping event - no event or summary:', event);
            return;
        }
        
        console.log('Checking event pattern for:', event.summary);
        // Only add Eventinator events (matching the emoji pattern)
        if (EVENT_PATTERN.test(event.summary)) {
            console.log('Event matches pattern, adding:', event.summary);
            this.events.push(event);
            this.updateFiltered();
        } else {
            console.log('Event does not match pattern, skipping:', event.summary);
        }
    }

    /**
     * Add multiple events to the list
     * @param {Array<Object>} events - Array of calendar event objects
     */
    addEvents(events) {
        if (!Array.isArray(events)) return;
        
        events.forEach(event => this.addEvent(event));
    }

    /**
     * Clear all events from the list
     */
    clearList() {
        this.events = [];
        this.filteredEvents = [];
        this.parentElement.innerHTML = '';
    }

    /**
     * Update the filtered events list based on current filters
     */
    updateFiltered() {
        this.filteredEvents = this.events.filter(event => {
            return this.matchesFilters(event);
        });
        
        this.sortEvents();
    }

    /**
     * Check if an event matches current filters
     * @param {Object} event - Event to check
     * @returns {boolean} Whether the event matches filters
     */
    matchesFilters(event) {
        // Participant filter
        if (this.filters.participants.size > 0) {
            const eventParticipants = this.extractParticipants(event.description);
            const hasMatchingParticipant = eventParticipants.some(participant =>
                this.filters.participants.has(participant)
            );
            if (!hasMatchingParticipant) return false;
        }

        // Date range filter
        if (this.filters.dateRange) {
            const eventDate = new Date(event.start.dateTime || event.start.date);
            const { start, end } = this.filters.dateRange;
            
            if (start && eventDate < start) return false;
            if (end && eventDate > end) return false;
        }

        // Search text filter
        if (this.filters.searchText) {
            const searchLower = this.filters.searchText.toLowerCase();
            const eventText = `${event.summary} ${event.description || ''} ${event.location || ''}`.toLowerCase();
            if (!eventText.includes(searchLower)) return false;
        }

        return true;
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
     * Extract event name from summary
     * @param {string} summary - Event summary
     * @returns {string|null} Event name without emoji and category
     */
    extractEventName(summary) {
        if (!summary) return null;
        
        const matches = summary.match(EVENT_PATTERN);
        return matches ? matches[1] : summary;
    }

    /**
     * Sort events based on current sort configuration
     */
    sortEvents() {
        this.filteredEvents.sort((a, b) => {
            let valueA, valueB;

            switch (this.sortConfig.field) {
                case 'date':
                    valueA = new Date(a.start.dateTime || a.start.date);
                    valueB = new Date(b.start.dateTime || b.start.date);
                    break;
                case 'name':
                    valueA = this.extractEventName(a.summary) || '';
                    valueB = this.extractEventName(b.summary) || '';
                    break;
                case 'location':
                    valueA = a.location || '';
                    valueB = b.location || '';
                    break;
                default:
                    valueA = 0;
                    valueB = 0;
            }

            let comparison = 0;
            if (valueA > valueB) comparison = 1;
            if (valueA < valueB) comparison = -1;

            return this.sortConfig.ascending ? comparison : -comparison;
        });
    }

    /**
     * Render the event list into the DOM
     */
    render() {
        console.log('EventList render() called');
        console.log('Events to render:', this.events.length);
        console.log('Filtered events:', this.filteredEvents.length);
        
        this.parentElement.innerHTML = '';
        
        if (this.filteredEvents.length === 0) {
            console.log('No filtered events, showing empty state');
            this.renderEmptyState();
            return;
        }

        // Group events by year
        const eventsByYear = this.groupEventsByYear(this.filteredEvents);
        
        // Render each year group
        Object.keys(eventsByYear)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .forEach(year => {
                this.renderYearSection(year, eventsByYear[year]);
            });
    }

    /**
     * Group events by year
     * @param {Array<Object>} events - Events to group
     * @returns {Object} Events grouped by year
     */
    groupEventsByYear(events) {
        const groups = {};
        
        events.forEach(event => {
            const eventDate = new Date(event.start.dateTime || event.start.date);
            const year = eventDate.getFullYear();
            
            if (!groups[year]) {
                groups[year] = [];
            }
            groups[year].push(event);
        });

        return groups;
    }

    /**
     * Render a year section with its events
     * @param {string} year - The year
     * @param {Array<Object>} events - Events for this year
     */
    renderYearSection(year, events) {
        // Create year header
        const yearHeader = document.createElement('div');
        yearHeader.className = 'year_header';
        yearHeader.textContent = year;
        this.parentElement.appendChild(yearHeader);

        // Create table
        const table = document.createElement('table');
        table.className = 'event-table';
        
        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th class="participants-header">Participants</th>
                <th class="datetime-header sortable" data-field="date">Date/Time</th>
                <th class="eventname-header sortable" data-field="name">Event</th>
                <th class="location-header sortable" data-field="location">Location</th>
            </tr>
        `;
        
        // Add sort indicators
        const sortHeaders = thead.querySelectorAll('.sortable');
        sortHeaders.forEach(header => {
            if (header.dataset.field === this.sortConfig.field) {
                const indicator = this.sortConfig.ascending ? '↑' : '↓';
                header.textContent += ` ${indicator}`;
            }
            
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                this.handleSort(header.dataset.field);
            });
        });

        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        events.forEach(event => {
            tbody.appendChild(this.createEventRow(event));
        });
        
        table.appendChild(tbody);
        this.parentElement.appendChild(table);
    }

    /**
     * Create a table row for an event
     * @param {Object} event - Calendar event object
     * @returns {HTMLTableRowElement} Table row element
     */
    createEventRow(event) {
        const row = document.createElement('tr');
        row.className = 'event-row';
        row.addEventListener('click', () => {
            if (event.htmlLink) {
                window.open(event.htmlLink, '_blank');
            }
        });

        // Participants cell
        const participantsCell = document.createElement('td');
        participantsCell.className = 'participants-cell';
        this.renderParticipants(participantsCell, event.description);
        row.appendChild(participantsCell);

        // Date/Time cell
        const datetimeCell = document.createElement('td');
        datetimeCell.className = 'datetime-cell';
        datetimeCell.innerHTML = this.formatEventDateTime(event);
        row.appendChild(datetimeCell);

        // Event name cell
        const eventnameCell = document.createElement('td');
        eventnameCell.className = 'eventname-cell';
        const eventName = this.extractEventName(event.summary);
        eventnameCell.textContent = eventName || event.summary;
        row.appendChild(eventnameCell);

        // Location cell
        const locationCell = document.createElement('td');
        locationCell.className = 'location-cell';
        locationCell.textContent = event.location || '';
        row.appendChild(locationCell);

        return row;
    }

    /**
     * Render participants in a cell
     * @param {HTMLElement} cell - The cell element
     * @param {string} description - Event description
     */
    renderParticipants(cell, description) {
        const participants = this.extractParticipants(description);
        
        participants.forEach(participant => {
            const participantDiv = document.createElement('div');
            participantDiv.className = 'name';
            participantDiv.textContent = participant;
            participantDiv.dataset.participant = participant;
            cell.appendChild(participantDiv);
        });
    }

    /**
     * Format event date/time for display
     * @param {Object} event - Calendar event object
     * @returns {string} Formatted date/time string
     */
    formatEventDateTime(event) {
        if (event.start.date) {
            // All-day event
            return DateTimeUtils.formatAllDayDateRange(event.start.date, event.end.date);
        } else {
            // Timed event
            return DateTimeUtils.formatDate(event.start.dateTime, true);
        }
    }

    /**
     * Render empty state when no events match filters
     */
    renderEmptyState() {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = `
            <p>No events found.</p>
            <p class="empty-state-subtitle">Try adjusting your filters or create a new event.</p>
        `;
        this.parentElement.appendChild(emptyDiv);
    }

    /**
     * Handle column sort
     * @param {string} field - Field to sort by
     */
    handleSort(field) {
        if (this.sortConfig.field === field) {
            this.sortConfig.ascending = !this.sortConfig.ascending;
        } else {
            this.sortConfig.field = field;
            this.sortConfig.ascending = true;
        }

        this.sortEvents();
        this.render();
    }

    /**
     * Set participant filter
     * @param {Array<string>} participants - Participants to show (empty array shows all)
     */
    setParticipantFilter(participants) {
        this.filters.participants = new Set(participants);
        this.updateFiltered();
        this.render();
    }

    /**
     * Set date range filter
     * @param {Date|null} startDate - Start date (null for no start limit)
     * @param {Date|null} endDate - End date (null for no end limit)
     */
    setDateRangeFilter(startDate, endDate) {
        this.filters.dateRange = { start: startDate, end: endDate };
        this.updateFiltered();
        this.render();
    }

    /**
     * Set search text filter
     * @param {string} searchText - Text to search for
     */
    setSearchFilter(searchText) {
        this.filters.searchText = searchText.trim();
        this.updateFiltered();
        this.render();
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters = {
            participants: new Set(),
            dateRange: null,
            searchText: ''
        };
        this.updateFiltered();
        this.render();
    }

    /**
     * Get all unique participants from current events
     * @returns {Array<string>} Sorted array of unique participants
     */
    getAllParticipants() {
        const participantSet = new Set();
        
        this.events.forEach(event => {
            const participants = this.extractParticipants(event.description);
            participants.forEach(participant => participantSet.add(participant));
        });

        return Array.from(participantSet).sort();
    }

    /**
     * Get current filter state
     * @returns {Object} Current filters
     */
    getFilters() {
        return {
            participants: Array.from(this.filters.participants),
            dateRange: this.filters.dateRange,
            searchText: this.filters.searchText
        };
    }

    /**
     * Get event statistics
     * @returns {Object} Statistics about the events
     */
    getStatistics() {
        return {
            total: this.events.length,
            filtered: this.filteredEvents.length,
            uniqueParticipants: this.getAllParticipants().length,
            upcomingEvents: this.events.filter(event => {
                const eventDate = new Date(event.start.dateTime || event.start.date);
                return eventDate > new Date();
            }).length
        };
    }
}