import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateGoalTimeline } from "../js/core/goal-timeline.js";

const dashboard = await readFile(new URL("../js/dashboard/dashboard-goal-timeline.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../css/goal-timeline.css", import.meta.url), "utf8");
const serviceWorker = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("goal timeline uses remaining weight divided by the selected weekly rate", () => {
    const timeline = calculateGoalTimeline({
        startWeight: 180,
        currentWeight: 182.4,
        goalWeight: 190,
        selectedRateLbPerWeek: 0.25,
        today: new Date("2026-09-12T12:00:00")
    });

    assert.equal(timeline.status, "scheduled");
    assert.equal(timeline.weeks, 31);
    assert.equal(timeline.estimatedDate, "2027-04-13");
    assert.equal(Math.round(timeline.percent), 24);
    assert.ok(Math.abs(timeline.remainingLb - 7.6) < 0.0001);
});

test("goal timeline handles fat loss, maintenance, reached goals, and a mismatched rate", () => {
    const cut = calculateGoalTimeline({ startWeight: 200, currentWeight: 195, goalWeight: 180, selectedRateLbPerWeek: -0.5 });
    const maintenance = calculateGoalTimeline({ startWeight: 180, currentWeight: 181, goalWeight: 190, selectedRateLbPerWeek: 0 });
    const reached = calculateGoalTimeline({ startWeight: 200, currentWeight: 179.9, goalWeight: 180, selectedRateLbPerWeek: -0.5 });
    const mismatch = calculateGoalTimeline({ startWeight: 180, currentWeight: 182, goalWeight: 190, selectedRateLbPerWeek: -0.25 });
    const missingRate = calculateGoalTimeline({ startWeight: 180, currentWeight: 182, goalWeight: 190 });

    assert.equal(cut.status, "scheduled");
    assert.equal(cut.weeks, 30);
    assert.equal(maintenance.status, "maintenance");
    assert.equal(maintenance.estimatedDate, null);
    assert.equal(reached.status, "reached");
    assert.equal(reached.percent, 100);
    assert.equal(mismatch.status, "wrong_direction");
    assert.equal(missingRate.status, "rate_missing");
});

test("goal timeline stays inside See More and opens one detailed view", () => {
    assert.doesNotMatch(dashboard, /dashboard-goal-timeline-card/);
    assert.doesNotMatch(dashboard, /weight-goal-timeline-strip/);
    assert.match(dashboard, /goalTimelinePreviewMarkup/);
    assert.match(dashboard, /data-goal-timeline-open/);
    assert.match(dashboard, /Estimated goal date/);
    assert.match(dashboard, /Selected pace/);
    assert.match(dashboard, /Current trend/);
    assert.match(dashboard, /Optimistic estimate/);
    assert.match(dashboard, /Plateaus, water-weight changes, missed targets/);
    assert.match(dashboard, /data-goal-timeline-edit/);
    assert.match(styles, /\.goal-timeline-screen/);
    assert.match(styles, /z-index:\s*31050/);
    assert.match(styles, /bottom:\s*calc\(12px \+ env\(safe-area-inset-bottom\)\)/);
});

test("the PWA preloads and cache-busts goal timeline assets", () => {
    assert.match(serviceWorker, /2026-09-12-303/);
    assert.match(serviceWorker, /dashboard-goal-timeline\.js\?v=goal-timeline-2/);
    assert.match(serviceWorker, /goal-timeline\.css\?v=goal-timeline-2/);
    assert.match(index, /dashboard-command-center\.css\?v=goal-timeline-2/);
    assert.match(index, /dashboard-weight-trend-card\.js\?v=goal-timeline-2/);
});
