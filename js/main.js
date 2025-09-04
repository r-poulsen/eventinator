import { EventinatorApp } from './app/EventinatorApp.js';

/**
 * Main entry point for the refactored Eventinator application
 */

// Global app instance
let app = null;

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('DOM loaded, initializing Eventinator...');
        
        // Get CLIENT_ID from clientid.js (loaded via script tag)
        if (typeof CLIENT_ID === 'undefined') {
            throw new Error('CLIENT_ID not found. Make sure clientid.js is loaded.');
        }

        // Create and initialize the application
        app = new EventinatorApp(CLIENT_ID);
        await app.initialize();

        // Make app globally available for debugging
        window.eventinatorApp = app;
        
        console.log('Eventinator initialized successfully');
        
        // Add visual confirmation
        const initDiv = document.createElement('div');
        initDiv.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #4CAF50;
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 1000;
            font-family: Arial, sans-serif;
            font-size: 12px;
        `;
        initDiv.textContent = 'Eventinator Loaded ✓';
        document.body.appendChild(initDiv);
        
        // Remove after 3 seconds
        setTimeout(() => initDiv.remove(), 3000);

    } catch (error) {
        console.error('Failed to initialize Eventinator:', error);
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 9999;
            font-family: Arial, sans-serif;
        `;
        errorDiv.innerHTML = `
            <strong>Failed to initialize Eventinator</strong><br>
            ${error.message}<br>
            <small>Check the console for more details.</small>
        `;
        document.body.appendChild(errorDiv);
    }
});

/**
 * Handle page unload cleanup
 */
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
});

/**
 * Global functions for backward compatibility
 * These maintain the original function signatures from the legacy code
 */

// Copy contents function (used in HTML)
window.copyContents = function(element) {
    let range = document.createRange();
    range.selectNode(element);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
};

// Filter names function (used in HTML/dynamically created elements)
window.filterNames = function() {
    if (app && app.filterByParticipants) {
        app.filterByParticipants();
    }
};

// Export for module compatibility
export { app };