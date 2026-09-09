import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("first launch offers a real local mode and contains no prerelease labels", async () => {
    const [login, more, account, adaptive, recap] = await Promise.all([
        read("js/account/first-launch-login.js"),
        read("js/more/more-ui-v2.js"),
        read("js/more/account-cloud-ui.js"),
        read("js/more/adaptive-guidance-settings.js"),
        read("js/workouts/workout-complete-recap.js")
    ]);
    assert.match(login, /GUEST_MODE_KEY = "level_up_guest_mode"/);
    assert.match(login, /Continue without an account/);
    assert.match(login, /isGuestMode\(\)/);
    assert.match(account, /Sign In or Create an Account/);
    for (const source of [login, more, account, adaptive, recap]) {
        assert.doesNotMatch(source, />[^<]*(?:BETA|Coming soon)[^<]*</i);
    }
});

test("optional analytics remain off until explicit consent and can be changed later", async () => {
    const [consent, acquisition, productState, activity, account] = await Promise.all([
        read("js/privacy/analytics-consent.js"),
        read("js/analytics/acquisition.js"),
        read("js/analytics/product-state.js"),
        read("js/account/cloud-background-sync.js"),
        read("js/more/account-cloud-ui.js")
    ]);
    assert.match(consent, /analyticsConsentChoice\(\) !== "unset"/);
    assert.match(consent, /Share Optional Analytics/);
    assert.match(consent, /No Thanks/);
    assert.match(acquisition, /if\(!analyticsAllowed\(\)\)return false/);
    assert.match(productState, /if \(!analyticsAllowed\(\)\) return false/);
    assert.match(activity, /if \(!analyticsAllowed\(\) \|\| authBlocked/);
    assert.match(account, /id="account-analytics-consent"/);
    assert.match(account, /setAnalyticsConsent\(allowed\)/);
});

test("the privacy policy is bundled for offline and native access", async () => {
    const [policy, build, worker] = await Promise.all([
        read("privacy.html"),
        read("tools/build-native.mjs"),
        read("service-worker.js")
    ]);
    assert.match(policy, /core features without an account/i);
    assert.match(policy, /Account-linked analytics are off until you choose/i);
    assert.match(build, /"privacy\.html"/);
    assert.match(worker, /"\.\/privacy\.html"/);
});

test("Apple authorization is retained securely and revoked before account deletion", async () => {
    const [plugin, worker, migration, operations] = await Promise.all([
        read("ios/App/App/LevelUpNativeAuthPlugin.swift"),
        read("cloud/src/index.js"),
        read("cloud/migrations/0019_apple_credentials.sql"),
        read("cloud/OPERATIONS.md")
    ]);
    assert.match(plugin, /credential\.authorizationCode/);
    assert.match(plugin, /"authorizationCode": authorizationCode/);
    assert.match(worker, /exchangeAppleAuthorizationCode\(authorizationCode, env\)/);
    assert.match(worker, /https:\/\/appleid\.apple\.com\/auth\/revoke/);
    assert.match(worker, /await revokeStoredAppleCredential\(user\.id, env\)/);
    assert.match(worker, /AES-GCM/);
    assert.match(migration, /CREATE TABLE IF NOT EXISTS apple_credentials/);
    assert.match(operations, /APPLE_TOKEN_ENCRYPTION_KEY/);
});
