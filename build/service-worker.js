const cachePrefix = `block10-offline:${new URL(self.registration.scope).pathname}:`;
const cacheName = cachePrefix + revision;
const index = build.base + 'index.html';
const testRoot = build.base + 'test';
const assets = new Map(build.assets.map(([path, hash]) => [build.base + path, hash]));

async function install() {
  const cache = await caches.open(cacheName);
  try {
    const results = await Promise.allSettled(Array.from(assets, async ([path, expected]) => {
      const response = await fetch(path, { cache: 'reload', redirect: 'error' });
      if (!response.ok) throw new Error(`Unable to download ${path}`);
      const body = await response.clone().arrayBuffer();
      const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', body));
      const hash = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      if (hash !== expected) throw new Error(`Unexpected version of ${path}`);

      if (build.test && path === index) {
        const html = (await response.text()).replace('id="offline-test" hidden', 'id="offline-test"');
        await cache.put(path, new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
      } else {
        await cache.put(path, response);
      }
    }));
    if (results.some(result => result.status === 'rejected')) throw new Error('Offline files are incomplete');
  } catch (error) {
    await caches.delete(cacheName);
    throw error;
  }
}

self.addEventListener('install', event => event.waitUntil(install()));

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName)
      .map(key => caches.delete(key)));
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'activate-offline-update') event.waitUntil(self.skipWaiting());
});

async function cached(path) {
  return caches.match(path, { cacheName });
}

async function networkFirst(request, path) {
  try {
    return await fetch(request, { cache: 'no-store' });
  } catch {
    return await cached(path) ?? Response.error();
  }
}

async function cacheFirst(request, path) {
  return await cached(path) ?? fetch(request);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method !== 'GET' || url.origin !== self.location.origin || !path.startsWith(build.base)) return;
  if (!build.test && (path === testRoot || path.startsWith(testRoot + '/'))) return;

  if (request.mode === 'navigate' && (path === build.base || path === index)) {
    event.respondWith(build.test ? networkFirst(request, index) : cacheFirst(request, index));
  } else if (assets.has(path)) {
    const publishedAsset = build.test && !path.startsWith(build.base + 'assets/');
    event.respondWith(publishedAsset ? networkFirst(request, path) : cacheFirst(request, path));
  }
});
