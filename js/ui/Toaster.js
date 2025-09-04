import { UI_TEXT } from '../config/constants.js';

/**
 * Enhanced toast notification utility class
 */
export class Toaster {
    static defaultConfig = {
        timeout: 30000,
        positionClass: "bottomRight",
    };

    /**
     * Show a success toast
     * @param {string} title - Toast title
     * @param {string} text - Toast message (can include HTML)
     * @param {Object} options - Additional options
     */
    static success(title, text, options = {}) {
        const config = {
            ...this.defaultConfig,
            ...options,
            title,
            text,
            icon: "icons/ok.png",
            type: "success"
        };

        if (typeof VanillaToasts !== 'undefined') {
            VanillaToasts.create(config);
        } else {
            console.error('VanillaToasts not available:', config.title, config.text);
        }
    }

    /**
     * Show an error toast
     * @param {Error|Object|string} error - Error to display
     * @param {string} errorCode - Optional error code for debugging
     * @param {Object} options - Additional options
     */
    static error(error, errorCode = null, options = {}) {
        let errorMessage;

        // Extract readable error message
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (
            typeof error === 'object' &&
            'result' in error &&
            error.result &&
            error.result.error &&
            error.result.error.errors &&
            error.result.error.errors[0] &&
            error.result.error.errors[0].message
        ) {
            errorMessage = error.result.error.errors[0].message;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        } else if (typeof error === 'object' && error.message) {
            errorMessage = error.message;
        } else {
            errorMessage = 'An unknown error occurred';
        }

        // Log error with code if provided
        if (errorCode) {
            console.error(`${errorCode}: ${errorMessage}`);
        }

        const config = {
            ...this.defaultConfig,
            ...options,
            title: UI_TEXT.DA.ERROR_OCCURRED,
            text: errorMessage,
            icon: "icons/error.png",
            type: "error"
        };

        if (typeof VanillaToasts !== 'undefined') {
            VanillaToasts.create(config);
        } else {
            console.error('VanillaToasts not available:', config.title, config.text);
        }
    }

    /**
     * Show a warning toast
     * @param {string} title - Toast title
     * @param {string} text - Toast message
     * @param {Object} options - Additional options
     */
    static warning(title, text, options = {}) {
        const config = {
            ...this.defaultConfig,
            ...options,
            title,
            text,
            icon: "icons/warning.png",
            type: "warning"
        };

        if (typeof VanillaToasts !== 'undefined') {
            VanillaToasts.create(config);
        } else {
            console.error('VanillaToasts not available:', config.title, config.text);
        }
    }

    /**
     * Show an info toast
     * @param {string} title - Toast title
     * @param {string} text - Toast message
     * @param {Object} options - Additional options
     */
    static info(title, text, options = {}) {
        const config = {
            ...this.defaultConfig,
            ...options,
            title,
            text,
            icon: "icons/info.png",
            type: "info"
        };

        if (typeof VanillaToasts !== 'undefined') {
            VanillaToasts.create(config);
        } else {
            console.error('VanillaToasts not available:', config.title, config.text);
        }
    }

    /**
     * Create a clickable event link element
     * @param {Object} event - Calendar event object
     * @returns {string} HTML string for the link
     */
    static createEventLink(event) {
        if (!event || !event.htmlLink || !event.summary) {
            return '';
        }

        const link = document.createElement('a');
        link.href = event.htmlLink;
        link.target = '_blank';
        link.innerHTML = event.summary;
        link.style.color = 'inherit';
        link.style.textDecoration = 'underline';
        
        return link.outerHTML;
    }

    /**
     * Show reminder added success toast
     * @param {Object} event - Created reminder event
     */
    static reminderAdded(event) {
        this.success(
            UI_TEXT.DA.REMINDER_ADDED, 
            this.createEventLink(event)
        );
    }

    /**
     * Show event added success toast
     * @param {Object} event - Created calendar event
     */
    static eventAdded(event) {
        this.success(
            UI_TEXT.DA.EVENT_ADDED, 
            this.createEventLink(event)
        );
    }

