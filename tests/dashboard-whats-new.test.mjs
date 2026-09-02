import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const feature = fs.readFileSync('js/dashboard/whats-new.js', 'utf8');
const styles = fs.readFileSync('css/dashboard-whats-new.css', 'utf8');
const router = fs.readFileSync('js/core/router.js', 'utf8');
const app = fs.readFileSync('js/app.js', 'utf8');
const navbar = fs.readFileSync('js/components/navbar.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

test("What's New is a versioned dashboard dialog limited to two views", () => {
  assert.match(feature, /level_up_whats_new_2026_09_views/);
  assert.match(feature, /const MAX_VIEWS = 2/);
  assert.match(feature, /if \(views >= MAX_VIEWS\) return false/);
  assert.match(feature, /const nextView = views \+ 1/);
  assert.match(feature, /storeViews\(nextView\)/);
  assert.match(feature, /role", "dialog/);
  assert.match(feature, /aria-modal", "true/);
  assert.match(feature, /data-whats-new-close/);
  assert.match(feature, /aria-label="Close What's New"/);
  assert.match(feature, /event\.key === "Escape"/);
});

test("What's New summarizes the major user-facing improvements", () => {
  [
    'Make Level Up yours',
    'Explore the research',
    'Programs built around you',
    'See progress more clearly',
    'Understand weight changes',
    'Smoother workouts and form guides'
  ].forEach(heading => assert.match(feature, new RegExp(heading)));
  assert.match(feature, /System mode now follows your local day and night/);
  assert.match(feature, /estimated 1RM/);
  assert.match(feature, /Smart Swap/);
});

test("What's New waits until sign-in and onboarding are complete", () => {
  assert.match(feature, /level_up_cloud_session/);
  assert.match(feature, /level_up_training_preferences/);
  assert.match(feature, /if \(!signedIn\) return false/);
  assert.match(feature, /onboardingComplete \|\| preferences\?\.onboardingSkipped/);
  assert.match(feature, /if \(!isSignedInAndOnboarded\(\)\) return false/);
});

test("What's New runs before the satisfaction survey on dashboard routes", () => {
  assert.match(router, /showWhatsNewIfEligible/);
  assert.equal((router.match(/safeInitialize\("What's New", showWhatsNewIfEligible\)/g) || []).length, 2);
  assert.match(router, /if \(!safeInitialize\("What's New", showWhatsNewIfEligible\)\) \{\s*safeInitialize\("Satisfaction survey"/);
  assert.match(router, /function safeInitialize\(name, initializer\) \{ try \{ return initializer\(\)/);
});

test("What's New uses theme tokens and production cache keys", () => {
  assert.match(styles, /background: var\(--body-background\)/);
  assert.match(styles, /background: var\(--card\)/);
  assert.match(styles, /color: var\(--heading\) !important/);
  assert.match(styles, /color: var\(--text-secondary\) !important/);
  assert.match(index, /dashboard-whats-new\.css\?v=whats-new-1/);
  assert.match(index, /js\/app\.js\?v=research-journal-cleanup-1/);
  assert.match(app, /router\.js\?v=research-journal-cleanup-1/);
  assert.match(app, /navbar\.js\?v=first-launch-cleanup-1/);
  assert.match(navbar, /router\.js\?v=first-launch-cleanup-1/);
});
