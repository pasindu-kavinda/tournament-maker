// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  return self.clients.claim();
});

self.addEventListener('push', (event) => {
  console.log('Push notification received', event);
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Tournament Update';
  const options = {
    body: data.body || 'New update in your tournament',
    icon: '/trophy.gif',
    badge: '/trophy.gif',
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'View Tournament'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked', event);
  event.notification.close();

  if (event.action === 'view') {
    const tournamentId = event.notification.data.tournamentId;
    const url = tournamentId 
      ? `/tournament/${tournamentId}` 
      : '/';
    
    event.waitUntil(
      clients.openWindow(url)
    );
  }
});
