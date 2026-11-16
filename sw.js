'use strict';

var VERSION = 'sm-shell-v1';
var PRECACHE = VERSION + '-precache';
var RUNTIME = VERSION + '-runtime';

var SHELL = [
  './',
  './index.html',
  './404.html',
  './manifest.json',
  './assets/css/main.css',
  './assets/css/variables.css',
  './assets/css/base.css',
  './assets/css/layout.css',
  './assets/css/components.css',
  './assets/css/animations.css',
  './assets/css/responsive.css',
  './assets/js/early.js',
  './assets/js/main.js',
  './assets/js/config.js',
  './assets/js/data.js',
  './assets/js/components.js',
  './assets/js/animations.js',
  './assets/js/navigation.js',
  './assets/js/theme.js',
  './assets/js/contact.js',
  './assets/js/utils.js',
  './assets/data/portfolio.json',
  './assets/fonts/manrope-latin-wght-normal.woff2',
  './assets/fonts/inter-latin-wght-normal.woff2',
  './assets/fonts/jetbrains-mono-latin-wght-normal.woff2',
  './assets/image/logo.png',
  './assets/image/favicon.png',
  './assets/image/icons.svg',
  './assets/image/illustrations/world-dots.svg',
  './assets/image/icons/icon-192.png',
  './assets/image/icons/icon-512.png'
];

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNavigation(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept') &&
      request.headers.get('accept').indexOf('text/html') !== -1);
}

function isResumePdf(url) {
  return /\/assets\/resume\/.+\.pdf$/i.test(url.pathname);
}

function isStaticAsset(url) {
  return /\.(?:css|js|json|png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(url.pathname);
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(PRECACHE).then(function (cache) {
      return Promise.all(SHELL.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf(VERSION) !== 0) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  if (!sameOrigin(url) || isResumePdf(url)) return;

  if (isNavigation(request)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function networkFirst(request) {
  return fetch(request).then(function (response) {
    if (response && response.ok) {
      var copy = response.clone();
      caches.open(RUNTIME).then(function (cache) {
        cache.put(request, copy);
      });
    }
    return response;
  }).catch(function () {
    return caches.match(request).then(function (cached) {
      if (cached) return cached;
      return caches.match('./index.html').then(function (home) {
        return home || Response.error();
      });
    });
  });
}

function staleWhileRevalidate(request) {
  return caches.match(request).then(function (cached) {
    var network = fetch(request).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(RUNTIME).then(function (cache) {
          cache.put(request, copy);
        });
      }
      return response;
    }).catch(function () {
      return cached || Response.error();
    });
    return cached || network;
  });
}
