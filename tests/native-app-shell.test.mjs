import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("the signed-in app uses a content-first native shell", async () => {
    const [html, styles] = await Promise.all([
        readFile(new URL("../index.html", import.meta.url), "utf8"),
        readFile(new URL("../css/styles.css", import.meta.url), "utf8")
    ]);

    assert.doesNotMatch(html, /<header class="hero">/);
    assert.doesNotMatch(html, /Train with purpose/);
    assert.doesNotMatch(html, /class="brand-logo"/);
    assert.match(html, /<div id="app"><main id="content"><\/main><\/div>/);
    assert.match(styles, /#content\s*\{[^}]*env\(safe-area-inset-top\)/s);
});

test("the iOS bottom navigation uses an app-only Liquid Glass material", async () => {
    const [app, styles] = await Promise.all([
        readFile(new URL("../js/app.js", import.meta.url), "utf8"),
        readFile(new URL("../css/native-ios-polish.css", import.meta.url), "utf8")
    ]);

    assert.match(app, /classList\.toggle\("level-up-native-ios", isNativeIOSApp\)/);
    assert.match(styles, /html\.level-up-native-ios \.bottom-nav/);
    assert.match(styles, /backdrop-filter: blur\(30px\) saturate\(190%\) contrast\(108%\)/);
    assert.match(styles, /html\[data-theme-mode="light"\]\.level-up-native-ios \.bottom-nav/);
    assert.match(styles, /never alter the PWA navigation/);
});
