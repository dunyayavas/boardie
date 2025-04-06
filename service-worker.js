/**
 * Service Worker for Boardie application
 * Handles caching and offline functionality
 */

// Cache name and version
const CACHE_NAME = 'boardie-cache-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/db.js',
  './js/auth.js',
  './js/embedHandlers.js',
  './js/ui.js',
  './js/ui/toast.js',
  './js/ui/modal.js',
  './js/ui/tagManager.js',
  './js/ui/uiManager.js',
  './manifest.json',
  './icons/icon-192x192.png'
];

// Install event - precache assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  // Precache assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .catch(error => {
        console.error('[Service Worker] Precaching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Clean up old caches
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.filter(cacheName => {
            return cacheName !== CACHE_NAME;
          }).map(cacheName => {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Service Worker activated');
        // Claim clients to ensure the service worker controls all clients
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  // Skip Supabase API requests (these should always go to network)
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  
  // Skip browser extension requests
  if (event.request.url.includes('chrome-extension://')) {
    return;
  }
  
  // Handle API requests differently (network first, then cache)
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the response
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, clonedResponse);
            });
          
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // For HTML requests, use network first strategy
  if (event.request.headers.get('Accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the response
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, clonedResponse);
            });
          
          return response;
        })
        .catch(() => {
          // If network fails, serve from cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              
              // If not in cache, serve the offline page
              return caches.match('./index.html');
            });
        })
    );
    return;
  }
  
  // For other requests, use cache first strategy
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached response
          return cachedResponse;
        }
        
        // If not in cache, fetch from network
        return fetch(event.request)
          .then(response => {
            // Cache the response
            const clonedResponse = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, clonedResponse);
              });
            
            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', error);
            
            // For image requests, return a placeholder image
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return caches.match('./images/placeholder.png');
            }
            
            // For other requests, return an error response
            return new Response('Network error', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Push event - handle push notifications
self.addEventListener('push', event => {
  console.log('[Service Worker] Push received:', event);
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      notificationData = {
        title: 'New Notification',
        body: event.data.text()
      };
    }
  }
  
  const title = notificationData.title || 'Boardie Notification';
  const options = {
    body: notificationData.body || 'Something new happened!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: notificationData.data || {},
    actions: notificationData.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click received:', event);
  
  event.notification.close();
  
  // Get notification data
  const data = event.notification.data;
  
  // Handle notification click
  if (event.action) {
    // Handle action button clicks
    console.log('[Service Worker] Action clicked:', event.action);
  }
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Check if a window is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(data.url || '/');
        }
      })
  );
});

// Sync event - handle background sync
self.addEventListener('sync', event => {
  console.log('[Service Worker] Sync event:', event.tag);
  
  if (event.tag === 'sync-posts') {
    event.waitUntil(
      // This would typically call a function to sync data with the server
      // For now, we'll just log the event
      console.log('[Service Worker] Syncing posts...')
    );
  }
});

// Message event - handle messages from clients
self.addEventListener('message', event => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
