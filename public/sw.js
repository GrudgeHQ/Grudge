const CACHE_NAME = 'grudge-app-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/dashboard',
  '/matches',
  '/practices',
  '/chat',
  '/notifications',
  '/teams',
  '/leagues',
  '/profile',
  '/manifest.json',
  // Use existing SVG icons present in public/icons
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
];

const API_CACHE_URLS = [
  '/api/teams',
  '/api/matches',
  '/api/practices',
  '/api/notifications',
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for GET requests
          if (request.method === 'GET') {
            return caches.match(request);
          }
          // Return offline response for other methods
          return new Response(
            JSON.stringify({ error: 'Offline - please try again when connected' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Handle static resources with cache-first strategy
  if (STATIC_CACHE_URLS.includes(url.pathname) || 
      url.pathname.startsWith('/icons/') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.js')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
    );
    return;
  }

  // Handle navigation requests with network-first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return caches.match('/') || 
                 caches.match('/dashboard') ||
                 new Response('Offline - please check your connection', {
                   status: 503,
                   headers: { 'Content-Type': 'text/html' }
                 });
        })
    );
    return;
  }

  // Default: network-first strategy
  event.respondWith(
    fetch(request)
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Background sync for chat messages and other data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync for pending messages, notifications, etc.
      doBackgroundSync()
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      // Prefer existing assets: svg icon and available png badge
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-144x144.png',
      tag: data.tag || 'grudge-app',
      data: data.data,
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/icon-144x144.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Grudge App', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

// Helper function for background sync
async function doBackgroundSync() {
  try {
    // Sync pending chat messages
    const pendingMessages = await getPendingMessages();
    for (const message of pendingMessages) {
      await sendMessage(message);
      await removePendingMessage(message.id);
    }

    // Sync other pending data
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Placeholder functions for background sync
async function getPendingMessages() {
  // Implementation would get messages from IndexedDB
  return [];
}

async function sendMessage(message) {
  // Implementation would send message to API
  return fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify(message)
  });
}

async function removePendingMessage(messageId) {
  // Implementation would remove from IndexedDB
  console.log('Removed pending message:', messageId);
}