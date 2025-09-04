import { LocalStorageService } from './LocalStorageService.js';

/**
 * Manages autocomplete functionality and data storage
 */
export class AutocompleteManager {
    /**
     * Add a value to autocomplete suggestions for a given input
     * @param {string} inputId - The input field ID
     * @param {string} value - The value to add
     * @param {string} storageKey - Optional custom storage key
     */
    static addSuggestion(inputId, value, storageKey = null) {
        if (!value || value.trim() === '') return;

        const key = storageKey || `${inputId}_autocomplete`;
        const existing = LocalStorageService.getJSON(key, []);
        
        // Use Set to avoid duplicates
        const suggestions = new Set(existing);
        suggestions.add(value.trim());
        
        LocalStorageService.setJSON(key, Array.from(suggestions));
    }

    /**
     * Get autocomplete suggestions for an input
     * @param {string} inputId - The input field ID
     * @param {string} storageKey - Optional custom storage key
     * @returns {Array<string>} Array of suggestions
     */
    static getSuggestions(inputId, storageKey = null) {
        const key = storageKey || `${inputId}_autocomplete`;
        return LocalStorageService.getJSON(key, []);
    }

    /**
     * Clear autocomplete suggestions for an input
     * @param {string} inputId - The input field ID
     * @param {string} storageKey - Optional custom storage key
     */
    static clearSuggestions(inputId, storageKey = null) {
        const key = storageKey || `${inputId}_autocomplete`;
        LocalStorageService.remove(key);
    }

    /**
     * Initialize autocomplete functionality for an input element
     * @param {string} inputId - The input field ID
     * @param {string} storageKey - Optional custom storage key
     */
    static initialize(inputId, storageKey = null) {
        const inputElement = document.getElementById(inputId);
        if (!inputElement) {
            console.warn(`Input element with ID '${inputId}' not found`);
            return;
        }

        const key = storageKey || `${inputId}_autocomplete`;
        let currentFocus = -1;

        // Input event listener
        inputElement.addEventListener('input', function(event) {
            const value = this.value;
            AutocompleteManager.closeAllLists();
            
            if (!value) return;

            currentFocus = -1;
            const suggestions = AutocompleteManager.getSuggestions(inputId, storageKey);
            const matches = suggestions.filter(suggestion => 
                suggestion.toLowerCase().startsWith(value.toLowerCase())
            );

            if (matches.length === 0) return;

            // Create autocomplete container
            const container = document.createElement('div');
            container.setAttribute('id', `${inputId}-autocomplete-list`);
            container.setAttribute('class', 'autocomplete-items');
            inputElement.parentNode.appendChild(container);

            // Create suggestion items
            matches.forEach(match => {
                const item = document.createElement('div');
                item.innerHTML = 
                    `<strong>${match.substr(0, value.length)}</strong>` +
                    match.substr(value.length) +
                    `<input type='hidden' value='${match}'>`;
                
                item.addEventListener('click', function() {
                    inputElement.value = this.querySelector('input').value;
                    AutocompleteManager.closeAllLists();
                    
                    // Trigger input event to notify other listeners
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                });

                container.appendChild(item);
            });
        });

        // Keyboard navigation
        inputElement.addEventListener('keydown', function(event) {
            const container = document.getElementById(`${inputId}-autocomplete-list`);
            if (!container) return;
            
            const items = container.getElementsByTagName('div');
            
            if (event.keyCode === 40) { // Down arrow
                currentFocus++;
                AutocompleteManager.setActiveItem(items, currentFocus);
                event.preventDefault();
            } else if (event.keyCode === 38) { // Up arrow
                currentFocus--;
                AutocompleteManager.setActiveItem(items, currentFocus);
                event.preventDefault();
            } else if (event.keyCode === 13) { // Enter
                event.preventDefault();
                if (currentFocus > -1 && items[currentFocus]) {
                    items[currentFocus].click();
                }
            } else if (event.keyCode === 27) { // Escape
                AutocompleteManager.closeAllLists();
            }
        });

        // Close autocomplete when clicking outside
        document.addEventListener('click', function(event) {
            if (event.target !== inputElement) {
                AutocompleteManager.closeAllLists();
            }
        });
    }

    /**
     * Set the active item in autocomplete list
     * @param {HTMLCollection} items - The autocomplete items
     * @param {number} currentFocus - The current focus index
     */
    static setActiveItem(items, currentFocus) {
        if (!items) return;

        // Remove active class from all items
        Array.from(items).forEach(item => {
            item.classList.remove('autocomplete-active');
        });

        // Handle focus wrapping
        if (currentFocus >= items.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = items.length - 1;

        // Add active class to current item
        if (items[currentFocus]) {
            items[currentFocus].classList.add('autocomplete-active');
        }
    }

    /**
     * Close all autocomplete lists
     * @param {HTMLElement} except - Element to exclude from closing
     */
    static closeAllLists(except = null) {
        const autocompleteItems = document.getElementsByClassName('autocomplete-items');
        Array.from(autocompleteItems).forEach(item => {
            if (item !== except) {
                item.parentNode.removeChild(item);
            }
        });
    }

    /**
     * Bulk add suggestions from an array
     * @param {string} inputId - The input field ID
     * @param {Array<string>} values - Array of values to add
     * @param {string} storageKey - Optional custom storage key
     */
    static addBulkSuggestions(inputId, values, storageKey = null) {
        const validValues = values.filter(value => value && value.trim() !== '');
        if (validValues.length === 0) return;

        const key = storageKey || `${inputId}_autocomplete`;
        const existing = LocalStorageService.getJSON(key, []);
        const suggestions = new Set([...existing, ...validValues.map(v => v.trim())]);
        
        LocalStorageService.setJSON(key, Array.from(suggestions));
    }

    /**
     * Initialize autocomplete for participant inputs with shared suggestions
     * @param {string} containerId - The container ID for participant inputs
     */
    static initializeParticipantInputs(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Use MutationObserver to handle dynamically added inputs
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.tagName === 'INPUT') {
                        this.initialize(node.id, 'participants_autocomplete');
                        
                        // Add input listener to save value to localStorage
                        node.addEventListener('input', () => {
                            LocalStorageService.set(`${node.id}_autocomplete`, node.value);
                        });
                    }
                });
            });
        });

        observer.observe(container, { childList: true, subtree: true });
    }

    /**
     * Restore participant input values from localStorage
     * @param {string} containerId - The container ID for participant inputs
     */
    static restoreParticipantValues(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => {
            const savedValue = LocalStorageService.get(`${input.id}_autocomplete`);
            if (savedValue) {
                input.value = savedValue;
            }
        });
    }
}