import { AutocompleteManager } from '../storage/AutocompleteManager.js';
import { LocalStorageService } from '../storage/LocalStorageService.js';

/**
 * Enhanced dynamic list input component for participants
 */
export class ListInput {
    constructor(baseName, placeholder, placeholderPlural = null) {
        this.baseName = baseName;
        this.placeholder = placeholder;
        this.placeholderPlural = placeholderPlural || placeholder;
        this.containerElement = document.getElementById(this.baseName);
        this.observers = [];
        this.inputChangeListeners = new Map();

        if (!this.containerElement) {
            throw new Error(`Container element with ID '${this.baseName}' not found`);
        }

        this.initialize();
    }

    /**
     * Initialize the list input component
     */
    initialize() {
        this.createLabel();
        this.createCountInput();
        this.createListContainer();
        this.adjustInputFields();
        this.setupEventListeners();
    }

    /**
     * Create the label element
     */
    createLabel() {
        const label = document.createElement('label');
        label.htmlFor = this.baseName + '_input';
        label.textContent = this.placeholderPlural;
        this.containerElement.appendChild(label);
    }

    /**
     * Create the count input element
     */
    createCountInput() {
        this.numInput = document.createElement('input');
        this.numInput.type = 'number';
        this.numInput.id = this.baseName + '_input';
        this.numInput.min = '1';
        this.numInput.value = '1';
        this.numInput.setAttribute('aria-label', `Number of ${this.placeholderPlural}`);
        this.containerElement.appendChild(this.numInput);
    }

    /**
     * Create the container for individual list items
     */
    createListContainer() {
        this.listContainer = document.createElement('div');
        this.listContainer.id = this.baseName + '_list_container';
        this.listContainer.setAttribute('role', 'list');
        this.containerElement.appendChild(this.listContainer);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.numInput.addEventListener('input', () => {
            this.adjustInputFields();
            this.notifyChange();
        });

        this.numInput.addEventListener('change', () => {
            this.validateCount();
            this.notifyChange();
        });
    }

    /**
     * Validate the count input
     */
    validateCount() {
        const value = parseInt(this.numInput.value);
        if (isNaN(value) || value < 1) {
            this.numInput.value = '1';
        } else if (value > 50) { // Reasonable upper limit
            this.numInput.value = '50';
        }
    }

    /**
     * Adjust the number of input fields based on count
     */
    adjustInputFields() {
        const inputCount = parseInt(this.numInput.value) || 1;
        
        // Remove extra input fields
        while (this.listContainer.children.length > inputCount) {
            const lastChild = this.listContainer.lastChild;
            this.removeInputListeners(lastChild);
            this.listContainer.removeChild(lastChild);
        }

        // Add new input fields
        for (let i = this.listContainer.children.length; i < inputCount; i++) {
            this.createInputField(i + 1);
        }
    }

    /**
     * Create an individual input field
     * @param {number} index - The index of the input field (1-based)
     */
    createInputField(index) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `${this.placeholder} ${index}`;
        input.id = `${this.baseName}_${index}`;
        input.setAttribute('role', 'listitem');
        input.setAttribute('aria-label', `${this.placeholder} ${index}`);

        // Restore value from localStorage
        const savedValue = LocalStorageService.get(`${input.id}_autocomplete`);
        if (savedValue) {
            input.value = savedValue;
        }

        // Setup autocomplete
        this.listContainer.appendChild(input);
        AutocompleteManager.initialize(input.id, 'participants_autocomplete');

        // Add input change listener
        const changeListener = () => {
            LocalStorageService.set(`${input.id}_autocomplete`, input.value);
            this.notifyChange();
        };

        input.addEventListener('input', changeListener);
        input.addEventListener('blur', this.validateInput.bind(this, input));
        
