import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const styles = fs.readFileSync('css/first-launch-login.css', 'utf8');
const login = fs.readFileSync('js/account/first-launch-login.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

test('Google login crops the provider iframe to its dark pill', () => {
  assert.match(styles, /\.level-up-login-google \{[^}]*height: 44px/);
  assert.match(styles, /overflow: hidden/);
  assert.match(styles, /border-radius: 999px/);
  assert.match(styles, /\.level-up-login-google iframe \{[^}]*display: block !important/);
});

test('native login uses the live Google handoff and protected high-contrast colors', () => {
  assert.match(login, /https:\/\/app\.leveluphypertrophy\.com\/ios-auth\.html/);
  assert.doesNotMatch(login, /url: "https:\/\/leveluphypertrophy\.com\/ios-auth\.html"/);
  assert.match(styles, /level-up-login-google-native\{background:#050505!important;color:#fff!important/);
  assert.match(styles, /-webkit-text-fill-color:\s*#fff\s*!important/);
});

test('login presentation ships with fresh production cache keys', () => {
  assert.match(login, /first-launch-login\.css\?v=app-review-login-1/);
  assert.match(index, /first-launch-login\.js\?v=native-auth-contrast-2/);
  assert.match(worker, /2026-09-09-291/);
});

test('email sign-in hides and disables confirmation while signup requires it', () => {
  assert.match(styles, /\.level-up-email-confirm\[hidden\] \{ display: none !important; \}/);
  assert.match(login, /id="level-up-email-confirm"[^>]*disabled/);
  assert.match(login, /confirmationRow\.hidden = !creating/);
  assert.match(login, /confirmation\.required = creating/);
  assert.match(login, /confirmation\.disabled = !creating/);
  assert.match(login, /if \(!creating\) confirmation\.value = ""/);
});
