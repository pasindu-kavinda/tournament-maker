/**
 * Simple notification utilities for sending push notifications to tournament members
 * No database storage - just direct push notifications to phones
 */

/**
 * Request push notification permission
 */
export const requestPushPermission = async () => {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
    }

    if (!('serviceWorker' in navigator)) {
        console.log('This browser does not support service workers');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            console.log('Notification permission granted');

            // Register service worker for better notification support
            await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');

            return true;
        } else {
            console.log('Notification permission denied');
            return false;
        }
    } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
    }
};

/**
 * Show browser push notification
 */
export const showPushNotification = (title: string, body: string, tournamentId?: string) => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return;
    }

    // Auto-request permission on first notification
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showPushNotification(title, body, tournamentId);
            }
        });
        return;
    }

    if (Notification.permission === 'granted') {
        // Try to use Service Worker notification if available
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body,
                    icon: '/trophy.gif',
                    badge: '/trophy.gif',
                    tag: tournamentId || 'tournament-notification',
                    requireInteraction: false,
                    data: { tournamentId }
                });
            });
        } else {
            // Fallback to regular browser notification
            new Notification(title, {
                body,
                icon: '/trophy.gif',
                badge: '/trophy.gif',
                data: { tournamentId }
            });
        }
    }
};
