import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const audit = readFileSync(new URL("../css/theme-surface-audit.css", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

test("saved-meal builder action cards use the selected appearance surfaces", () => {
  assert.match(audit, /\.food-builder-photo > \[data-meal-photo-pick\], \.food-builder-add/);
  assert.match(audit, /background: var\(--surface-raised\) !important/);
  assert.match(audit, /color: var\(--accent-text\) !important/);
});

test("expanded meal ingredients cannot restore fixed dark controls", () => {
  assert.match(audit, /\.food-builder-item-details\[open\] > summary/);
  assert.match(audit, /\.food-builder-paste\[open\] > summary/);
  assert.match(audit, /\.food-builder-item-editor select, \.food-builder-item-editor input/);
  assert.match(audit, /background: var\(--input-bg\) !important/);
  assert.match(audit, /button:not\(\.primary-btn\)/);
});

test("meal-builder appearance correction is cache-busted", () => {
  assert.match(index, /css\/theme-surface-audit\.css\?v=theme-surface-audit-12/);
  assert.match(worker, /2026-09-02-133/);
});
