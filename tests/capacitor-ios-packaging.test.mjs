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
    assert.equal(packageJson.dependencies["@capacitor/app"], "8.0.0");
    assert.equal(packageJson.dependencies["@capacitor/browser"], "8.0.0");
});

test("native runtime does not register the PWA service worker", async () => {
    const app = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
    assert.match(app, /!window\.Capacitor\?\.isNativePlatform\?\.\(\)/);
});

test("native startup uses the saved appearance splash before the app renders", async () => {
    const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
    assert.match(index, /window\.Capacitor\?\.isNativePlatform\?\.\(\)/);
    assert.match(index, /level_up_appearance_settings/);
    assert.match(index, /level-up-installed-pwa/);
});

test("native web package includes every themed splash image", async () => {
    const splashes = [
        "assets/level-up-splash-exact.png",
        "assets/level-up-splash-arctic-v2.webp",
        "assets/level-up-splash-pure-v1.webp",
        "assets/level-up-splash-ocean-v1.webp",
        "assets/level-up-splash-midnight-v1.webp",
        "assets/level-up-splash-slate-v1.webp",
        "assets/level-up-splash-pulse-v1.webp"
    ];
    for (const splash of splashes) {
        const source = await readFile(new URL(`../${splash}`, import.meta.url));
        const packaged = await readFile(new URL(`../www/${splash}`, import.meta.url));
        assert.ok(source.length > 0, `${splash} source must not be empty`);
        assert.deepEqual(packaged, source, `${splash} must be copied unchanged into www`);
    }
});

