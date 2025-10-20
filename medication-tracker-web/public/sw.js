const STATIC_CACHE = 'static-v1';
const ASSET_CACHE = 'assets-v1';
const API_CACHE = 'api-v1';
const BG_SYNC_TAG = 'medication-sync';
const DB_NAME = 'offline-sync';
const STORE_NAME = 'requests';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch((error) => {
        console.warn('SW install cache failed', error);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (![STATIC_CACHE, ASSET_CACHE, API_CACHE].includes(key)) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    if (shouldQueueRequest(request)) {
      event.respondWith(handleBackgroundSync(request));
    }
    return;
  }

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === BG_SYNC_TAG) {
    event.waitUntil(flushQueue());
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function networkFirst(request, cacheName = STATIC_CACHE) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response && response.status === 200) {
    cache.put(request, response.clone());
  }
  return response;
}

function isApiRequest(url) {
  return (
    url.hostname.includes('firebase') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('googleapis.com')
  );
}

function shouldQueueRequest(request) {
  const url = new URL(request.url);
  return (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    (url.hostname.includes('firebase') || url.hostname.includes('googleapis.com'))
  );
}

async function handleBackgroundSync(request) {
  try {
    return await fetch(request.clone());
  } catch (error) {
    await queueRequest(request);
    return new Response(
      JSON.stringify({ queued: true, message: 'Request queued for sync.' }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function queueRequest(request) {
  const body = request.method === 'GET' ? null : await request.clone().text();
  const headers = Array.from(request.headers.entries());

  await withStore('readwrite', (store) => {
    store.add({
      url: request.url,
      method: request.method,
      headers,
      body,
      timestamp: Date.now(),
    });
  });

  if ('sync' in self.registration) {
    try {
      await self.registration.sync.register(BG_SYNC_TAG);
    } catch (error) {
      console.warn('Sync registration failed', error);
    }
  }
}

async function flushQueue() {
  const requests = await withStore('readonly', (store) => store.getAll());
  if (!requests || requests.length === 0) {
    return;
  }

  for (const entry of requests) {
    try {
      await fetch(
        entry.url,
        {
          method: entry.method,
          headers: new Headers(entry.headers),
          body: entry.body,
        }
      );
      await withStore('readwrite', (store) => store.delete(entry.id));
    } catch (error) {
      console.error('Background sync failed; will retry later', error);
      break;
    }
  }
}

function withStore(mode, callback) {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(DB_NAME, 1);
    openRequest.onupgradeneeded = () => {
      const db = openRequest.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    openRequest.onsuccess = () => {
      const db = openRequest.result;
      const transaction = db.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const result = callback(store);
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
    };

    openRequest.onerror = () => reject(openRequest.error);
  });
}
