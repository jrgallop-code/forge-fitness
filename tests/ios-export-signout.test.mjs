import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("iOS JSON backup export opens the native share and save sheet", async () => {
    const [backupManager, nativeCapabilities, bridge, project, plugin] = await Promise.all([
        read("js/core/backup-manager.js"),
        read("js/core/native-capabilities.js"),
        read("ios/App/App/LevelUpBridgeViewController.swift"),
        read("ios/App/App.xcodeproj/project.pbxproj"),
        read("ios/App/App/LevelUpFileExportPlugin.swift")
    ]);

    assert.match(backupManager, /shareNativeJsonFile\(\{ content: json, filename \}\)/);
    assert.ok(backupManager.indexOf("shareNativeJsonFile({ content: json, filename })") < backupManager.indexOf("URL.createObjectURL(blob)"));
    assert.match(nativeCapabilities, /plugin\("LevelUpFileExport"\)/);
    assert.match(bridge, /registerPluginInstance\(LevelUpFileExportPlugin\(\)\)/);
    assert.match(project, /LevelUpFileExportPlugin\.swift in Sources/);
    assert.match(plugin, /UIActivityViewController\(activityItems: \[fileURL\]/);
});

test("native sign-out clears guest mode and immediately reloads into the login gate", async () => {
    const account = await read("js/more/account-cloud-ui.js");
    const nativeBranch = account.match(/if \(isNativeIOS\(\)\) \{([\s\S]*?)\n    \}/)?.[1] || "";

    assert.match(nativeBranch, /clearSession\(\{ requireLogin: true \}\)/);
    assert.match(nativeBranch, /await clearLocalAppData\(\{ preserveDevicePreferences: true \}\)/);
    assert.match(nativeBranch, /window\.location\.reload\(\)/);
    assert.match(account, /if \(requireLogin\) localStorage\.removeItem\(GUEST_MODE_KEY\)/);
});

test("native account switching clears old local records before restoring the new account", async () => {
    const [login, backup] = await Promise.all([
        read("js/account/first-launch-login.js"),
        read("js/core/backup-manager.js")
    ]);

    assert.match(login, /async function restoreNativeAccountBackup\(token\)/);
    assert.match(login, /await clearLocalAppData\(\{ preserveDevicePreferences: true \}\);\s*await restoreBackupSnapshot\(payload\.backup/s);
    assert.match(login, /await restoreNativeAccountBackup\(payload\.token\);\s*saveSession\(payload\)/s);
    assert.match(backup, /export async function clearLocalAppData/);
    assert.match(backup, /"level_up_appearance_settings"/);
    assert.match(backup, /"level_up_home_icon"/);
    assert.match(backup, /await provider\.importData\(\[\]\)/);
});