test("native iOS offers Apple, Google, email, and existing-account transfer with protected contrast", async () => {
    const login = await readFile(new URL("../js/account/first-launch-login.js", import.meta.url), "utf8");
    const account = await readFile(new URL("../js/more/account-cloud-ui.js", import.meta.url), "utf8");
    const styles = await readFile(new URL("../css/first-launch-login.css", import.meta.url), "utf8");
    assert.match(login, /window\.Capacitor\?\.getPlatform\?\.\(\) === "ios"/);
    assert.match(login, /Continue with Apple/);
    assert.match(login, /Continue with Google/);
    assert.match(login, /Continue with email/);
    assert.match(login, /LevelUpNativeAuth\?\.signInWithApple/);
    assert.match(login, /ios-auth\.html/);
    assert.match(login, /app\.leveluphypertrophy\.com\/ios-auth\.html/);
    assert.match(account, /nativeIOS \? "" : '<div id="account-google-button"/);
    assert.match(account, /Delete Cloud Account/);
    assert.match(account, /method: "DELETE"/);
    assert.match(account, /Generate Transfer Code/);
    assert.match(login, /Already use Level Up on the web\?/);
    assert.match(styles, /level-up-login-google-native\{background:#050505!important;color:#fff!important/);
    assert.match(styles, /level-up-transfer-auth > p strong \{ color: #fff !important;/);
});

test("native iOS uses the selected Appearance icon without an opaque Lock Screen tile", async () => {
    const native = await readFile(new URL("../js/core/native-capabilities.js", import.meta.url), "utf8");
    const appearance = await readFile(new URL("../js/more/appearance-settings.js", import.meta.url), "utf8");
    const info = await readFile(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8");
    const plugin = await readFile(new URL("../ios/App/App/LevelUpAppIconPlugin.swift", import.meta.url), "utf8");
    const timerPlugin = await readFile(new URL("../ios/App/App/LevelUpTimerPlugin.swift", import.meta.url), "utf8");
    const attributes = await readFile(new URL("../ios/App/App/LevelUpTimerAttributes.swift", import.meta.url), "utf8");
    const sceneDelegate = await readFile(new URL("../ios/App/App/SceneDelegate.swift", import.meta.url), "utf8");
    const widget = await readFile(new URL("../ios/App/LevelUpTimerWidget/LevelUpTimerWidget.swift", import.meta.url), "utf8");
    const widgetInfo = await readFile(new URL("../ios/App/LevelUpTimerWidget/Info.plist", import.meta.url), "utf8");
    assert.match(native, /plugin\("Haptics"\)/);
    assert.match(native, /plugin\("LocalNotifications"\)/);
    assert.match(native, /scheduleNativeAlarm/);
    assert.match(native, /HOME_ICON_KEY = "level_up_home_icon"/);
    assert.match(native, /function liveActivityAppearance\(\)/);
    assert.match(native, /icon: liveActivityAppearance\(\)/);
    assert.match(native, /updateNativeAlarm/);
    assert.match(native, /syncNativeRestTimerState/);
    assert.match(appearance, /Choose your Level Up icon/);
    assert.match(appearance, /assets\/home-icons\/\$\{icon\.id\}\.png\?v=2/);
    assert.match(appearance, /LevelUpAppIcon\?\.setIcon/);
    assert.match(info, /CFBundleAlternateIcons/);
    assert.match(plugin, /setAlternateIconName/);

    const iconPairs = [
        ["level-up", "AppIcon.appiconset/AppIcon-512@2x.png"],
        ["arctic", "AppIconArctic.appiconset/AppIconArctic-1024.png"],
        ["pure", "AppIconPure.appiconset/AppIconPure-1024.png"],
        ["ocean", "AppIconOcean.appiconset/AppIconOcean-1024.png"],
        ["midnight", "AppIconMidnight.appiconset/AppIconMidnight-1024.png"],
        ["slate", "AppIconSlate.appiconset/AppIconSlate-1024.png"],
        ["pulse", "AppIconPulse.appiconset/AppIconPulse-1024.png"]
    ];
    for (const [previewName, nativePath] of iconPairs) {
        const preview = await readFile(new URL(`../assets/home-icons/${previewName}.png`, import.meta.url));
        const nativeIcon = await readFile(new URL(`../ios/App/App/Assets.xcassets/${nativePath}`, import.meta.url));
        assert.deepEqual(preview, nativeIcon, `${previewName} preview must exactly match its enlarged native icon`);
    }
    assert.match(sceneDelegate, /LevelUpBridgeViewController/);
    assert.match(timerPlugin, /UNTimeIntervalNotificationTrigger/);
    assert.match(timerPlugin, /level-up-alarm\.wav/);
    assert.match(timerPlugin, /interruptionLevel = \.timeSensitive/);
    assert.match(timerPlugin, /cleanupExpiredLiveActivities/);
    assert.match(timerPlugin, /call\.getString\("theme"\)/);
    assert.match(timerPlugin, /call\.getString\("icon"\)/);
    assert.match(timerPlugin, /CAPPluginMethod\(name: "update"/);
    assert.match(timerPlugin, /CAPPluginMethod\(name: "getState"/);
    assert.match(attributes, /var icon: String/);
    assert.match(attributes, /var workoutName: String/);
    assert.match(attributes, /var exerciseName: String/);
    assert.match(attributes, /struct AdjustLevelUpTimerIntent: LiveActivityIntent/);
    assert.match(attributes, /struct ToggleLevelUpTimerIntent: LiveActivityIntent/);
    assert.match(attributes, /struct SkipLevelUpTimerIntent: LiveActivityIntent/);
    assert.match(widget, /ActivityConfiguration/);
    assert.match(widget, /timerInterval/);
    assert.match(widget, /TimerPalette\.forTheme/);
    assert.match(widget, /timerLogoName\(for icon:/);
    assert.match(widget, /timerLogo\(icon: context\.attributes\.icon/);
    assert.match(widget, /import UIKit/);
    assert.match(widget, /TimerLogoRenderer/);
    assert.match(widget, /UIImage\(named: name\)/);
    assert.match(widget, /removeBackground\(from: source\)/);
    assert.match(widget, /defaultAssetName = "TimerLogoLevelUp"/);
    assert.match(widget, /renderingMode\(\.original\)/);
    assert.match(widget, /UIGraphicsImageRendererFormat/);
    assert.match(widget, /expectedTopR/);
    assert.doesNotMatch(widget, /clipShape\(RoundedRectangle/);
    assert.doesNotMatch(widget, /LevelUpThemeLogo|LevelUpArrow|dumbbell\.fill/);
    assert.match(widget, /timerButton\("−15"/);
    assert.match(widget, /timerButton\("\+15"/);
    assert.match(widget, /"Resume" : "Pause"/);
    assert.match(widget, /timerButton\("Skip"/);
    assert.match(widget, /return context\.attributes\.setNumber > 0 \? "Next:/);
    assert.match(widget, /lineLimit\(2\)\.minimumScaleFactor\(0\.82\)/);
    assert.match(widgetInfo, /CFBundleExecutable/);
    assert.match(info, /NSSupportsLiveActivities/);
    for (const name of ["Arctic", "Pure", "Ocean", "Midnight", "Slate", "Pulse"]) {
        await readFile(new URL(`../ios/App/App/Assets.xcassets/AppIcon${name}.appiconset/AppIcon${name}-1024.png`, import.meta.url));
        await readFile(new URL(`../ios/App/LevelUpTimerWidget/Assets.xcassets/TimerLogo${name}.imageset/Contents.json`, import.meta.url));
    }
    await readFile(new URL("../ios/App/LevelUpTimerWidget/Assets.xcassets/TimerLogoLevelUp.imageset/Contents.json", import.meta.url));
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