    /**
     * Show both reminder and event added success toast
     * @param {Object} reminder - Created reminder event
     * @param {Object} event - Created calendar event
     */
    static reminderAndEventAdded(reminder, event) {
        const reminderLink = this.createEventLink(reminder);
        const eventLink = this.createEventLink(event);
        
        this.success(
            UI_TEXT.DA.CREATE_REMINDER_AND_EVENT,
            `${reminderLink}<br><br>${eventLink}`
        );
    }

    /**
     * Show authentication required toast
     */
    static authRequired() {
        this.warning(
            'Authentication Required',
            'Please sign in to use this feature.'
        );
    }

    /**
     * Show network error toast
     */
    static networkError() {
        this.error(
            'Network Error',
            'Please check your internet connection and try again.'
        );
    }

    /**
     * Show validation error toast
     * @param {Array<string>} missingFields - Array of missing field names
     */
    static validationError(missingFields) {
        const fieldList = missingFields.join(', ');
        this.error(
            'Validation Error',
            `Please fill in the following required fields: ${fieldList}`
        );
    }

    /**
     * Show loading toast (auto-dismissing)
     * @param {string} message - Loading message
     * @returns {Function} Function to dismiss the loading toast
     */
    static loading(message = 'Loading...') {
        const config = {
            title: message,
            text: '',
            icon: "icons/loading.gif",
            type: "info",
            timeout: false, // Don't auto-dismiss
            positionClass: "bottomRight"
        };

        const toast = VanillaToasts.create(config);
        
        // Return function to dismiss the toast
        return () => {
            if (toast && toast.remove) {
                toast.remove();
            }
        };
    }

    /**
     * Show a custom toast with full control
     * @param {Object} config - Full VanillaToasts configuration
     */
    static custom(config) {
        const mergedConfig = {
            ...this.defaultConfig,
            ...config
        };

        VanillaToasts.create(mergedConfig);
    }

    /**
     * Clear all existing toasts
     */
    static clearAll() {
        if (VanillaToasts && VanillaToasts.clearAll) {
            VanillaToasts.clearAll();
        } else {
            // Fallback: remove all toast elements from DOM
            const toasts = document.querySelectorAll('.vt-toast');
            toasts.forEach(toast => toast.remove());
        }
    }

    /**
     * Show progress toast with percentage
     * @param {string} title - Progress title
     * @param {number} percentage - Progress percentage (0-100)
     * @param {string} details - Optional progress details
     * @returns {Function} Function to update progress
     */
    static progress(title, percentage = 0, details = '') {
        const progressBar = `
            <div style="background: #ddd; height: 10px; border-radius: 5px; margin-top: 5px;">
                <div style="background: #4CAF50; height: 100%; width: ${percentage}%; border-radius: 5px; transition: width 0.3s;"></div>
            </div>
        `;

        const text = details ? `${details}<br>${progressBar}` : progressBar;

        const config = {
            title: `${title} (${percentage}%)`,
            text: text,
            type: "info",
            timeout: false,
            positionClass: "bottomRight"
        };

        const toast = VanillaToasts.create(config);

        // Return function to update progress
        return (newPercentage, newDetails = '') => {
            if (toast && toast.update) {
                const updatedProgressBar = `
                    <div style="background: #ddd; height: 10px; border-radius: 5px; margin-top: 5px;">
                        <div style="background: #4CAF50; height: 100%; width: ${newPercentage}%; border-radius: 5px; transition: width 0.3s;"></div>
                    </div>
                `;
                
                const updatedText = newDetails ? `${newDetails}<br>${updatedProgressBar}` : updatedProgressBar;
                
                toast.update({
                    title: `${title} (${newPercentage}%)`,
                    text: updatedText
                });
                
                // Auto-dismiss when complete
                if (newPercentage >= 100) {
                    setTimeout(() => {
                        if (toast.remove) toast.remove();
                    }, 2000);
                }
            }
        };
    }
}