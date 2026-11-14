import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = path => fs.readFileSync(path, "utf8");
const native = read("ios/App/App/LevelUpBridgeViewController.swift");
const ui = read("js/health/apple-health.js");
const sleep = read("js/progress/sleep-tracker.js");
const onboarding = read("js/onboarding/onboarding.js");
const entitlements = read("ios/App/App/App.entitlements");
const plist = read("ios/App/App/Info.plist");
const signer = read("scripts/app-store-signing.mjs");

test("Apple Health capability is added to fresh signing profiles", () => {
    assert.match(entitlements, /com\.apple\.developer\.healthkit/);
    assert.match(plist, /NSHealthShareUsageDescription/);
    assert.match(signer, /ensureBundleCapability\(bundleId, 'HEALTHKIT'\)/);
});
test("native HealthKit reads steps and sleep without requesting write authorization", () => {
    assert.match(native, /registerPluginInstance\(LevelUpHealthKitPlugin\(\)\)/);
    assert.match(native, /HKStatisticsCollectionQuery/);
    assert.match(native, /HKSampleQuery/);
    assert.match(native, /requestAuthorization\(toShare: \[\], read: readTypes\)/);
    assert.match(native, /\[1, 3, 4, 5\]\.contains\(sample\.value\)/);
});
test("Sleep is read-only and keeps historical manual data untouched", () => {
    assert.match(sleep, /renderAppleSleepTracker\(\)/);
    assert.match(sleep, /initializeAppleSleepTracker\(\)/);
    assert.doesNotMatch(ui, /localStorage\.setItem\(["']level_up_sleep_entries/);
    assert.match(ui, /No manual entry/);
});
test("onboarding and More include Apple Health connection", () => {
    assert.match(onboarding, /"apple-health"/);
    assert.match(onboarding, /data-apple-health-connect/);
    assert.match(ui, /dataset\.appleHealthSettings/);
    assert.match(ui, /data-apple-health-open-steps/);
});
