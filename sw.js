"use strict";

importScripts("./assets/js/version.js?v=1.0.27");

var ASSETVRN = self.SM_ASSET_VERSION || "1.0.27";
var AVERSION = "sabrina-shell-" + ASSETVRN;
var PRECACHE = AVERSION + "-precache";
var RUN_TIME = AVERSION + "-runtime";

function withVersion(url) {
    return self.smAssetUrl ? self.smAssetUrl(url) : url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + ASSETVRN;
}

var SHELL = [
    "./",
    "./index.html",
    "./404.html",
    withVersion("./manifest.json"),
    withVersion("./assets/css/main.css"),
    withVersion("./assets/css/variables.css"),
    withVersion("./assets/css/base.css"),
    withVersion("./assets/css/layout.css"),
    withVersion("./assets/css/components.css"),
    withVersion("./assets/css/animations.css"),
    withVersion("./assets/css/responsive.css"),
    withVersion("./assets/js/version.js"),
    withVersion("./assets/js/early.js"),
    withVersion("./assets/js/main.js"),
    withVersion("./assets/js/config.js"),
    withVersion("./assets/js/data.js"),
    withVersion("./assets/js/components.js"),
    withVersion("./assets/js/animations.js"),
    withVersion("./assets/js/navigation.js"),
    withVersion("./assets/js/theme.js"),
    withVersion("./assets/js/contact.js"),
    withVersion("./assets/js/utils.js"),
    withVersion("./assets/content/portfolio.json"),
    withVersion("./assets/fonts/manrope-latin-wght-normal.woff2"),
    withVersion("./assets/fonts/inter-latin-wght-normal.woff2"),
    withVersion("./assets/fonts/jetbrains-mono-latin-wght-normal.woff2"),
    withVersion("./assets/image/logo.svg"),
    withVersion("./assets/image/favicon.svg"),
    withVersion("./assets/image/icons.svg"),
    withVersion("./assets/image/covers/hero.png"),
    withVersion("./assets/image/covers/about.png"),
    withVersion("./assets/image/illustrations/world-dots.svg"),
    withVersion("./assets/image/tools/upwork.svg"),
    withVersion("./assets/image/tools/linkedin.svg"),
    withVersion("./assets/image/tools/hubspot.svg"),
    withVersion("./assets/image/tools/salesforce.svg"),
    withVersion("./assets/image/tools/openai.svg"),
    withVersion("./assets/image/tools/googleappsscript.svg"),
    withVersion("./assets/image/tools/googlesheets.svg"),
    withVersion("./assets/image/tools/semrush.svg"),
    withVersion("./assets/image/tools/wappalyzer.svg"),
    withVersion("./assets/image/tools/canva.svg"),
    withVersion("./assets/image/tools/google.svg"),
    withVersion("./assets/image/icons/icon-192.png"),
    withVersion("./assets/image/icons/icon-512.png"),
    withVersion("./assets/image/icons/icma-512.png"),
];

function sameOrigin(url) {
    return url.origin === self.location.origin;
}

function isNavigation(request) {
    return (
        request.mode === "navigate" ||
        (request.method === "GET" &&
            request.headers.get("accept") &&
            request.headers.get("accept").indexOf("text/html") !== -1)
    );
}

function isResumePdf(url) {
    return /\/assets\/resume\/.+\.pdf$/i.test(url.pathname);
}

function isStaticAsset(url) {
    return /\.(?:css|js|json|png|jpe?g|webp|gif|svg|ico|woff2?)$/i.test(url.pathname);
}

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches
            .open(PRECACHE)
            .then(function (cache) {
                return Promise.all(
                    SHELL.map(function (url) {
                        return cache.add(url).catch(function () {});
                    })
                );
            })
            .then(function () {
                return self.skipWaiting();
            })
    );
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches
            .keys()
            .then(function (keys) {
                return Promise.all(
                    keys.map(function (key) {
                        if (key.indexOf(AVERSION) !== 0) return caches.delete(key);
                    })
                );
            })
            .then(function () {
                return self.clients.claim();
            })
    );
});

self.addEventListener("fetch", function (event) {
    var request = event.request;
    if (request.method !== "GET") return;

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
    return fetch(request)
        .then(function (response) {
            if (response && response.ok) {
                var copy = response.clone();
                caches.open(RUN_TIME).then(function (cache) {
                    cache.put(request, copy);
                });
            }
            return response;
        })
        .catch(function () {
            return caches.match(request).then(function (cached) {
                if (cached) return cached;
                return caches.match("./index.html").then(function (home) {
                    return home || Response.error();
                });
            });
        });
}

function staleWhileRevalidate(request) {
    return caches.match(request).then(function (cached) {
        var network = fetch(request)
            .then(function (response) {
                if (response && response.ok) {
                    var copy = response.clone();
                    caches.open(RUN_TIME).then(function (cache) {
                        cache.put(request, copy);
                    });
                }
                return response;
            })
            .catch(function () {
                return cached || Response.error();
            });
        return cached || network;
    });
}