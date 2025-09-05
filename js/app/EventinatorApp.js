import { GoogleAuth } from '../auth/GoogleAuth.js';
import { CalendarService } from '../calendar/CalendarService.js';
import { EventCreator } from '../calendar/EventCreator.js';
import { FormManager } from '../ui/FormManager.js';
import { ListInput } from '../ui/ListInput.js';
import { EventList } from '../ui/EventList.js';
import { Toaster } from '../ui/Toaster.js';
import { AppState } from './AppState.js';
import { AutocompleteManager } from '../storage/AutocompleteManager.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

/**
 * Main application class with dependency injection and clean architecture
 */
export class EventinatorApp {
    constructor(clientId) {
        this.clientId = clientId;
        
        // Initialize state management
        this.appState = new AppState();
        
        // Initialize services (dependency injection)
        this.authService = new GoogleAuth(clientId, this.handleAuthStateChange.bind(this));
        this.calendarService = new CalendarService(this.authService);
        this.eventCreator = new EventCreator(this.calendarService);
        
        // Initialize UI components
        this.formManager = new FormManager();
        this.eventList = new EventList();
        this.listInput = null;
        
        // Bind methods
        this.handleAddButtonClick = this.handleAddButtonClick.bind(this);
        this.handleFormChange = this.handleFormChange.bind(this);
        
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('Initializing Eventinator app...');
            
            // Initialize Google APIs
            await this.authService.initialize();
            
            // Initialize UI components
            this.initializeUIComponents();
            
            // Setup event listeners and state subscriptions
            this.setupEventListeners();
            this.setupStateSubscriptions();
            
            // Initialize autocomplete
            this.initializeAutocomplete();
            
            // Don't set initial UI state here - let authentication handle it
            
            this.isInitialized = true;
            console.log('Eventinator app initialized successfully');
            
        } catch (error) {
            ErrorHandler.handleGeneralError(error, Toaster);
            console.error('Failed to initialize Eventinator app:', error);
        }
    }

    /**
     * Initialize UI components
     */
    initializeUIComponents() {
        try {
            console.log('Initializing form manager...');
            // Initialize form manager
            this.formManager.initialize();
            
            console.log('Initializing list input...');
            // Initialize participant list input
            this.listInput = new ListInput('Participants', 'Deltager', 'Deltagere');
            
            console.log('Initializing autocomplete...');
            // Initialize autocomplete for participant inputs
            AutocompleteManager.initializeParticipantInputs('Participants_list_container');
            
            console.log('UI components initialized successfully');
        } catch (error) {
            console.error('Error initializing UI components:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add button click
        const addButton = document.getElementById('add_btn');
        if (addButton) {
            addButton.addEventListener('click', this.handleAddButtonClick);
        }

        // Authorize button click
        const authorizeButton = document.getElementById('authorize_button');
        if (authorizeButton) {
            authorizeButton.addEventListener('click', () => {
                this.authService.authenticate(true);
            });
        }

        // Automatic authorize checkbox
        const autoAuthCheckbox = document.getElementById('automatic_authorize');
        if (autoAuthCheckbox) {
            autoAuthCheckbox.addEventListener('change', (e) => {
                this.appState.setAutomaticAuthorize(e.target.checked);
            });
            
            // Set initial value
            autoAuthCheckbox.checked = this.appState.getState('preferences.automaticAuthorize');
        }

        // Form changes
        this.formManager.addObserver(this.handleFormChange);

        // Participant changes
        this.listInput.addObserver((data) => {
            this.handleParticipantChange(data);
        });
    }

    /**
     * Setup state subscriptions for reactive UI updates
     */
    setupStateSubscriptions() {
        // Authentication state changes
        this.appState.subscribe('auth.isAuthenticated', (isAuthenticated) => {
            this.updateUIVisibility(isAuthenticated);
        });

        // Calendar state changes
        this.appState.subscribe('calendars.list', (calendars) => {
            this.formManager.populateCalendarSelects(calendars);
        });

        // Events state changes
        this.appState.subscribe('events.list', (events) => {
            console.log('Events state changed, received events:', events.length);
            this.eventList.clearList();
            this.eventList.addEvents(events);
            console.log('Added events to EventList, now rendering...');
            this.eventList.render();
            console.log('EventList rendered, setting up filtering...');
            this.setupEventFiltering();
        });

        // Form state changes
        this.appState.subscribe('form.isSubmitting', (isSubmitting) => {
            this.updateSubmittingState(isSubmitting);
        });
    }

    /**
     * Initialize autocomplete for form fields
     */
    initializeAutocomplete() {
        AutocompleteManager.initialize('event_name');
        AutocompleteManager.initialize('location');
    }

    /**
     * Handle authentication state changes
     * @param {string} state - Authentication state
     */
    async handleAuthStateChange(state) {
        console.log('Auth state changed:', state, 'Type:', typeof state);
        
        if (state === 'initialized') {
            console.log('Setting auth initialized');
            this.appState.setAuthInitialized(true);
        } else if (state === 'authenticated') {
            console.log('Processing authenticated state');
            this.appState.setAuthenticated(true, this.authService.getAccessToken());
            console.log('About to call updateUIVisibility(true)');
            this.updateUIVisibility(true); // Directly update UI visibility
            console.log('Called updateUIVisibility, now loading calendars');
            await this.loadAndRenderCalendars();
        } else if (state === 'signed_out') {
            console.log('Processing signed out state');
            this.appState.setAuthenticated(false);
            this.updateUIVisibility(false); // Directly update UI visibility
            this.appState.reset();
        } else {
            console.error('Unknown auth state:', state);
        }
    }

    /**
     * Load calendars and events from Google Calendar API
     */
    async loadAndRenderCalendars() {
        try {
            console.log('Loading calendars and events...');
            this.appState.setCalendarsLoading(true);
            this.appState.setEventsLoading(true);

            // Load calendars
            console.log('Fetching calendars...');
            const calendars = await this.calendarService.getCalendars();
            const writableCalendars = calendars.filter(cal => cal.accessRole !== 'reader');
            console.log(`Found ${calendars.length} calendars, ${writableCalendars.length} writable`);
            
            this.appState.setCalendars(calendars);
            
            // Update form with calendar options
            console.log('Populating calendar selects...');
            this.formManager.populateCalendarSelects(writableCalendars);
            this.formManager.setSelectedCalendars(
                this.appState.getState('calendars.selectedEventCalendar'),
                this.appState.getState('calendars.selectedReminderCalendar')
            );

            // Load events from all calendars
            console.log('Fetching events...');
            const events = await this.calendarService.getEventinatorEvents();
            console.log(`Found ${events.length} events`);
            console.log('Sample events:', events.slice(0, 2));
            this.appState.setEvents(events);
            
            // Also directly render events as fallback
            console.log('Directly rendering events to EventList...');
            this.eventList.clearList();
            this.eventList.addEvents(events);
            this.eventList.render();
            console.log('Direct render completed');

            console.log('Calendar and event loading completed');
        } catch (error) {
            console.error('Error loading calendars/events:', error);
            ErrorHandler.handle(error, 'calendar_load', Toaster);
        }
    }

    /**
     * Handle add button click
     */
    async handleAddButtonClick() {
        try {
            // Validate form
            const validation = this.formManager.validateForm();
            if (!validation.isValid) {
                Toaster.validationError(validation.errors);
                return;
            }

            this.appState.setFormSubmitting(true);

            // Get form data
            const formData = this.formManager.getFormData();
            
            // Add participants from list input
            formData.participants = this.listInput.getValues();

            // Create events/reminders
            const results = await this.eventCreator.createReminderAndEvent(formData);

            // Show success messages
            if (results.reminder && results.event) {
                Toaster.reminderAndEventAdded(results.reminder, results.event);
            } else if (results.reminder) {
                Toaster.reminderAdded(results.reminder);
            } else if (results.event) {
                Toaster.eventAdded(results.event);
            }

            // Save autocomplete data
            this.saveAutocompleteData(formData);

            // Reload events to show the new ones
            await this.loadAndRenderCalendars();

        } catch (error) {
            ErrorHandler.handleGeneralError(error, Toaster);
        } finally {
            this.appState.setFormSubmitting(false);
        }
    }

    /**
     * Handle form changes
     * @param {Object} changeData - Form change data
     */
    handleFormChange(changeData) {
        const { formData, validation } = changeData;
        this.appState.setFormState(formData, validation);

        // Save selected calendars
        if (formData.eventCalendarId) {
            this.appState.setSelectedEventCalendar(formData.eventCalendarId);
        }
        if (formData.reminderCalendarId) {
            this.appState.setSelectedReminderCalendar(formData.reminderCalendarId);
        }
    }

    /**
     * Handle participant changes
     * @param {Object} participantData - Participant change data
     */
    handleParticipantChange(participantData) {
        // Update form state with participant count
        const currentFormData = this.formManager.getFormData();
        currentFormData.participantCount = participantData.count;
        
        // Trigger form validation update
        this.formManager.updateAddButton();
    }

    /**
     * Save autocomplete data
     * @param {Object} formData - Form data to extract autocomplete values from
     */
    saveAutocompleteData(formData) {
        // Save event name
        if (formData.eventName) {
            AutocompleteManager.addSuggestion('event_name', formData.eventName);
        }

        // Save location
        if (formData.location) {
            AutocompleteManager.addSuggestion('location', formData.location);
        }

        // Save participants
        if (formData.participants && Array.isArray(formData.participants)) {
            formData.participants.forEach(participant => {
                if (participant.trim()) {
                    AutocompleteManager.addSuggestion('participants', participant, 'participants_autocomplete');
                }
            });
        }
    }

    /**
     * Update UI visibility based on authentication state
     * @param {boolean} isAuthenticated - Whether user is authenticated
     */
    updateUIVisibility(isAuthenticated) {
        const authorizeContainer = document.getElementById('authorize');
        const mainContainer = document.getElementById('main');

        console.log('Updating UI visibility, authenticated:', isAuthenticated);
        console.log('Authorize container found:', !!authorizeContainer);
        console.log('Main container found:', !!mainContainer);

        if (authorizeContainer) {
            console.log('Hiding authorize container');
            authorizeContainer.style.display = isAuthenticated ? 'none' : '';
            console.log('Authorize container display:', authorizeContainer.style.display);
        } else {
            console.error('Authorize container not found!');
        }

        if (mainContainer) {
            console.log('Showing main container');
            mainContainer.style.visibility = isAuthenticated ? 'visible' : 'hidden';
            console.log('Main container visibility:', mainContainer.style.visibility);
        } else {
            console.error('Main container not found!');
        }
        
        console.log('UI visibility updated');
    }

    /**
     * Update UI submitting state
     * @param {boolean} isSubmitting - Whether form is being submitted
     */
    updateSubmittingState(isSubmitting) {
        const addButton = document.getElementById('add_btn');
        if (addButton) {
            addButton.disabled = isSubmitting;
            if (isSubmitting) {
                addButton.textContent = 'Creating...';
            } else {
                // Let the form manager handle the button text
                this.formManager.updateAddButton();
            }
        }

        // Don't change main form visibility - just button state is sufficient
    }

    /**
     * Setup event filtering UI
     */
    setupEventFiltering() {
        const participants = this.appState.getState('events.participants');
        
        // Create participant filter checkboxes
        this.createParticipantFilter(participants);
    }

    /**
     * Create participant filter checkboxes
     * @param {Array<string>} participants - List of all participants
     */
    createParticipantFilter(participants) {
        const container = document.getElementById('filter_names_container');
        if (!container) return;

        // Clear existing checkboxes
        container.innerHTML = '';

        participants.forEach(participant => {
            const checkboxId = `participant_show_${participant}`;
            
            // Skip if checkbox already exists
            if (document.getElementById(checkboxId)) return;

            // Create checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            checkbox.checked = true;
            checkbox.addEventListener('change', () => this.filterByParticipants());

            // Create label
            const label = document.createElement('label');
            label.htmlFor = checkboxId;
            label.textContent = participant;

            container.appendChild(checkbox);
            container.appendChild(label);
        });
    }

    /**
     * Filter events by selected participants
     */
    filterByParticipants() {
        const checkboxes = document.querySelectorAll('#filter_names_container input[type="checkbox"]');
        const selectedParticipants = [];

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const participant = checkbox.id.replace('participant_show_', '');
                selectedParticipants.push(participant);
            }
        });

        // Update event list filters
        this.eventList.setParticipantFilter(selectedParticipants);

        // Update app state
        this.appState.setActiveFilters({
            ...this.appState.getState('ui.activeFilters'),
            participants: selectedParticipants
        });
    }

    /**
     * Handle application errors globally
     * @param {Error} error - The error that occurred
     * @param {string} context - Context where the error occurred
     */
    handleError(error, context = 'general') {
        console.error(`Error in ${context}:`, error);
        
        // Handle authentication errors specially
        if (this.authService.isAuthenticationError(error)) {
            this.authService.signOut();
            Toaster.authRequired();
            return;
        }

        // Handle other errors
        ErrorHandler.handleGeneralError(error, Toaster);
    }

    /**
     * Get application status
     * @returns {Object} Current application status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            appState: this.appState.getStatus(),
            services: {
                auth: this.authService.getAuthStatus(),
                calendar: !!this.calendarService,
                eventCreator: !!this.eventCreator
            }
        };
    }

    /**
     * Cleanup and destroy the application
     */
    destroy() {
        try {
            // Remove event listeners
            const addButton = document.getElementById('add_btn');
            if (addButton) {
                addButton.removeEventListener('click', this.handleAddButtonClick);
            }

            // Cleanup UI components
            if (this.listInput) {
                this.listInput.destroy();
            }

            // Sign out user
            if (this.authService) {
                this.authService.signOut();
            }

            console.log('Eventinator app destroyed');
            
        } catch (error) {
            console.error('Error during app destruction:', error);
        }
    }
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});