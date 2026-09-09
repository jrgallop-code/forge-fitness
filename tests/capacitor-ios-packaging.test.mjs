import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = async relativePath => JSON.parse(await readFile(new URL(`../${relativePath}`, import.meta.url), "utf8"));

test("Capacitor packages Level Up from generated local web assets", async () => {
    const config = await readJson("capacitor.config.json");
    assert.equal(config.appName, "Level Up");
    assert.equal(config.appId, "com.leveluphypertrophy.app");
    assert.equal(config.webDir, "www");
    assert.equal(config.server?.url, undefined);
});

test("native scripts build before syncing the iOS project", async () => {
    const packageJson = await readJson("package.json");
    assert.match(packageJson.scripts["cap:sync:ios"], /build:native.*cap sync ios/);
    assert.equal(packageJson.dependencies["@capacitor/core"], packageJson.dependencies["@capacitor/ios"]);
    assert.equal(packageJson.dependencies["@capacitor/core"], packageJson.devDependencies["@capacitor/cli"]);
    assert.equal(packageJson.dependencies["@capacitor/haptics"], "8.0.0");
    assert.equal(packageJson.dependencies["@capacitor/local-notifications"], "8.0.0");
});

test("native runtime does not register the PWA service worker", async () => {
    const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
    assert.match(app, /!window\.Capacitor\?\.isNativePlatform\?\.\(\)/);
});

test("native iOS uses first-party email login without social-login review blockers", async () => {
    const login = await readFile(new URL("../js/account/first-launch-login.js", import.meta.url), "utf8");
    const account = await readFile(new URL("../js/more/account-cloud-ui.js", import.meta.url), "utf8");
    assert.match(login, /window\.Capacitor\?\.getPlatform\?\.\(\) === "ios"/);
    assert.match(login, /nativeIOS \? "" : '<div class="level-up-login-google"/);
    assert.match(login, /nativeIOS \? "" : '<button class="level-up-login-provider"[^']*Apple/);
    assert.match(account, /nativeIOS \? "" : '<div id="account-google-button"/);
    assert.match(account, /Delete Cloud Account/);
    assert.match(account, /method: "DELETE"/);
    assert.match(account, /Generate Transfer Code/);
    assert.match(login, /Already use Level Up on the web\?/);
});

test("native iOS provides haptics, background alarms, and selectable app icons", async () => {
    const native = await readFile(new URL("../js/core/native-capabilities.js", import.meta.url), "utf8");
    const appearance = await readFile(new URL("../js/more/appearance-settings.js", import.meta.url), "utf8");
    const info = await readFile(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8");
    const plugin = await readFile(new URL("../ios/App/App/LevelUpAppIconPlugin.swift", import.meta.url), "utf8");
    assert.match(native, /plugin\("Haptics"\)/);
    assert.match(native, /plugin\("LocalNotifications"\)/);
    assert.match(native, /scheduleNativeAlarm/);
    assert.match(appearance, /Choose your Level Up icon/);
    assert.match(appearance, /LevelUpAppIcon\?\.setIcon/);
    assert.match(info, /CFBundleAlternateIcons/);
    assert.match(plugin, /setAlternateIconName/);
    for (const name of ["Arctic", "Pure", "Ocean", "Midnight", "Slate", "Pulse"]) {
        await readFile(new URL(`../ios/App/App/Assets.xcassets/AppIcon${name}.appiconset/AppIcon${name}-1024.png`, import.meta.url));
    }
});

test("the iOS target declares permissions used by Level Up features", async () => {
    const info = await readFile(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8");
    for (const permission of [
        "NSCameraUsageDescription",
        "NSMicrophoneUsageDescription",
        "NSPhotoLibraryUsageDescription",
        "NSSpeechRecognitionUsageDescription"
    ]) assert.match(info, new RegExp(`<key>${permission}</key>`));
});
