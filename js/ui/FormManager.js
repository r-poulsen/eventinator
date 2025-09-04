import { DateTimeUtils } from '../utils/DateTimeUtils.js';
import { UI_TEXT } from '../config/constants.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

/**
 * Manages form validation, state, and UI interactions
 */
export class FormManager {
    constructor() {
        this.formElements = {};
        this.validators = {};
        this.observers = [];
        this.isInitialized = false;
    }

    /**
     * Initialize the form manager
     */
    initialize() {
        this.cacheFormElements();
        this.setupEventListeners();
        this.setupDurationToggle();
        this.initializeDateTime();
        this.updateFormState();
        this.isInitialized = true;
    }

    /**
     * Cache references to form elements
     */
    cacheFormElements() {
        this.formElements = {
            // Checkboxes
            purchaseReminder: document.getElementById('purchase_reminder'),
            calendarEntry: document.getElementById('calendar_entry'),
            allDay: document.getElementById('all_day'),
            automaticAuthorize: document.getElementById('automatic_authorize'),

            // Text inputs
            eventName: document.getElementById('event_name'),
            location: document.getElementById('location'),
            ticketUrl: document.getElementById('ticket_url'),
            ticketNotes: document.getElementById('ticket_notes'),

            // Date/time inputs
            ticketDateTime: document.getElementById('ticket_dt'),
            eventDateTime: document.getElementById('event_dt'),

            // Duration inputs
            eventDurationHours: document.getElementById('event_duration_hours'),
            eventDurationDays: document.getElementById('event_duration_days'),

            // Select elements
            eventTypeSelect: document.getElementById('event_type_sel'),
            ticketCalendarSelect: document.getElementById('ticket_calendar_select'),
            eventCalendarSelect: document.getElementById('event_calendar_select'),

            // Buttons
            addButton: document.getElementById('add_btn'),

            // Containers
            ticketContainer: document.getElementById('ticket'),
            ticketCalendarContainer: document.getElementById('ticket_calendar'),
            eventContainer: document.getElementById('event'),
            eventTimeContainer: document.getElementById('event_time'),
            eventCalendarContainer: document.getElementById('event_calendar'),
            durationHoursContainer: document.getElementById('duration_hours_elements'),
            durationDaysContainer: document.getElementById('duration_days_elements')
        };

        // Validate that required elements exist
        const requiredElements = [
            'purchaseReminder', 'calendarEntry', 'eventName', 'addButton'
        ];

        requiredElements.forEach(elementName => {
            if (!this.formElements[elementName]) {
                console.warn(`Required form element '${elementName}' not found`);
            }
        });
    }

