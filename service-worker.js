const CACHE_VERSION = "2026-09-04-219";
const CACHE_PREFIX = "level-up-";
const SHELL_CACHE = `${CACHE_PREFIX}shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${CACHE_VERSION}`;

const CORE_ASSETS = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./js/account/cloud-backup-history-ui.js?v=backup-history-ui-1",
    "./js/account/cloud-background-sync.js",
    "./js/core/system-recovery-notice.js?v=system-recovery-notice-1",
    "./js/core/body-composition.js?v=body-composition-1",
    "./js/core/muscle-map-colors.js?v=muscle-map-colors-3",
    "./js/core/muscle-map-rendering-fix.js?v=muscle-map-rendering-fix-5",
    "./js/progress/recovery-secondary-muscles.js?v=recovery-secondary-8",
    "./js/progress/body-composition-ui.js?v=body-composition-ui-1",
    "./js/progress/body-fat-visual-replacement.js?v=approved-body-fat-1",
    "./js/more/body-composition-health-records.js?v=body-comp-health-records-2",
    "./js/more/interactive-workout-tutorial-v5.js?v=interactive-workout-v5-1",
    "./js/dashboard/workout-tutorial-prompt.js?v=workout-tutorial-prompt-1",
    "./js/nutrition/protein-minimum-consistency.js?v=protein-minimum-2",
    "./js/nutrition/nutrition-phase-target-stability.js?v=phase-target-stability-1",
    "./js/nutrition/nutrition-authority-sync.js?v=nutrition-authority-sync-2",
    "./js/nutrition/nutrition-mode-ui.js?v=nutrition-mode-ui-1",
    "./js/nutrition/nutrition-mode-controls.js?v=nutrition-mode-controls-1",
    "./js/nutrition/weekly-check-in-status.js?v=weekly-checkin-status-1",
    "./js/nutrition/check-in-calendar.js?v=checkin-calendar-1",
    "./js/nutrition/tdee-calorie-expenditure-carousel.js?v=tdee-calorie-card-3",
    "./js/nutrition/tdee-energy-balance-summary.js?v=energy-balance-summary-2",
    "./js/nutrition/tdee-expenditure-swipe-card.js?v=tdee-expenditure-swipe-2",
    "./assets/level-up-home-icon.svg",
    "./assets/level-up-mark-transparent.svg",
    "./assets/icons/icon-192.png",
    "./assets/icons/icon-384.png",
    "./assets/icons/icon-512.png",
    "./assets/icons/icon-1024.png",
    "./assets/icons/icon-maskable-512.png",
    "./assets/icons/icon-maskable-1024.png",
    "./assets/icons/apple-touch-icon-180.png",
    "./assets/level-up-splash-exact.png",
    "./assets/level-up-splash-arctic-v2.webp",
    "./assets/level-up-splash-pure-v1.webp",
    "./assets/level-up-splash-ocean-v1.webp",
    "./assets/level-up-splash-midnight-v1.webp",
    "./assets/level-up-splash-slate-v1.webp",
    "./assets/level-up-splash-pulse-v1.webp"
];

function isLocalAsset(value) {
    if (!value || /^(?:data:|blob:|https?:|\/\/|#)/i.test(value)) return false;
    return true;
}

function assetUrlsFromHtml(html) {
    const urls = new Set(CORE_ASSETS.map(path => new URL(path, self.registration.scope).href));
    const attributePattern = /(?:href|src)=["']([^"']+)["']/gi;
    let match;
    while ((match = attributePattern.exec(html))) {
        if (!isLocalAsset(match[1])) continue;
        const url = new URL(match[1], self.registration.scope);
        if (url.origin === self.location.origin) urls.add(url.href);
    }
    return [...urls];
}

function referencedAssetUrls(content, baseUrl, contentType = "") {
    const references = [];
    const patterns = [];
    if (contentType.includes("javascript") || /\.m?js(?:\?|$)/i.test(baseUrl)) {
        patterns.push(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["']([^"']+)["']/gi);
    }
    if (contentType.includes("css") || /\.css(?:\?|$)/i.test(baseUrl)) {
        patterns.push(/url\(\s*["']?([^"')]+)["']?\s*\)/gi);
    }
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content))) {
            if (!isLocalAsset(match[1])) continue;
            const url = new URL(match[1], baseUrl);
            if (url.origin === self.location.origin) references.push(url.href);
        }
    }
    return references;
}

async function cacheAssetTree(seedUrls, cache) {
    const queued = [...new Set(seedUrls)];
    const visited = new Set();
    while (queued.length) {
        const batch = queued.splice(0, 8).filter(url => !visited.has(url));
        batch.forEach(url => visited.add(url));
        const discoveries = await Promise.allSettled(batch.map(async url => {
            const assetResponse = await fetch(url, { cache: "reload" });
            if (!assetResponse.ok || assetResponse.type === "opaque") return [];
            await cache.put(url, assetResponse.clone());
            const contentType = assetResponse.headers.get("content-type") || "";
            if (!contentType.includes("javascript") && !contentType.includes("css")) return [];
            const content = await assetResponse.text();
            return referencedAssetUrls(content, url, contentType);
        }));
        for (const result of discoveries) {
            if (result.status !== "fulfilled") continue;
            for (const url of result.value) {
                if (!visited.has(url) && !queued.includes(url)) queued.push(url);
            }
        }
    }
}

async function cacheFreshAppShell() {
    const cache = await caches.open(SHELL_CACHE);
    const indexUrl = new URL("./index.html", self.registration.scope);
    const response = await fetch(indexUrl, { cache: "reload" });
    if (!response.ok) throw new Error(`App shell request failed: ${response.status}`);
    const html = await response.clone().text();
    await cache.put(indexUrl, response.clone());
    await cache.put(new URL("./", self.registration.scope), response.clone());
    const seedUrls = assetUrlsFromHtml(html).filter(url => url !== indexUrl.href);
    await cacheAssetTree(seedUrls, cache);
}

self.addEventListener("install", event => {
    event.waitUntil(cacheFreshAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter(name => name.startsWith(CACHE_PREFIX) && ![SHELL_CACHE, RUNTIME_CACHE].includes(name))
                .map(name => caches.delete(name))
        );
    })());
});

async function networkFirst(request, fallbackToShell = false) {
    const cache = await caches.open(RUNTIME_CACHE);
    try {
        const forceFresh = fallbackToShell || request.destination === "script" || request.destination === "style";
        const response = await fetch(request, forceFresh ? { cache: "reload" } : undefined);
        if (response.ok && response.type !== "opaque") await cache.put(request, response.clone());
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (fallbackToShell) {
            const indexUrl = new URL("./index.html", self.registration.scope);
            const shell = await caches.match(indexUrl);
            if (shell) return shell;
        }
        throw error;
    }
}

self.addEventListener("fetch", event => {
    const { request } = event;
    if (request.method !== "GET" || request.headers.has("range")) return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (request.mode === "navigate") {
        event.respondWith(networkFirst(request, true));
        return;
    }
    event.respondWith(networkFirst(request));
});

self.addEventListener("notificationclick", event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(async windows => {
            const existing = windows.find(client => "focus" in client);
            if (existing) {
                await existing.focus();
                existing.postMessage({ type: "levelup:open-active-workout" });
                return existing;
            }
            return clients.openWindow("./?resumeWorkout=1");
        })
    );
});