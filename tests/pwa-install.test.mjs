import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const manifest = JSON.parse(readFileSync("manifest.webmanifest", "utf8"));

function pngDimensions(path) {
    const data = readFileSync(path);
    assert.equal(data.toString("ascii", 1, 4), "PNG", `${path} must be a PNG`);
    return {
        width: data.readUInt32BE(16),
        height: data.readUInt32BE(20)
    };
}

function webpDimensions(path) {
    const data = readFileSync(path);
    assert.equal(data.toString("ascii", 0, 4), "RIFF", `${path} must be a RIFF container`);
    assert.equal(data.toString("ascii", 8, 12), "WEBP", `${path} must be a WebP image`);
    assert.equal(data.toString("ascii", 12, 16), "VP8 ", `${path} must use the widely supported VP8 WebP format`);
    return {
        width: data.readUInt16LE(26) & 0x3fff,
        height: data.readUInt16LE(28) & 0x3fff
    };
}

test("service worker registers offline lifecycle and notification handlers", () => {
    const handlers = new Set();
    const source = readFileSync("service-worker.js", "utf8");

    vm.runInNewContext(source, {
        self: {
            addEventListener(name) {
                handlers.add(name);
            }
        }
    });

    assert.deepEqual(
        [...handlers].sort(),
        ["activate", "fetch", "install", "notificationclick"]
    );
    assert.match(source, /request\.mode === "navigate"/);
    assert.match(source, /url\.origin !== self\.location\.origin/);
});

test("an installed app reloads once when a new service worker takes control", () => {
    const app = readFileSync("js/app.js", "utf8");
    assert.match(app, /navigator\.serviceWorker\.controller/);
    assert.match(app, /controllerchange/);
    assert.match(app, /window\.location\.reload\(\)/);
});

test("installed launches have a hard splash timeout and a cache-safe recovery screen", () => {
    const html = readFileSync("index.html", "utf8");
    const safeguard = readFileSync("js/core/pwa-startup-safeguard.js", "utf8");
    const styles = readFileSync("css/pwa-splash-screen.css", "utf8");
    assert.match(html, /js\/core\/pwa-startup-safeguard\.js\?v=pwa-splash-safety-1/);
    assert.ok(html.indexOf("pwa-startup-safeguard.js") < html.indexOf("js/app.js"));
    assert.match(safeguard, /setTimeout\(dismissSplash, 3200\)/);
    assert.match(safeguard, /setTimeout\(showRecovery, 7000\)/);
    assert.match(safeguard, /data-pwa-reload/);
    assert.match(safeguard, /data-pwa-refresh-cache/);
    assert.match(safeguard, /startsWith\("level-up-"\)/);
    assert.doesNotMatch(safeguard, /localStorage\.clear/);
    assert.match(styles, /\.pwa-startup-recovery/);
});

test("every explicit appearance theme uses its matching optimized splash and loader", () => {
    const html = readFileSync("index.html", "utf8");
    const worker = readFileSync("service-worker.js", "utf8");
    const styles = readFileSync("css/pwa-splash-screen.css", "utf8");
    const splashes = {
        arctic: ["assets/level-up-splash-arctic-v2.webp", 1672],
        pure: ["assets/level-up-splash-pure-v1.webp", 1672],
        ocean: ["assets/level-up-splash-ocean-v1.webp", 1672],
        midnight: ["assets/level-up-splash-midnight-v1.webp", 1672],
        slate: ["assets/level-up-splash-slate-v1.webp", 1672],
        pulse: ["assets/level-up-splash-pulse-v1.webp", 1672]
    };

    for (const [theme, [splash, height]] of Object.entries(splashes)) {
        assert.ok(existsSync(splash), `${theme} splash must exist`);
        assert.deepEqual(webpDimensions(splash), { width: 941, height });
        assert.ok(readFileSync(splash).length < 100_000, `${theme} splash should remain safely below transport limits`);
        assert.match(html, new RegExp(`${theme}:"${splash.replaceAll("/", "\\/")}\\?v=theme-splash-2"`));
        assert.match(worker, new RegExp(`\\.\\/${splash.replaceAll("/", "\\/")}`));
        assert.match(styles, new RegExp(`html\\[data-theme="${theme}"\\]\\.level-up-installed-pwa #pwa-splash`));
    }

    assert.match(html, /window\.__levelUpSplashAsset/);
    assert.match(styles, /background: #1769e0/);
    assert.match(styles, /background: #0798d9/);
    assert.match(styles, /background: #3478f6/);
    assert.match(styles, /background: #7396b8/);
    assert.match(styles, /background: #ff2d95/);
});

test("automatic theme uses the locally resolved day or night splash", () => {
    const html = readFileSync("index.html", "utf8");
    assert.match(html, /window\.__levelUpSplashAsset=s\[r\]\|\|s\["level-up"\]/);
});

test("iPhone install guidance treats Open as Web App as optional", () => {
    const onboarding = readFileSync("js/onboarding/onboarding-install-help.js", "utf8");
    const more = readFileSync("js/more/install-level-up.js", "utf8");
    for (const source of [onboarding, more]) {
        assert.match(source, /If <strong>Open as Web App<\/strong> appears/);
        assert.match(source, /You can still tap Add/);
    }
});

test("installed-app confirmation remains legible in light appearances", () => {
    const more = readFileSync("js/more/install-level-up.js", "utf8");
    assert.match(more, /color:var\(--success-text,#147a3c\)/);
    assert.match(more, /-webkit-text-fill-color:var\(--success-text,#147a3c\)/);
    assert.doesNotMatch(more, /color:#e3faeb/);
});

test("manifest supplies installable, maskable, and Apple icon assets", () => {
    const requiredIcons = [
        ["assets/icons/icon-192.png", 192, "any"],
        ["assets/icons/icon-384.png", 384, "any"],
        ["assets/icons/icon-512.png", 512, "any"],
        ["assets/icons/icon-1024.png", 1024, "any"],
        ["assets/icons/icon-maskable-512.png", 512, "maskable"],
        ["assets/icons/icon-maskable-1024.png", 1024, "maskable"]
    ];

    for (const [src, size, purpose] of requiredIcons) {
        const entry = manifest.icons.find(icon => icon.src === src);
        assert.ok(entry, `${src} must be declared`);
        assert.equal(entry.sizes, `${size}x${size}`);
        assert.equal(entry.purpose, purpose);
        assert.deepEqual(pngDimensions(src), { width: size, height: size });
    }

    const appleIcon = "assets/icons/apple-touch-icon-180.png";
    assert.ok(existsSync(appleIcon));
    assert.deepEqual(pngDimensions(appleIcon), { width: 180, height: 180 });

    const html = readFileSync("index.html", "utf8");
    assert.match(html, /rel="apple-touch-icon" sizes="180x180" href="assets\/icons\/apple-touch-icon-180\.png/);
});

test("manifest includes real narrow app screenshots with correct dimensions", () => {
    assert.ok(Array.isArray(manifest.screenshots));
    assert.ok(manifest.screenshots.length >= 2);

    for (const screenshot of manifest.screenshots) {
        assert.equal(screenshot.form_factor, "narrow");
        assert.ok(screenshot.label);
        assert.ok(existsSync(screenshot.src), `${screenshot.src} must exist`);
        const dimensions = pngDimensions(screenshot.src);
        assert.equal(screenshot.sizes, `${dimensions.width}x${dimensions.height}`);
    }
});