        // Store listener reference for cleanup
        this.inputChangeListeners.set(input.id, changeListener);
    }

    /**
     * Validate an individual input field
     * @param {HTMLInputElement} input - The input to validate
     */
    validateInput(input) {
        const value = input.value.trim();
        if (value !== input.value) {
            input.value = value;
            LocalStorageService.set(`${input.id}_autocomplete`, value);
            this.notifyChange();
        }
    }

    /**
     * Remove event listeners from an input field
     * @param {HTMLInputElement} input - The input field
     */
    removeInputListeners(input) {
        if (!input || !input.id) return;

        const listener = this.inputChangeListeners.get(input.id);
        if (listener) {
            input.removeEventListener('input', listener);
            this.inputChangeListeners.delete(input.id);
        }
    }

    /**
     * Get the count value
     * @returns {number} The number of participants
     */
    getCount() {
        return parseInt(this.numInput.value) || 1;
    }

    /**
     * Get all input values as an array
     * @param {boolean} includePlaceholders - Whether to include placeholder text for empty inputs
     * @returns {Array<string>} Array of participant names
     */
    getValues(includePlaceholders = false) {
        const inputs = this.listContainer.querySelectorAll('input');
        const values = [];

        inputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                values.push(value);
            } else if (includePlaceholders) {
                values.push(input.placeholder);
            }
        });

        return values;
    }

    /**
     * Get values formatted as a human-readable Danish string
     * @param {boolean} includePlaceholders - Whether to include placeholder text for empty inputs
     * @returns {string} Formatted string of participants
     */
    getFormattedString(includePlaceholders = false) {
        const values = this.getValues(includePlaceholders);
        
        if (values.length === 0) return '';
        if (values.length === 1) return values[0];
        if (values.length === 2) return `${values[0]} og ${values[1]}`;
        
        const lastValue = values[values.length - 1];
        const otherValues = values.slice(0, -1);
        return `${otherValues.join(', ')} og ${lastValue}`;
    }

    /**
     * Set specific values for the inputs
     * @param {Array<string>} values - Array of values to set
     */
    setValues(values) {
        if (!Array.isArray(values)) return;

        // Adjust count first
        this.numInput.value = Math.max(1, values.length).toString();
        this.adjustInputFields();

        // Set individual values
        const inputs = this.listContainer.querySelectorAll('input');
        inputs.forEach((input, index) => {
            if (index < values.length) {
                input.value = values[index] || '';
                LocalStorageService.set(`${input.id}_autocomplete`, input.value);
            }
        });

        this.notifyChange();
    }

    /**
     * Clear all input values
     */
    clearValues() {
        const inputs = this.listContainer.querySelectorAll('input');
        inputs.forEach(input => {
            input.value = '';
            LocalStorageService.remove(`${input.id}_autocomplete`);
        });
        this.notifyChange();
    }

    /**
     * Add observer for changes
     * @param {Function} callback - Callback function to call on changes
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
     * Notify all observers of changes
     */
    notifyChange() {
        const data = {
            count: this.getCount(),
            values: this.getValues(),
            formattedString: this.getFormattedString()
        };

        this.observers.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.warn('Error in ListInput observer:', error);
            }
        });
    }

    /**
     * Get validation status
     * @returns {Object} Validation result
     */
    validate() {
        const values = this.getValues();
        const hasValues = values.length > 0 && values.some(v => v.trim() !== '');
        
        return {
            isValid: hasValues,
            isEmpty: !hasValues,
            count: values.length,
            values: values
        };
    }

    /**
     * Focus on the first empty input or the first input
     */
    focus() {
        const inputs = this.listContainer.querySelectorAll('input');
        const emptyInput = Array.from(inputs).find(input => !input.value.trim());
        const targetInput = emptyInput || inputs[0];
        
        if (targetInput) {
            targetInput.focus();
        }
    }

    /**
     * Disable/enable the component
     * @param {boolean} disabled - Whether to disable the component
     */
    setDisabled(disabled) {
        this.numInput.disabled = disabled;
        const inputs = this.listContainer.querySelectorAll('input');
        inputs.forEach(input => {
            input.disabled = disabled;
        });
    }

    /**
     * Show/hide the component
     * @param {boolean} visible - Whether the component should be visible
     */
    setVisible(visible) {
        if (visible) {
            this.containerElement.classList.remove('smooth-hide');
            this.containerElement.classList.add('smooth-show');
        } else {
            this.containerElement.classList.add('smooth-hide');
            this.containerElement.classList.remove('smooth-show');
        }
    }

    /**
     * Destroy the component and clean up resources
     */
    destroy() {
        // Remove all event listeners
        const inputs = this.listContainer.querySelectorAll('input');
        inputs.forEach(input => this.removeInputListeners(input));
        
        // Clear observers
        this.observers = [];
        this.inputChangeListeners.clear();
        
        // Remove DOM elements
        if (this.containerElement.parentNode) {
            this.containerElement.parentNode.removeChild(this.containerElement);
        }
    }
}