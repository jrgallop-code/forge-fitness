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
});

test("native runtime does not register the PWA service worker", async () => {
    const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
    assert.match(app, /!window\.Capacitor\?\.isNativePlatform\?\.\(\)/);
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
