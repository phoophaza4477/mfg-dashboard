const CACHE_NAME = "mfg-dashboard-v1";

// ไฟล์ที่จะ cache ไว้ใช้ offline
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// ── Install: cache ไฟล์ทั้งหมด ──────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching assets");
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: ลบ cache เก่า ──────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Network First → Cache Fallback ───────────────
self.addEventListener("fetch", (event) => {
  // Firebase requests → ไม่ cache (ต้องการ real-time เสมอ)
  if (
    event.request.url.includes("firebasedatabase.app") ||
    event.request.url.includes("googleapis.com") ||
    event.request.url.includes("gstatic.com")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // ไฟล์อื่น → Network First, fallback to Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // clone เก็บ cache ด้วย
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // ถ้าไม่มีเน็ต → เอาจาก cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // fallback หน้า offline
          return caches.match("/index.html");
        });
      })
  );
});

// ── Push Notification handler ────────────────────────────
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "🏭 MFG Dashboard";
  const options = {
    body:  data.body  || "มีการแจ้งเตือนใหม่",
    icon:  "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click ───────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || "/")
  );
});