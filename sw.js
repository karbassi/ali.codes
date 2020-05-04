/*
This is a modified version of Ethan Marcotte's service worker (https://ethanmarcotte.com/theworkerofservices.js),
which is in turn a modified version of Jeremy Keith's service worker (https://adactio.com/serviceworker.js),
with a few additional edits borrowed from Filament Group's. (https://www.filamentgroup.com/sw.js)
*/
(function () {
  const version = "v11";
  const cacheName = ":karbassi-2019:";

  const staticCacheName = version + cacheName + "static";
  const pagesCacheName = cacheName + "pages";
  const imagesCacheName = cacheName + "images";

  const staticAssets = [
    "/",
    "/bio/",
    "/press/",
    "/blog/",
    "/calendar/",
    "/assets/css/remedy.css",
    "/assets/css/style.css",
    "/assets/css/bio.css",
    "/assets/css/calendar.css",
  ];

  function updateStaticCache() {
    // These items must be cached for the Service Worker to complete installation
    return caches.open(staticCacheName).then((cache) => {
      return cache.addAll(
        staticAssets.map(
          (url) =>
            new Request(url, {
              credentials: "include",
            })
        )
      );
    });
  }

  function stashInCache(cacheName, request, response) {
    caches.open(cacheName).then((cache) => cache.put(request, response));
  }

  // Limit the number of items in a specified cache.
  function trimCache(cacheName, maxItems) {
    caches.open(cacheName).then((cache) => {
      cache.keys().then((keys) => {
        if (keys.length > maxItems) {
          cache.delete(keys[0]).then(() => trimCache(cacheName, maxItems));
        }
      });
    });
  }

  // Remove caches whose name is no longer valid
  function clearOldCaches() {
    return caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.indexOf(version) !== 0)
          .map((key) => caches.delete(key))
      );
    });
  }

  // Events!
  self.addEventListener("message", (event) => {
    if (event.data.command === "trimCaches") {
      trimCache(pagesCacheName, 35);
      trimCache(imagesCacheName, 20);
    }
  });

  self.addEventListener("install", (event) => {
    event.waitUntil(updateStaticCache().then(() => self.skipWaiting()));
  });

  self.addEventListener("activate", (event) => {
    event.waitUntil(clearOldCaches().then(() => self.clients.claim()));
  });

  self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);

    const allowedUrls = [
      "https://www.ali.codes",
      "http://www.ali.codes",
      "https://ali.codes",
      "http://ali.codes",
    ];

    if (!allowedUrls.find((x) => url.href.startsWith(x))) return;
    if (request.method !== "GET") return;
    if (url.href.indexOf("?") !== -1) return;

    if (request.headers.get("Accept").includes("text/html")) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            let copy = response.clone();
            if (
              staticAssets.includes(url.pathname) ||
              staticAssets.includes(url.pathname + "/")
            ) {
              stashInCache(staticCacheName, request, copy);
            } else {
              stashInCache(pagesCacheName, request, copy);
            }
            return response;
          })
          .catch(() => {
            // CACHE or FALLBACK
            return caches
              .match(request)
              .then((response) => response || caches.match("/offline/"));
          })
      );
      return;
    }

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (request.headers.get("Accept").includes("image")) {
            let copy = response.clone();
            stashInCache(imagesCacheName, request, copy);
          }
          return response;
        })
        .catch(() => {
          return caches
            .match(request)
            .then((response) => response)
            .catch(console.error);
        })
    );
  });
})();
