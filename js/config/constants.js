/**
 * Configuration constants for Eventinator application
 */

export const TIME_CONSTANTS = {
    MINUTES_MS: 60 * 1000,
    HOURS_MS: 60 * 60 * 1000,
    DAYS_MS: 24 * 60 * 60 * 1000,
};

export const GOOGLE_API_CONFIG = {
    DISCOVERY_URL: "https://sheets.googleapis.com/$discovery/rest?version=v4",
    DISCOVERY_DOCS: [
        "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
    ],
    SCOPES: "https://www.googleapis.com/auth/calendar.events.owned " +
            "https://www.googleapis.com/auth/calendar.readonly",
    API_URLS: {
        GAPI: "https://apis.google.com/js/api.js",
        GIS: "https://accounts.google.com/gsi/client"
    }
};

export const EVENT_TYPES = {
    CONCERT: { emoji: '🎶', category: 'Koncert' },
    MOVIE: { emoji: '🎥', category: 'Film' },
    COMEDY: { emoji: '😀', category: 'Comedy' },
    SPORT: { emoji: '🏈', category: 'Sport' },
    THEATER: { emoji: '🎭', category: 'Teater' },
    FESTIVAL: { emoji: '🎉', category: 'Festival' },
    OTHER: { emoji: '🎫', category: 'Andet' }
};

export const EVENT_PATTERN = /^[🎶🎥😀🏈🎭🎉🎫] [A-Å]\w+: (.+)/u;

export const PARTICIPANT_PATTERN = /(?:Participants|Deltagere): (.+)/u;

export const UI_TEXT = {
    DA: {
        CREATE_REMINDER_AND_EVENT: "Opret påmindelse og begivenhed",
        CREATE_REMINDER: "Opret påmindelse",
        CREATE_EVENT: "Opret begivenhed",
        REMINDER_ADDED: "Påmindelse tilføjet",
        EVENT_ADDED: "Begivenhed tilføjet",
        ERROR_OCCURRED: "An error occurred!",
        PARTICIPANTS: "Deltagere",
        PARTICIPANT: "Deltager",
        TICKETS: "billetter",
        TICKET: "billet",
        BUY_TICKETS_FOR: "Køb {tickets} til {eventName}",
        FOR_PARTICIPANTS: "Til {participants}"
    }
};

export const DEFAULT_SETTINGS = {
    TICKET_REMINDER_DAYS_OFFSET: 1,
    TICKET_REMINDER_HOURS: 10,
    EVENT_DAYS_OFFSET: 30,
    EVENT_HOURS: 20,
    REMINDER_DURATION_MINUTES: 15,
    DEFAULT_EVENT_DURATION_HOURS: 2,
    DEFAULT_EVENT_DURATION_DAYS: 1
};

export const REMINDERS_CONFIG = {
    DEFAULT: false,
    OVERRIDES: [
        { method: "email", minutes: 30 },
        { method: "popup", minutes: 10 }
    ]
};

export const LOCALE_CONFIG = {
    TIMEZONE: Intl.DateTimeFormat().resolvedOptions().timeZone,
    LOCALE: 'da-DK',
    DATE_OPTIONS: {
        weekday: "short",
        day: "numeric",
        month: "short",
    },
    DATETIME_OPTIONS: {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "numeric",
    }
};

export const ERROR_CODES = {
    AUTH_ERROR: "a6b9",
    REMINDER_CREATION: "b5a5",
    EVENT_CREATION: "9bf8",
    GENERAL_ERROR: "c4d4",
    TOKEN_EXPIRED: "908f",
    INVALID_TOKEN: "4c4d"
};

export const STORAGE_KEYS = {
    ACCESS_TOKEN: "access_token",
    AUTOMATIC_AUTHORIZE: "automatic_authorize",
    LATEST_EVENT_CALENDAR: "latest_used_event_calendar",
    LATEST_REMINDER_CALENDAR: "latest_used_reminder_calendar"
};