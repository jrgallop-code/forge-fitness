import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const styles = fs.readFileSync('css/theme-surface-audit.css', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

test('theme surface audit loads after the appearance stylesheet', () => {
  const appearance = html.indexOf('css/appearance-themes.css');
  const audit = html.indexOf('css/theme-surface-audit.css?v=theme-surface-audit-1');
  assert.ok(appearance >= 0);
  assert.ok(audit > appearance);
});

test('native iOS surfaces resolve through semantic theme tokens', () => {
  assert.match(styles, /--ios-surface-1:\s*var\(--card\)/);
  assert.match(styles, /--ios-surface-2:\s*var\(--surface-raised\)/);
  assert.match(styles, /--ios-surface-3:\s*var\(--input-bg\)/);
  assert.match(styles, /--ios-separator:\s*var\(--line\)/);
});

test('inactive navigation and segmented-control SVGs use the muted theme color', () => {
  assert.match(styles, /\.bottom-nav \.nav-btn:not\(\.active\) \.nav-icon/);
  assert.match(styles, /\.progress-tab:not\(\.active\) \.app-inline-icon/);
  assert.match(styles, /color:\s*var\(--theme-icon-muted\)\s*!important/);
});

test('light-theme anatomy SVGs use a darker neutral base', () => {
  assert.match(styles, /data-theme-mode="light"\] \.form-guide-anatomy-base/);
  assert.match(styles, /filter:\s*brightness\(\.68\) contrast\(1\.16\)\s*!important/);
  assert.match(styles, /\.recovery-user-muscle-base-fill/);
  assert.match(styles, /fill:\s*color-mix\(in srgb, var\(--text\) 58%, var\(--surface\)\)\s*!important/);
});

test('snapshot cards, selected tabs and analytics ranges are theme semantic', () => {
  assert.match(styles, /\.training-progress-disclosure-panel/);
  assert.match(styles, /background:\s*var\(--surface-raised\)\s*!important/);
  assert.match(styles, /\.training-progress-tab\.active/);
  assert.match(styles, /button\[aria-pressed="true"\]/);
  assert.match(styles, /background:\s*var\(--accent-soft\)\s*!important/);
});

test('theme surface release advances the offline cache', () => {
  assert.match(worker, /2026-09-01-102/);
});
