'use strict';

const CACHE_PREFIX = 'tanchi-xiaozhu-offline-';
const CACHE_NAME = 'tanchi-xiaozhu-offline-v1';
const SCOPE = new URL(self.registration.scope);
const REQUIRED_URLS = [
  './',
  './index.html',
  './style.css',
  './app.mjs?v=cartoon-dress-1',
  './install.mjs?v=pwa-1',
  './core.mjs',
  './foods.mjs',
  './assets/face.png',
  './assets/character-white-dress.png',
  './assets/rounded-bold.woff2',
  './assets/rounded-regular.woff2',
  './assets/app-icon.png',
  './manifest.webmanifest',
].map((path) => new URL(path, SCOPE).href);
const REQUIRED_SET = new Set(REQUIRED_URLS);
const INDEX_URL = new URL('./index.html', SCOPE).href;

function isInScope(url) {
  return url.origin === SCOPE.origin && url.pathname.startsWith(SCOPE.pathname);
}

function isDownload(url) {
  let path;
  try {
    path = decodeURIComponent(url.pathname.slice(SCOPE.pathname.length));
  } catch {
    return true;
  }
  return /(^|\/)downloads(?:\/|$)/i.test(path)
    || /(^|\/)download\.html$/i.test(path)
    || /\.(?:apk|zip)(?:\/|$)/i.test(path);
}

async function isOfflineReady() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const responses = await Promise.all(REQUIRED_URLS.map((url) => cache.match(url)));
    return responses.every((response) => response && response.ok);
  } catch {
    return false;
  }
}

async function notifyReadyClients() {
  if (!await isOfflineReady()) return;
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    const url = new URL(client.url);
    if (isInScope(url) && !isDownload(url)) {
      client.postMessage({ type: 'OFFLINE_READY', ready: true, cache: CACHE_NAME });
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // addAll is atomic: any missing/error resource rejects installation.
    await cache.addAll(REQUIRED_URLS.map((url) => new Request(url, {
      cache: 'reload',
      credentials: 'same-origin',
    })));
    if (!await isOfflineReady()) throw new Error('Required offline resources are incomplete');
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
    // Installation is complete before this notification; never reload a running game.
    await notifyReadyClients();
  })());
});

async function networkFirst(request, navigation) {
  let networkResponse;
  try {
    networkResponse = await fetch(request, { cache: 'no-store' });
    if (networkResponse.ok) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, networkResponse.clone());
      } catch {
        // A storage error must not hide a usable online response.
      }
      return networkResponse;
    }
  } catch {
    // Network failures and HTTP errors both use the current cache below.
  }
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached && cached.ok) return cached;
    if (navigation) {
      const index = await cache.match(INDEX_URL);
      if (index && index.ok) return index;
    }
  } catch {
    // Evicted/unavailable caches do not count as offline-ready.
  }
  return networkResponse || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!isInScope(url) || isDownload(url)) return;
  const navigation = request.mode === 'navigate';
  if (!navigation && !REQUIRED_SET.has(url.href)) return;
  event.respondWith(networkFirst(request, navigation));
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CHECK_OFFLINE_READY') return;
  event.waitUntil((async () => {
    const ready = await isOfflineReady();
    const response = {
      type: ready ? 'OFFLINE_READY' : 'NOT_READY',
      ready,
      cache: CACHE_NAME,
    };
    const recipient = event.ports[0] || event.source;
    if (recipient) recipient.postMessage(response);
  })());
});
