import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(file, "utf8");
const quick = read("js/core/pwa-quick-log.js");
const release = read("js/dashboard/pwa-release-notes.js");
const app = read("js/app.js");
const router = read("js/core/router.js");
const more = read("js/more/more-ui-v2.js");
const index = read("index.html");
const sw = read("service-worker.js");

test("PWA Quick Log is installed without a native Capacitor dependency", () => {
  assert.match(quick, /const isPWA = \(\) => !window\.Capacitor\?\.isNativePlatform/);
  assert.match(quick, /export function initializePWAQuickLog/);
  assert.match(app, /initializePWAQuickLog\(\)/);
  assert.match(index, /css\/pwa-quick-log\.css/);
  assert.match(quick, /data-ql-action="workout"/);
  assert.match(quick, /data-ql-action="weight"/);
  assert.match(quick, /data-ql-action="photos"/);
  assert.match(quick, /isNutritionEnabled\(\)/);
  assert.match(quick, /data-ql-workout="smart"/);
  assert.match(quick, /data-ql-workout="manual"/);
  assert.match(quick, /data-ql-workout="import"/);
});
test("PWA photos shortcut targets photos, not progress overview", () => {
  assert.match(quick, /document\.getElementById\("photo-log-tab"\)\?\.click\(\)/);
});
test("PWA What's New is distinct from iPhone transfer guide", () => {
  assert.match(release, /RELEASE_VERSION = "2026\.11"/);
  assert.match(release, /level_up_whats_new_seen_pwa_/);
  assert.match(release, /Apple Health integration \(iOS only\)/);
  assert.match(release, /not the web version/);
  assert.match(release, /Meet Quick Log/);
  assert.match(router, /showPWAReleaseIfEligible/);
  assert.match(more, /data-more-page="pwa-release-notes"/);
  assert.match(more, /data-more-page="ios-transfer"/);
  assert.match(index, /css\/pwa-release-notes\.css/);
  assert.match(sw, /pwa-quick-log-whats-new-20261119/);
});
