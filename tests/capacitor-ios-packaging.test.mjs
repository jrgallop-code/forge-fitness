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

test("native iOS offers Apple, Google, email, and existing-account transfer", async () => {
    const login = await readFile(new URL("../js/account/first-launch-login.js", import.meta.url), "utf8");
    const account = await readFile(new URL("../js/more/account-cloud-ui.js", import.meta.url), "utf8");
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
});

test("native iOS provides haptics, background alarms, selectable app icons, and a theme-aware Live Activity logo", async () => {
    const native = await readFile(new URL("../js/core/native-capabilities.js", import.meta.url), "utf8");
    const appearance = await readFile(new URL("../js/more/appearance-settings.js", import.meta.url), "utf8");
    const info = await readFile(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8");
    const plugin = await readFile(new URL("../ios/App/App/LevelUpAppIconPlugin.swift", import.meta.url), "utf8");
    const timerPlugin = await readFile(new URL("../ios/App/App/LevelUpTimerPlugin.swift", import.meta.url), "utf8");
    const sceneDelegate = await readFile(new URL("../ios/App/App/SceneDelegate.swift", import.meta.url), "utf8");
    const widget = await readFile(new URL("../ios/App/LevelUpTimerWidget/LevelUpTimerWidget.swift", import.meta.url), "utf8");
    const widgetInfo = await readFile(new URL("../ios/App/LevelUpTimerWidget/Info.plist", import.meta.url), "utf8");
    assert.match(native, /plugin\("Haptics"\)/);
    assert.match(native, /plugin\("LocalNotifications"\)/);
    assert.match(native, /scheduleNativeAlarm/);
    assert.match(appearance, /Choose your Level Up icon/);
    assert.match(appearance, /LevelUpAppIcon\?\.setIcon/);
    assert.match(info, /CFBundleAlternateIcons/);
    assert.match(plugin, /setAlternateIconName/);
    assert.match(sceneDelegate, /LevelUpBridgeViewController/);
    assert.match(timerPlugin, /UNTimeIntervalNotificationTrigger/);
    assert.match(timerPlugin, /level-up-alarm\.wav/);
    assert.match(timerPlugin, /interruptionLevel = \.timeSensitive/);
    assert.match(timerPlugin, /CAPPluginMethod\(name: "finish"/);
    assert.match(timerPlugin, /endLiveActivities\(key: key\)/);
    assert.match(timerPlugin, /call\.getString\("theme"\)/);
    assert.match(timerPlugin, /call\.getString\("liveActivityTitle"\) \?\? title/);
    assert.match(timerPlugin, /call\.getString\("liveActivityDetail"\) \?\? body/);
    assert.match(widget, /ActivityConfiguration/);
    assert.match(widget, /timerInterval/);
    assert.match(widget, /timerLogo\(/);
    assert.match(widget, /restControls/);
    assert.match(widget, /TimerPalette\.forTheme/);
    assert.match(widget, /TimerLogoRenderer/);
    assert.match(widgetInfo, /CFBundleExecutable/);
    assert.match(info, /NSSupportsLiveActivities/);
    for (const name of ["Arctic", "Pure", "Ocean", "Midnight", "Slate", "Pulse"]) {
        await readFile(new URL(`../ios/App/App/Assets.xcassets/AppIcon${name}.appiconset/AppIcon${name}-1024.png`, import.meta.url));
    }
});

test("native iOS packages reliable arcade audio and enables audible playback", async () => {
    const appDelegate = await readFile(new URL("../ios/App/App/AppDelegate.swift", import.meta.url), "utf8");
    const bridge = await readFile(new URL("../ios/App/App/LevelUpBridgeViewController.swift", import.meta.url), "utf8");
    const plugin = await readFile(new URL("../ios/App/App/LevelUpArcadeAudioPlugin.swift", import.meta.url), "utf8");
    const project = await readFile(new URL("../ios/App/App.xcodeproj/project.pbxproj", import.meta.url), "utf8");
    assert.match(appDelegate, /import AVFoundation/);
    assert.match(appDelegate, /setCategory\(\.playback, mode: \.default, options: \[\.mixWithOthers\]\)/);
    assert.match(appDelegate, /setActive\(true\)/);
    assert.match(bridge, /registerPluginInstance\(LevelUpArcadeAudioPlugin\(\)\)/);
    assert.match(plugin, /let jsName = "LevelUpArcadeAudio"/);
    assert.match(plugin, /AVAudioPlayer\(contentsOf: url\)/);
    assert.match(plugin, /subdirectory: "public\/assets\/audio\/arcade"/);
    assert.match(plugin, /player\.numberOfLoops = loop \? -1 : 0/);
    assert.match(project, /LevelUpArcadeAudioPlugin\.swift in Sources/);
    for (const name of [
        "helicopter-rotor",
        "damage-grunt-1",
        "damage-grunt-2",
        "damage-grunt-3",
        "game-over-scream",
        "whey-shot"
    ]) {
        await readFile(new URL(`../assets/audio/arcade/${name}.wav`, import.meta.url));
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

test("native iOS packages machine profiles without location lookup", async () => {
    const [session, profileUi, profileStyles, iosFixStyles] = await Promise.all([
        readFile(new URL("../js/workouts/workout-session.js", import.meta.url), "utf8"),
        readFile(new URL("../js/workouts/machine-profile-ui.js", import.meta.url), "utf8"),
        readFile(new URL("../css/machine-profile.css", import.meta.url), "utf8"),
        readFile(new URL("../css/machine-profile-ios-fix.css", import.meta.url), "utf8")
    ]);
    assert.match(session, /machine-profile-ui\.js/);
    assert.doesNotMatch(profileUi, /Use location/);
    assert.doesNotMatch(profileUi, /navigator\.geolocation/);
    assert.match(profileUi, /GoodLife Penhorn/);
    assert.match(profileStyles, /machine-profile-sheet/);
    assert.match(profileUi, /formButton\.nextElementSibling !== button/);
    assert.match(profileUi, /observer\.observe\(document\.body/);
    assert.match(profileUi, /#workout-session-logger, \.session-exercise-card, \.logger-form-guide-btn/);
    assert.match(iosFixStyles, /machine-profile-open \.bottom-nav/);
    assert.match(iosFixStyles, /z-index: 40000/);
    assert.match(iosFixStyles, /position: sticky/);
    assert.match(session, /getSavedSessions\(\)[\s\S]*sort\(compareSessionsNewest\)[\s\S]*equipmentProfileId/);
});


test("native iOS packages adaptive monthly reports and classic PDF export", async () => {
    const report = await readFile(new URL("../js/progress/monthly-report.js", import.meta.url), "utf8");
    const styles = await readFile(new URL("../css/monthly-report.css", import.meta.url), "utf8");
    const router = await readFile(new URL("../js/core/router.js", import.meta.url), "utf8");
    const native = await readFile(new URL("../js/core/native-capabilities.js", import.meta.url), "utf8");
    const exporter = await readFile(new URL("../ios/App/App/LevelUpFileExportPlugin.swift", import.meta.url), "utf8");

    assert.match(report, /level_up_monthly_report_snapshots_v1/);
    assert.match(report, /weight\.available/);
    assert.match(report, /nutrition\.available/);
    assert.match(report, /calculateVisibleWeightTrend/);
    assert.match(report, /calculateTrendWeightSeries/);
    assert.match(report, /drawSharedWeightTrendChart/);
    assert.match(report, /getEnergyBalanceState/);
    assert.match(report, /drawSharedCalorieExpenditureChart/);
    assert.match(report, /getAnatomyConfig/);
    assert.match(report, /data-report-tab/);
    assert.doesNotMatch(report, /data-report-jump/);
    assert.doesNotMatch(report, /renderEffortCardio/);
    assert.match(report, /recommendations/);
    assert.match(report, /Keep doing/);
    assert.match(report, /#e51b26/);
    assert.match(report, /background:#fff/);
    assert.match(report, /shareNativePdfFile/);
    assert.match(report, /Previous Reports/);
    assert.match(styles, /monthly-report-entry-card/);
    assert.match(styles, /monthly-report-screen/);
    assert.match(router, /initializeMonthlyReports/);
    assert.match(router, /initializeMonthlyReportDashboardPrompt/);
    assert.match(native, /shareNativePdfFile/);
    assert.match(native, /shareNativeImageFile/);
    assert.match(exporter, /CAPPluginMethod\(name: "sharePdf"/);
    assert.match(exporter, /CAPPluginMethod\(name: "shareImage"/);
    assert.match(exporter, /import WebKit/);
    assert.match(exporter, /LevelUpPDFWebJob/);
    assert.match(exporter, /WKWebViewConfiguration/);
    assert.match(exporter, /loadHTMLString/);
    assert.match(exporter, /viewPrintFormatter/);
    assert.doesNotMatch(exporter, /UIMarkupTextPrintFormatter/);
    assert.match(exporter, /LevelUpPDFPageRenderer/);
    assert.match(exporter, /override var paperRect/);
    assert.match(exporter, /override var printableRect/);
    assert.doesNotMatch(exporter, /setValue\(NSValue\(cgRect: paperRect\), forKey: "paperRect"\)/);
    assert.doesNotMatch(exporter, /setValue\(NSValue\(cgRect: printableRect\), forKey: "printableRect"\)/);
    assert.match(exporter, /UIGraphicsBeginPDFContextToData/);
    assert.match(exporter, /prepare\(forDrawingPages:/);
    assert.doesNotMatch(report, /monthly-report-head-actions/);
    assert.match(report, /level-up-mark-transparent\.svg/);
    assert.doesNotMatch(report, /level-up-logo\.svg/);
    assert.match(report, /WEEKLY VOLUME/);
    assert.match(report, /Weekly Muscle Volume/);
    assert.match(styles, /--muscle-set-accent/);
});
