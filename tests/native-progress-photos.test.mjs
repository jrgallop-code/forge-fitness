import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const journal = fs.readFileSync("js/progress/photo-journal.js", "utf8");
const progress = fs.readFileSync("js/progress/cardio-analytics.js", "utf8");
const plugin = fs.readFileSync("ios/App/App/LevelUpProgressPhotosPlugin.swift", "utf8");
const providers = fs.readFileSync("js/core/backup-providers.js", "utf8");

test("progress photos are shown only in the native iOS progress navigation", () => {
    assert.match(progress, /isNativeIos\(\) && photoButton/);
    assert.match(progress, /📷 Photos/);
    assert.match(progress, /tabs\.insertBefore\(photoButton, nutritionButton\.nextElementSibling\)/);
    assert.match(progress, /photoButton\?\.remove\(\)/);
});

test("native progress photos use protected account-isolated files excluded from backup", () => {
    assert.match(plugin, /FileProtectionType\.complete/);
    assert.match(plugin, /completeFileProtection/);
    assert.match(plugin, /isExcludedFromBackup = true/);
    assert.match(plugin, /SHA256\.hash/);
    assert.match(journal, /LevelUpProgressPhotos/);
    assert.match(journal, /getAllLegacyPhotos/);
    assert.doesNotMatch(providers, /LevelUpProgressPhotos/);
});
