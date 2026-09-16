import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const progressUi = await readFile(new URL("../js/progress/progress-ui.js", import.meta.url), "utf8");
const layout = await readFile(new URL("../css/progress-edge-layout.css", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("Progress uses a dedicated near-edge mobile layout", () => {
    assert.match(progressUi, /section-card progress-page/);
    assert.match(layout, /#content:has\(> \.progress-page\)/);
    assert.match(layout, /padding-left:\s*max\(6px, env\(safe-area-inset-left\)\)/);
    assert.match(layout, /#content > \.progress-page\.section-card/);
    assert.match(layout, /padding:\s*17px 6px/);
});

test("the Progress edge layout is loaded after the shared theme styles", () => {
    const themeIndex = index.indexOf("css/theme-surface-audit.css");
    const edgeIndex = index.indexOf("css/progress-edge-layout.css?v=progress-edge-cards-1");
    assert.ok(themeIndex >= 0);
    assert.ok(edgeIndex > themeIndex);
});
