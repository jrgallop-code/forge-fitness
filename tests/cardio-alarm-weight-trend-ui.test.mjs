import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const cardioCss = await readFile(new URL("../css/logger-cardio-timer.css", import.meta.url), "utf8");
const workoutCss = await readFile(new URL("../css/workout-mode.css", import.meta.url), "utf8");
const navCss = await readFile(new URL("../css/navbar-stability.css", import.meta.url), "utf8");
const loader = await readFile(new URL("../js/nutrition/single-calorie-target-ui.js", import.meta.url), "utf8");

function zIndex(source, selector) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = source.match(new RegExp(`${escaped}\\s*\\{[\\s\\S]*?z-index\\s*:\\s*(\\d+)`, "m"));
    return match ? Number(match[1]) : null;
}

test("cardio alarm surfaces sit above the active workout and bottom navigation", () => {
    const sheet = zIndex(cardioCss, ".cardio-alarm-sheet-overlay");
    const banner = zIndex(cardioCss, "#level-up-cardio-alarm-banner");
    const workout = zIndex(workoutCss, "#levelup-workout-mode");
    const nav = zIndex(navCss, ".bottom-nav");
    assert.ok(Number.isFinite(sheet) && Number.isFinite(banner) && Number.isFinite(workout) && Number.isFinite(nav));
    assert.ok(sheet > workout, `alarm sheet ${sheet} must be above workout ${workout}`);
    assert.ok(sheet > nav, `alarm sheet ${sheet} must be above nav ${nav}`);
    assert.ok(banner > workout, `alarm banner ${banner} must be above workout ${workout}`);
    assert.ok(banner > nav, `alarm banner ${banner} must be above nav ${nav}`);
});

test("trend smoothing loads before the authoritative viewport renderer", () => {
    const smoothIndex = loader.indexOf("weight-trend-canvas-smoothing.js");
    const viewportIndex = loader.indexOf("analytics-chart-zoom.js");
    assert.ok(smoothIndex >= 0);
    assert.ok(viewportIndex > smoothIndex);
});

test("weight viewport trend stroke is curved without changing other canvas strokes", async () => {
    const calls = [];
    class MockContext {
        constructor(kind = "weight") {
            this.canvas = { dataset: { analyticsViewportChart: kind } };
            this.lineWidth = 3;
            this.lineCap = "round";
            this.lineJoin = "round";
            this.shadowBlur = 7;
        }
        beginPath() { calls.push(["begin"]); }
        moveTo(x, y) { calls.push(["move", x, y]); }
        lineTo(x, y) { calls.push(["line", x, y]); }
        quadraticCurveTo(...args) { calls.push(["quad", ...args]); }
        stroke() { calls.push(["stroke"]); }
    }
    globalThis.CanvasRenderingContext2D = MockContext;
    delete globalThis.__levelUpWeightTrendCanvasSmoothingV1;
    await import(`../js/progress/weight-trend-canvas-smoothing.js?test=${Date.now()}`);

    const trend = new MockContext("weight");
    trend.beginPath();
    trend.moveTo(0, 10);
    trend.lineTo(10, 7);
    trend.lineTo(20, 9);
    trend.lineTo(30, 6);
    trend.stroke();
    assert.ok(calls.some(call => call[0] === "quad"), "trend stroke should use quadratic curves");

    calls.length = 0;
    const raw = new MockContext("weight");
    raw.lineWidth = 1.4;
    raw.shadowBlur = 0;
    raw.beginPath();
    raw.moveTo(0, 10);
    raw.lineTo(10, 7);
    raw.lineTo(20, 9);
    raw.stroke();
    assert.equal(calls.some(call => call[0] === "quad"), false, "raw weight line must stay unsmoothed");
});
