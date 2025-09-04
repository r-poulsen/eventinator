import { GOOGLE_API_CONFIG } from '../config/constants.js';
import { LocalStorageService } from '../storage/LocalStorageService.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

/**
 * Handles Google OAuth authentication and API initialization
 */
export class GoogleAuth {
    constructor(clientId, onAuthStateChange = null) {
        this.clientId = clientId;
        this.onAuthStateChange = onAuthStateChange;
        this.tokenClient = null;
        this.gapiInited = false;
        this.gisInited = false;
        this.isAuthenticated = false;
    }

    /**
     * Initialize Google APIs and authentication
     * @returns {Promise<void>}
     */
    async initialize() {
        return Promise.all([
            this.loadGoogleAPIs(),
            this.loadGoogleIdentityServices()
        ]);
    }

    /**
     * Load Google APIs script and initialize gapi
     * @returns {Promise<void>}
     */
    loadGoogleAPIs() {
        return new Promise((resolve, reject) => {
            if (window.gapi && this.gapiInited) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = GOOGLE_API_CONFIG.API_URLS.GAPI;
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                window.gapi.load('client', async () => {
                    try {
                        await window.gapi.client.init({
                            discoveryDocs: GOOGLE_API_CONFIG.DISCOVERY_DOCS,
                        });
                        this.gapiInited = true;
                        this.checkInitializationComplete();
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            };

            script.onerror = () => {
                reject(new Error('Failed to load Google APIs script'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Load Google Identity Services script and initialize token client
     * @returns {Promise<void>}
     */
    loadGoogleIdentityServices() {
        return new Promise((resolve, reject) => {
            if (window.google && this.gisInited) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = GOOGLE_API_CONFIG.API_URLS.GIS;
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                try {
                    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: this.clientId,
                        scope: GOOGLE_API_CONFIG.SCOPES,
                        callback: this.handleAuthCallback.bind(this),
                        prompt: '',
                    });
                    this.gisInited = true;
                    this.checkInitializationComplete();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };

            script.onerror = () => {
                reject(new Error('Failed to load Google Identity Services script'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Check if both APIs are initialized and trigger callback
     */
    checkInitializationComplete() {
        if (this.gapiInited && this.gisInited) {
            this.onInitializationComplete();
        }
    }

    /**
     * Called when initialization is complete
     */
    onInitializationComplete() {
        if (this.onAuthStateChange) {
            this.onAuthStateChange('initialized');
        }

        // Check for existing token and auto-authenticate if enabled
        if (LocalStorageService.getAutomaticAuthorize()) {
            this.authenticate();
        }
    }

    /**
     * Handle authentication callback from Google
     * @param {Object} response - Authentication response
     */
    async handleAuthCallback(response) {
        try {
            if (response.error) {
                throw new Error(response.error);
            }

            // Store the access token
            const token = window.gapi.client.getToken();
            if (token && token.access_token) {
                LocalStorageService.setAccessToken(token.access_token);
                this.isAuthenticated = true;
                
                if (this.onAuthStateChange) {
                    this.onAuthStateChange('authenticated');
                }
            }
        } catch (error) {
            ErrorHandler.handleAuthError(error);
            throw error;
        }
    }

    /**
     * Authenticate the user
     * @param {boolean} forceConsent - Whether to force consent screen
     * @returns {Promise<void>}
     */
    async authenticate(forceConsent = false) {
        try {
            // Check for existing valid token
            const existingToken = LocalStorageService.getAccessToken();
            if (existingToken && !forceConsent) {
                window.gapi.client.setToken({ access_token: existingToken });
                
                const token = window.gapi.client.getToken();
                if (token && !token.expired) {
                    this.isAuthenticated = true;
                    if (this.onAuthStateChange) {
                        this.onAuthStateChange('authenticated');
                    }
                    return;
                }
            }

            // Request new token
            if (!this.tokenClient) {
                throw new Error('Token client not initialized');
            }

            const prompt = forceConsent ? 'consent' : '';
            this.tokenClient.requestAccessToken({ prompt });

        } catch (error) {
            ErrorHandler.handleAuthError(error);
            this.signOut();
            throw error;
        }
    }

    /**
     * Sign out the user
     */
    signOut() {
        try {
            LocalStorageService.removeAccessToken();
            
            if (window.gapi && window.gapi.client) {
                window.gapi.client.setToken(null);
            }

            this.isAuthenticated = false;
            
            if (this.onAuthStateChange) {
                this.onAuthStateChange('signed_out');
            }
        } catch (error) {
            console.warn('Error during sign out:', error);
        }
    }

    /**
     * Check if user is currently authenticated
     * @returns {boolean}
     */
    isUserAuthenticated() {
        if (!window.gapi || !window.gapi.client) {
            return false;
        }

        const token = window.gapi.client.getToken();
        return token && !token.expired && this.isAuthenticated;
    }

    /**
     * Get current access token
     * @returns {string|null}
     */
    getAccessToken() {
        if (!this.isUserAuthenticated()) {
            return null;
        }

        const token = window.gapi.client.getToken();
        return token ? token.access_token : null;
    }

    /**
     * Refresh the access token if needed
     * @returns {Promise<void>}
     */
    async refreshTokenIfNeeded() {
        if (!this.isUserAuthenticated()) {
            await this.authenticate();
        }
    }

    /**
     * Execute an authenticated API call with automatic token refresh
     * @param {Function} apiCall - The API call function
     * @param {number} maxRetries - Maximum number of retry attempts
     * @returns {Promise<*>} The API call result
     */
    async executeAuthenticatedCall(apiCall, maxRetries = 1) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                await this.refreshTokenIfNeeded();
                return await apiCall();
            } catch (error) {
                // If it's an auth error and we haven't exhausted retries, try to re-authenticate
                if (attempt < maxRetries && this.isAuthenticationError(error)) {
                    console.warn('Authentication error, attempting to refresh token:', error);
                    this.signOut();
                    continue;
                }
                throw error;
            }
        }
    }

    /**
     * Check if an error is authentication-related
     * @param {Error|Object} error - The error to check
     * @returns {boolean}
     */
    isAuthenticationError(error) {
        if (!error) return false;

        const errorMessage = ErrorHandler.extractErrorMessage(error).toLowerCase();
        return errorMessage.includes('unauthorized') || 
               errorMessage.includes('invalid_token') ||
               errorMessage.includes('token_expired') ||
               errorMessage.includes('invalid_grant');
    }

    /**
     * Get authentication status for UI updates
     * @returns {Object} Authentication status object
     */
    getAuthStatus() {
        return {
            initialized: this.gapiInited && this.gisInited,
            authenticated: this.isUserAuthenticated(),
            token: this.getAccessToken()
        };
    }
}