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
            if (typeof gapi !== 'undefined' && this.gapiInited) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = GOOGLE_API_CONFIG.API_URLS.GAPI;
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                gapi.load('client', async () => {
                    try {
                        await gapi.client.init({
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
            if (typeof google !== 'undefined' && this.gisInited) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = GOOGLE_API_CONFIG.API_URLS.GIS;
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                try {
                    this.tokenClient = google.accounts.oauth2.initTokenClient({
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
        console.log('Google APIs initialized');
        
        if (this.onAuthStateChange) {
            this.onAuthStateChange('initialized');
        }

        // Check for existing token first
        const existingToken = LocalStorageService.getAccessToken();
        console.log('=== AUTHENTICATION DEBUG ===');
        console.log('Existing token found:', !!existingToken);
        console.log('Raw automatic_authorize value:', localStorage.getItem('automatic_authorize'));
        console.log('LocalStorageService.getAutomaticAuthorize():', LocalStorageService.getAutomaticAuthorize());
        console.log('Main branch logic (truthy check):', !!localStorage.getItem('automatic_authorize'));
        
        if (existingToken) {
            // Set the existing token - don't validate here, let API calls handle validation
            console.log('=== FOUND EXISTING TOKEN ===');
            console.log('Token length:', existingToken.length);
            console.log('Auto authorize setting:', LocalStorageService.getAutomaticAuthorize());
            gapi.client.setToken({ access_token: existingToken });
            this.isAuthenticated = true;
            
            if (this.onAuthStateChange) {
                console.log('Calling onAuthStateChange with "authenticated"');
                this.onAuthStateChange('authenticated');
            }
        } else {
            console.log('=== NO EXISTING TOKEN ===');
            console.log('Auto authorize setting (refactor):', LocalStorageService.getAutomaticAuthorize());
            console.log('Auto authorize setting (main branch logic):', !!localStorage.getItem('automatic_authorize'));
            
            // Temporarily use main branch logic for testing
            if (localStorage.getItem('automatic_authorize')) {
                console.log('Auto-authenticate enabled (main branch logic), calling authenticate()');
                this.authenticate();
            } else {
                console.log('Auto-authenticate disabled, not calling authenticate()');
            }
        }
    }

    /**
     * Handle authentication callback from Google
     * @param {Object} response - Authentication response
     */
    async handleAuthCallback(response) {
        try {
            console.log('Auth callback received:', response);
            
            if (response.error) {
                console.error('Auth callback error:', response.error);
                throw new Error(response.error);
            }

            // Store the access token
            const token = gapi.client.getToken();
            console.log('Token from gapi:', token);
            
            if (token && token.access_token) {
                console.log('Storing access token and setting authenticated state');
                LocalStorageService.setAccessToken(token.access_token);
                this.isAuthenticated = true;
                
                if (this.onAuthStateChange) {
                    console.log('Calling auth state change: authenticated');
                    this.onAuthStateChange('authenticated');
                }
            } else {
                console.error('No valid token received');
            }
        } catch (error) {
            console.error('Error in auth callback:', error);
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
            console.log('=== AUTHENTICATE() CALLED ===');
            console.log('forceConsent:', forceConsent);
            console.log('Stack trace:', new Error().stack);
            
            // Check for existing valid token
            const existingToken = LocalStorageService.getAccessToken();
            console.log('Checking existing token in authenticate():', !!existingToken);
            
            if (existingToken && !forceConsent) {
                gapi.client.setToken({ access_token: existingToken });
                
                const token = gapi.client.getToken();
                console.log('Token set, checking validity:', token ? !token.expired : false);
                
                if (token && !token.expired) {
                    console.log('Token is valid, setting authenticated state');
                    this.isAuthenticated = true;
                    if (this.onAuthStateChange) {
                        this.onAuthStateChange('authenticated');
                    }
                    return;
                } else {
                    console.log('Token expired or invalid, removing');
                    LocalStorageService.removeAccessToken();
                }
            }

            // Request new token
            console.log('Requesting new token');
            if (!this.tokenClient) {
                throw new Error('Token client not initialized');
            }

            const prompt = forceConsent ? 'consent' : '';
            console.log('Requesting access token with prompt:', prompt);
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
            
            if (typeof gapi !== 'undefined' && gapi.client) {
                gapi.client.setToken(null);
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
        if (typeof gapi === 'undefined' || !gapi.client) {
            return false;
        }

        const token = gapi.client.getToken();
        // Don't check token.expired here - let API calls handle expiry
        return token && this.isAuthenticated;
    }

    /**
     * Get current access token
     * @returns {string|null}
     */
    getAccessToken() {
        if (!this.isUserAuthenticated()) {
            return null;
        }

        const token = gapi.client.getToken();
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