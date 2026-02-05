// notificationHelper.js - Notification positioning and styling utilities

import { POSITIONS, NOTIFICATION_BASE_STYLE } from './constants.js';

/**
 * Calculate notification position styles
 * @param {string} position - Position option (center, top-left, etc.)
 * @returns {Object} CSS position styles
 */
export function getPositionStyles(position) {
    const styles = {};

    switch (position) {
        case POSITIONS.CENTER:
            styles.top = '50%';
            styles.left = '50%';
            styles.transform = 'translate(-50%, -50%)';
            break;

        case POSITIONS.TOP_LEFT:
            styles.top = '20px';
            styles.left = '20px';
            styles.transform = 'none';
            break;

        case POSITIONS.TOP_RIGHT:
            styles.top = '20px';
            styles.right = '20px';
            styles.left = 'auto';
            styles.transform = 'none';
            break;

        case POSITIONS.BOTTOM_LEFT:
            styles.bottom = '20px';
            styles.left = '20px';
            styles.top = 'auto';
            styles.transform = 'none';
            break;

        case POSITIONS.BOTTOM_RIGHT:
            styles.bottom = '20px';
            styles.right = '20px';
            styles.left = 'auto';
            styles.top = 'auto';
            styles.transform = 'none';
            break;

        default:
            // Default to center
            styles.top = '50%';
            styles.left = '50%';
            styles.transform = 'translate(-50%, -50%)';
    }

    return styles;
}

/**
 * Apply styles to notification element
 * @param {HTMLElement} element - Notification DOM element
 * @param {Object} settings - Settings object with opacity, position, etc.
 */
export function applyNotificationStyles(element, settings) {
    // Apply base styles
    Object.assign(element.style, NOTIFICATION_BASE_STYLE);

    // Apply position-specific styles
    const positionStyles = getPositionStyles(settings.notificationPosition);
    Object.assign(element.style, positionStyles);

    // Apply opacity
    element.style.opacity = '0';

    // Store target opacity for fade-in
    element.dataset.targetOpacity = settings.notificationOpacity || 0.9;
}

/**
 * Create notification element with styles
 * @param {string} message - Message to display
 * @param {Object} settings - Settings object
 * @returns {HTMLElement} Notification element
 */
export function createNotificationElement(message, settings) {
    const notification = document.createElement('div');
    notification.id = 'ai-choice-helper-notification';
    notification.textContent = message;

    applyNotificationStyles(notification, settings);

    return notification;
}

/**
 * Show notification with fade in/out animation
 * @param {HTMLElement} notification - Notification element
 * @param {number} displayDuration - Duration in seconds
 */
export function animateNotification(notification, displayDuration) {
    const targetOpacity = notification.dataset.targetOpacity || 0.9;
    const durationMs = (displayDuration || 3) * 1000;

    // Fade in
    setTimeout(() => {
        notification.style.opacity = targetOpacity;

        // Fade out and remove
        setTimeout(() => {
            notification.style.opacity = '0';

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300); // Wait for fade out transition
        }, durationMs);
    }, 10);
}

/**
 * Remove existing notification if present
 */
export function removeExistingNotification() {
    const existing = document.getElementById('ai-choice-helper-notification');
    if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
    }
}
