import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const feature = fs.readFileSync("js/dashboard/whats-new.js", "utf8");
const more = fs.readFileSync("js/more/more-ui-v2.js", "utf8");
const router = fs.readFileSync("js/core/router.js", "utf8");
const styles = fs.readFileSync("css/dashboard-whats-new.css", "utf8");
const index = fs.readFileSync("index.html", "utf8");

test("iOS launch announcement appears once for onboarded web users and stays in More", () => {
    assert.match(feature, /level_up_whats_new_ios_launch_2026_09_views/);
    assert.match(feature, /const MAX_VIEWS = 1/);
    assert.match(feature, /if \(isNativeIOS\(\) \|\| !isOnboarded\(\)\) return false/);
    assert.match(feature, /onboardingComplete \|\| preferences\?\.onboardingSkipped/);
    assert.match(feature, /if \(getStoredViews\(\) >= MAX_VIEWS\) return false/);
    assert.match(more, /data-more-page="ios-transfer"/);
    assert.match(more, /openWhatsNew\(\)/);
    assert.match(router, /showWhatsNewIfEligible/);
});

test("transfer guide matches the actual backup and code flow", () => {
    assert.match(feature, /apps\.apple\.com\/ca\/app\/level-up-workout-nutrition\/id6810024008/);
    assert.match(feature, /Exports &amp; Backup → Export Backup/);
    assert.match(feature, /Account &amp; Cloud/);
    assert.match(feature, /Back Up Now/);
    assert.match(feature, /Generate Transfer Code/);
    assert.match(feature, /Already use Level Up on the web\?/);
    assert.match(feature, /within 10 minutes/);
    assert.match(feature, /confirm your recent workouts, weight entries, nutrition log and plans/);
    assert.match(feature, /Generating a code alone does not upload unsynced entries/);
});

test("guide is readable in app themes and its fresh assets are loaded", () => {
    assert.match(styles, /background: var\(--body-background\)/);
    assert.match(styles, /whats-new-transfer/);
    assert.match(styles, /whats-new-steps/);
    assert.match(index, /dashboard-whats-new\.css\?v=ios-launch-guide-1/);
    assert.match(index, /js\/app\.js\?v=[^"']*ios-launch-guide-1/);
});
