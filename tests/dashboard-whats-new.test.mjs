import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = p => fs.readFileSync(p,'utf8');
const feature = read('js/dashboard/whats-new.js');
const styles = read('css/dashboard-whats-new.css');
const router = read('js/core/router.js');
const menu = read('js/more/more-ui-v2.js');
const index = read('index.html');

test("iOS release notes are versioned, once per version, and native-only", () => {
  assert.match(feature, /RELEASE_VERSION = "1\.0\.6"/);
  assert.match(feature, /level_up_whats_new_seen_ios_/);
  assert.match(feature, /const MAX_VIEWS = 1/);
  assert.match(feature, /window\.Capacitor\?\.getPlatform\?\.\(\) === "ios"/);
  assert.match(feature, /if \(!isIOS\(\)\) return false/);
  assert.match(feature, /if \(!force && \(!isOnboarded\(\) \|\| alreadySeen\(\)\)\) return false/);
  assert.match(feature, /markSeen\(\)/);
  assert.match(feature, /aria-modal/);
  assert.match(feature, /data-whats-new-close/);
});

test("release page uses true iOS features and an authentic CSS Quick Log preview", () => {
  for (const heading of ['What\\\'s New','Apple Health integration','Meet Quick Log','Better active workouts','A smoother experience']) {
    assert.ok(feature.includes(heading), heading);
  }
  assert.match(feature, /View your steps and sleep from Apple Health/);
  assert.match(feature, /logging workouts, food, and nutrition/);
  assert.match(feature, /Smart Build, manual workouts, imports, and photo logging/);
  assert.match(feature, /whats-new-plus/);
  assert.match(styles, /\.whats-new-preview-action/);
  assert.doesNotMatch(feature, /https?:\/\//);
  assert.doesNotMatch(feature, /<img/);
});

test("iOS entry is automatic on dashboard and reviewable from More", () => {
  assert.match(router,/showWhatsNewIfEligible/);
  assert.equal((router.match(/safeInitialize\("What's New", showWhatsNewIfEligible\)/g) || []).length,2);
  assert.match(menu,/data-more-page="whats-new-release"/);
  assert.match(menu,/openWhatsNew\(\{ force: true \}\)/);
  assert.match(index,/dashboard-whats-new\.css\?v=ios-release-notes-106/);
  assert.match(router,/whats-new\.js\?v=ios-release-notes-106/);
});
