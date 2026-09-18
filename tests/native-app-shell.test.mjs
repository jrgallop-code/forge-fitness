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

test("iOS 26 keeps the Level Up bar and uses a neutral glass selected tab", async () => {
    const [app, navbar, styles, nativeNavigation, bridge, project] = await Promise.all([
        readFile(new URL("../js/app.js", import.meta.url), "utf8"),
        readFile(new URL("../js/components/navbar.js", import.meta.url), "utf8"),
        readFile(new URL("../css/native-ios-polish.css", import.meta.url), "utf8"),
        readFile(new URL("../ios/App/App/LevelUpLiquidGlassNavigation.swift", import.meta.url), "utf8"),
        readFile(new URL("../ios/App/App/LevelUpBridgeViewController.swift", import.meta.url), "utf8"),
        readFile(new URL("../ios/App/App.xcodeproj/project.pbxproj", import.meta.url), "utf8")
    ]);

    assert.match(nativeNavigation, /@available\(iOS 26\.0, \*\)/);
    assert.match(nativeNavigation, /buttonStyle\(\.glass\)/);
    assert.match(nativeNavigation, /buttonStyle\(\.plain\)/);
    assert.doesNotMatch(nativeNavigation, /buttonStyle\(\.glassProminent\)/);
    assert.match(nativeNavigation, /ForEach\(items, id: \\.page\)/);
    assert.doesNotMatch(nativeNavigation, /GlassEffectContainer/);
    assert.match(bridge, /registerPluginInstance\(LevelUpNativeNavigationPlugin\(\)\)/);
    assert.match(project, /LevelUpLiquidGlassNavigation\.swift in Sources/);

    assert.match(app, /LevelUpNativeNavigation/);
    assert.match(app, /result\?\.available === true/);
    assert.match(app, /!document\.getElementById\("level-up-login-gate"\)/);
    assert.match(app, /!document\.body\.classList\.contains\("levelup-onboarding-open"\)/);
    assert.match(navbar, /__levelUpNativeNavigationSelect\?\.\(page\)/);
    assert.match(styles, /html\.level-up-native-liquid-glass \.bottom-nav \.nav-btn/);
    assert.doesNotMatch(styles, /html\.level-up-native-liquid-glass \.bottom-nav\s*\{[^}]*visibility:\s*hidden/s);
    assert.doesNotMatch(styles, /html\.level-up-native-ios \.bottom-nav/);
    assert.doesNotMatch(app, /level-up-native-ios/);
});