    /**
     * Setup event listeners for form elements
     */
    setupEventListeners() {
        // Checkbox change listeners
        ['purchaseReminder', 'calendarEntry'].forEach(checkboxName => {
            const checkbox = this.formElements[checkboxName];
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.updateFormState();
                    this.notifyObservers();
                });
            }
        });

        // Input change listeners for validation
        ['eventName', 'ticketDateTime', 'eventDateTime'].forEach(inputName => {
            const input = this.formElements[inputName];
            if (input) {
                input.addEventListener('input', () => {
                    this.updateAddButton();
                    this.notifyObservers();
                });

                input.addEventListener('blur', () => {
                    this.validateField(inputName);
                });
            }
        });

        // All-day toggle
        if (this.formElements.allDay) {
            this.formElements.allDay.addEventListener('change', () => {
                this.toggleDurationInputs();
                this.notifyObservers();
            });
        }
    }

    /**
     * Setup duration input toggle functionality
     */
    setupDurationToggle() {
        this.toggleDurationInputs();
    }

    /**
     * Initialize date/time inputs with default values
     */
    initializeDateTime() {
        DateTimeUtils.initializeDefaultDateTimes();
    }

    /**
     * Toggle between hours and days duration inputs
     */
    toggleDurationInputs() {
        if (!this.formElements.allDay) return;

        const isAllDay = this.formElements.allDay.checked;
        
        if (this.formElements.durationHoursContainer) {
            this.formElements.durationHoursContainer.style.display = isAllDay ? 'none' : '';
        }
        
        if (this.formElements.durationDaysContainer) {
            this.formElements.durationDaysContainer.style.display = isAllDay ? '' : 'none';
        }
    }

    /**
     * Update form state based on checkbox selections
     */
    updateFormState() {
        const isPurchaseReminderChecked = this.formElements.purchaseReminder?.checked || false;
        const isCalendarEntryChecked = this.formElements.calendarEntry?.checked || false;

        // Enable/disable form sections
        this.enableContainer('ticket', isPurchaseReminderChecked);
        this.enableContainer('ticketCalendar', isPurchaseReminderChecked);
        this.enableContainer('eventTime', isCalendarEntryChecked);
        this.enableContainer('event', isPurchaseReminderChecked || isCalendarEntryChecked);
        this.enableContainer('eventCalendar', isCalendarEntryChecked);

        this.toggleDurationInputs();
        this.updateAddButton();
    }

    /**
     * Enable or disable a container and its elements
     * @param {string} containerName - Name of the container
     * @param {boolean} enable - Whether to enable the container
     */
    enableContainer(containerName, enable = true) {
        const containerKey = containerName + 'Container';
        const container = this.formElements[containerKey];
        
        if (!container) return;

        // Show/hide container
        container.style.display = enable ? '' : 'none';
        
        // Enable/disable all form elements within container
        const elements = container.querySelectorAll('input, select, textarea, button');
        elements.forEach(element => {
            element.disabled = !enable;
        });
    }

    /**
     * Update the add button state and text
     */
    updateAddButton() {
        if (!this.formElements.addButton) return;

        const isPurchaseReminderChecked = this.formElements.purchaseReminder?.checked || false;
        const isCalendarEntryChecked = this.formElements.calendarEntry?.checked || false;
        const isEventNameValid = this.isFieldValid('eventName');
        const isEventDateValid = this.isFieldValid('eventDateTime');
        const isTicketDateValid = this.isFieldValid('ticketDateTime');

        // Determine button text and enabled state
        let buttonText = '';
        let isEnabled = false;

        if (isPurchaseReminderChecked && isCalendarEntryChecked) {
            buttonText = UI_TEXT.DA.CREATE_REMINDER_AND_EVENT;
            isEnabled = isEventNameValid && isEventDateValid && isTicketDateValid;
        } else if (isPurchaseReminderChecked && !isCalendarEntryChecked) {
            buttonText = UI_TEXT.DA.CREATE_REMINDER;
            isEnabled = isEventNameValid && isTicketDateValid;
        } else if (!isPurchaseReminderChecked && isCalendarEntryChecked) {
            buttonText = UI_TEXT.DA.CREATE_EVENT;
            isEnabled = isEventNameValid && isEventDateValid;
        }

        // Update button
        if (buttonText) {
            this.formElements.addButton.textContent = buttonText;
            this.formElements.addButton.disabled = !isEnabled;
            this.formElements.addButton.style.display = '';
        } else {
            this.formElements.addButton.style.display = 'none';
        }
    }

    /**
     * Validate a specific form field
     * @param {string} fieldName - Name of the field to validate
     * @returns {boolean} Whether the field is valid
     */
    validateField(fieldName) {
        const element = this.formElements[fieldName];
        if (!element) return true;

        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'eventName':
                isValid = element.value.trim() !== '';
                errorMessage = 'Event name is required';
                break;
                
            case 'ticketDateTime':
            case 'eventDateTime':
                const dateValue = element.value;
                isValid = dateValue && !isNaN(Date.parse(dateValue));
                errorMessage = 'Valid date and time is required';
                break;
                
            default:
                // Custom validator if exists
                if (this.validators[fieldName]) {
                    const result = this.validators[fieldName](element.value);
                    isValid = result.isValid;
                    errorMessage = result.message;
                }
        }

        // Update UI to show validation state
        this.updateFieldValidation(element, isValid, errorMessage);
        
        return isValid;
    }

    /**
     * Check if a field is valid
     * @param {string} fieldName - Name of the field to check
     * @returns {boolean} Whether the field is valid
     */
    isFieldValid(fieldName) {
        const element = this.formElements[fieldName];
        if (!element) return true;

        switch (fieldName) {
            case 'eventName':
                return element.value.trim() !== '';
            case 'ticketDateTime':
            case 'eventDateTime':
                const dateValue = element.value;
                return dateValue && !isNaN(Date.parse(dateValue));
            default:
                return true;
        }
    }

    /**
     * Update field validation UI
     * @param {HTMLElement} element - The form element
     * @param {boolean} isValid - Whether the field is valid
     * @param {string} errorMessage - Error message to display
     */
    updateFieldValidation(element, isValid, errorMessage) {
        // Remove existing validation classes
        element.classList.remove('valid', 'invalid');
        
        // Add appropriate class
        element.classList.add(isValid ? 'valid' : 'invalid');
        
        // Handle error message display
        let errorElement = element.parentNode.querySelector('.error-message');
        
        if (!isValid && errorMessage) {
            if (!errorElement) {
                errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                element.parentNode.appendChild(errorElement);
            }
            errorElement.textContent = errorMessage;
        } else if (errorElement) {
            errorElement.remove();
        }
    }

    /**
     * Validate the entire form
     * @returns {Object} Validation result with details
     */
    validateForm() {
        const isPurchaseReminderChecked = this.formElements.purchaseReminder?.checked || false;
        const isCalendarEntryChecked = this.formElements.calendarEntry?.checked || false;
        
        const errors = [];
        
        if (!isPurchaseReminderChecked && !isCalendarEntryChecked) {
            errors.push('Please select at least one option: Purchase Reminder or Calendar Entry');
        }

        // Validate event name (required for both options)
        if ((isPurchaseReminderChecked || isCalendarEntryChecked) && !this.isFieldValid('eventName')) {
            errors.push('Event name is required');
        }

        // Validate ticket date (required for reminder)
        if (isPurchaseReminderChecked && !this.isFieldValid('ticketDateTime')) {
            errors.push('Ticket reminder date is required');
        }

        // Validate event date (required for calendar entry)
        if (isCalendarEntryChecked && !this.isFieldValid('eventDateTime')) {
            errors.push('Event date is required');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get form data as an object
     * @returns {Object} Current form data
     */
    getFormData() {
        return {
            // Options
            createReminder: this.formElements.purchaseReminder?.checked || false,
            createEvent: this.formElements.calendarEntry?.checked || false,
            isAllDay: this.formElements.allDay?.checked || false,

            // Basic info
            eventName: this.formElements.eventName?.value.trim() || '',
            location: this.formElements.location?.value.trim() || '',

            // Reminder data
            ticketDateTime: this.formElements.ticketDateTime?.value || '',
            ticketUrl: this.formElements.ticketUrl?.value.trim() || '',
            ticketNotes: this.formElements.ticketNotes?.value.trim() || '',

            // Event data
            eventDateTime: this.formElements.eventDateTime?.value || '',
            eventType: this.formElements.eventTypeSelect?.value || '',
            durationHours: parseInt(this.formElements.eventDurationHours?.value) || 2,
            durationDays: parseInt(this.formElements.eventDurationDays?.value) || 1,

            // Calendar selection
            reminderCalendarId: this.formElements.ticketCalendarSelect?.value || '',
            eventCalendarId: this.formElements.eventCalendarSelect?.value || ''
        };
    }

    /**
     * Reset the form to its initial state
     */
    resetForm() {
        // Uncheck checkboxes
        if (this.formElements.purchaseReminder) this.formElements.purchaseReminder.checked = false;
        if (this.formElements.calendarEntry) this.formElements.calendarEntry.checked = false;
        if (this.formElements.allDay) this.formElements.allDay.checked = false;

        // Clear text inputs
        ['eventName', 'location', 'ticketUrl', 'ticketNotes'].forEach(fieldName => {
            if (this.formElements[fieldName]) {
                this.formElements[fieldName].value = '';
            }
        });

        // Reset durations to default
        if (this.formElements.eventDurationHours) this.formElements.eventDurationHours.value = '2';
        if (this.formElements.eventDurationDays) this.formElements.eventDurationDays.value = '1';

        // Clear validation states
        Object.values(this.formElements).forEach(element => {
            if (element && element.classList) {
                element.classList.remove('valid', 'invalid');
            }
        });

        // Remove error messages
        document.querySelectorAll('.error-message').forEach(error => error.remove());

        // Reinitialize datetime
        this.initializeDateTime();
        this.updateFormState();
    }

    /**
     * Add a custom validator for a field
     * @param {string} fieldName - Name of the field
     * @param {Function} validator - Validator function that returns {isValid, message}
     */
    addValidator(fieldName, validator) {
        this.validators[fieldName] = validator;
    }

    /**
     * Add observer for form changes
     * @param {Function} callback - Callback function
     */
    addObserver(callback) {
        if (typeof callback === 'function') {
            this.observers.push(callback);
        }
    }

    /**
     * Remove observer
     * @param {Function} callback - Callback function to remove
     */
    removeObserver(callback) {
        const index = this.observers.indexOf(callback);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    /**
     * Notify observers of form changes
     */
    notifyObservers() {
        const formData = this.getFormData();
        const validation = this.validateForm();

        this.observers.forEach(callback => {
            try {
                callback({ formData, validation });
            } catch (error) {
                console.warn('Error in FormManager observer:', error);
            }
        });
    }

    /**
     * Populate calendar select elements
     * @param {Array} calendars - Array of calendar objects
     */
    populateCalendarSelects(calendars) {
        [this.formElements.ticketCalendarSelect, this.formElements.eventCalendarSelect].forEach(select => {
            if (!select) return;

            // Clear existing options
            select.innerHTML = '';

            // Add calendar options
            calendars.forEach(calendar => {
                const option = document.createElement('option');
                option.value = calendar.id;
                option.textContent = calendar.summary;
                select.appendChild(option);
            });
        });
    }

    /**
     * Set selected calendar values from stored preferences
     * @param {string} eventCalendarId - Event calendar ID
     * @param {string} reminderCalendarId - Reminder calendar ID
     */
    setSelectedCalendars(eventCalendarId, reminderCalendarId) {
        if (this.formElements.eventCalendarSelect && eventCalendarId) {
            this.formElements.eventCalendarSelect.value = eventCalendarId;
        }
        
        if (this.formElements.ticketCalendarSelect && reminderCalendarId) {
            this.formElements.ticketCalendarSelect.value = reminderCalendarId;
        }
    }

    /**
     * Show/hide the form
     * @param {boolean} visible - Whether the form should be visible
     */
    setVisible(visible) {
        const mainContainer = document.getElementById('main');
        if (mainContainer) {
            mainContainer.style.visibility = visible ? 'visible' : 'hidden';
        }
    }

    /**
     * Get current form state
     * @returns {Object} Current state object
     */
    getState() {
        return {
            formData: this.getFormData(),
            validation: this.validateForm(),
            isInitialized: this.isInitialized
        };
    }
}