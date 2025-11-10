const CACHE_NAME = 'berbagi-cerita-v4';
const BASE_URL = self.location.origin;

const urlsToCache = [
  `${BASE_URL}/`,
  `${BASE_URL}/index.html`,
  `${BASE_URL}/app.bundle.js`,
  `${BASE_URL}/styles/styles.css`,
  `${BASE_URL}/images/favicon.png`,
  `${BASE_URL}/images/logo.png`,
];

// Install Service Worker → caching awal (app shell)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Aktivasi → hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch → offline support
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Network-first untuk API Dicoding
  if (request.url.includes('https://story-api.dicoding.dev/')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Cache-first untuk static asset
  event.respondWith(
    caches.match(request).then((response) => response || fetch(request))
  );
});

self.addEventListener('push', (event) => {
  console.log('📩 Push event:', event);

  let notificationData = {
    title: 'Berbagi Cerita',
    body: 'Ada notifikasi baru!',
    icon: '/images/logo.png',
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData.title = data.title || 'Berbagi Cerita';
      notificationData.body = data.options?.body || data.body || 'Ada notifikasi baru!';
      notificationData.icon = data.options?.icon || '/images/logo.png';
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: '/images/favicon.png',
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});


// Klik notifikasi → buka halaman utama atau fokus tab yang sudah ada
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Kalau sudah ada tab app-nya, fokus ke situ aja
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }

      // Kalau belum ada, buka tab baru ke halaman utama app
      if (clients.openWindow) {
        return clients.openWindow(`${self.location.origin}/Berbagi-Cerita-Apps/`);
      }
    })
  );
});


// Tambahkan fallback jika offline dan resource tidak ada di cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Network-first untuk API Dicoding
  if (request.url.includes('https://story-api.dicoding.dev/')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  // Cache-first untuk static asset
  event.respondWith(
    caches.match(request).then((response) => {
      // kalau ada di cache → tampilkan
      if (response) return response;

      // kalau tidak ada dan offline → tampilkan halaman fallback
      return fetch(request).catch(() => {
        if (request.mode === 'navigate') {
          // kalau user buka halaman baru (navigasi)
          return caches.match(`${BASE_URL}/index.html`);
        }
      });
    })
  );
});
