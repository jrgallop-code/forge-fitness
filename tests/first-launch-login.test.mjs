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

test('Google login crop ships with fresh production cache keys', () => {
  assert.match(login, /first-launch-login\.css\?v=google-button-crop-2/);
  assert.match(index, /first-launch-login\.js\?v=google-button-crop-2/);
  assert.match(worker, /2026-09-02-140/);
});
