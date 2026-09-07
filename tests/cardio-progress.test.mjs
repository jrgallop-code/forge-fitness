import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

globalThis.localStorage = {
  values: new Map([["level_up_unit_system", "metric"]]),
  getItem(key) { return this.values.get(key) ?? null; },
  setItem(key, value) { this.values.set(key, String(value)); }
};

const analytics = await import("../js/progress/cardio-analytics.js");
const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("cardio distance parser normalizes common units to kilometres", () => {
  assert.equal(analytics.parseCardioDistance("5 km"), 5);
  assert.equal(Number(analytics.parseCardioDistance("3.1 mi").toFixed(3)), 4.989);
  assert.equal(analytics.parseCardioDistance("1500 m"), 1.5);
  assert.equal(analytics.parseCardioDistance("700"), 0.7);
  assert.equal(analytics.parseCardioDistance("no distance"), null);
});

test("average speed uses only sessions that include both time and distance", () => {
  const summary = analytics.summarizeCardio([
    { sessionId: "a", duration: 30, distanceKm: 5, load: null },
    { sessionId: "b", duration: 60, distanceKm: null, load: null }
  ]);

  assert.equal(summary.duration, 90);
  assert.equal(summary.distanceKm, 5);
  assert.equal(summary.averageSpeedKmh, 10);
});

test("cardio entries preserve old notes-based RPE and structured RPE", () => {
  const now = new Date("2026-08-29T12:00:00Z");
  const entries = analytics.collectCardioEntries([{
    id: "session-a",
    completedAt: "2026-08-28T12:00:00Z",
    exercises: [
      { trackingType: "notes", exerciseName: "Running", durationMinutes: 30, distance: "5 km", notes: "RPE 7" },
      { trackingType: "notes", exerciseName: "Bike", durationMinutes: 20, distance: "8 km", rpe: 6 }
    ]
  }], now, 28);

  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map(entry => entry.load), [210, 120]);
  const summary = analytics.summarizeCardio(entries);
  assert.equal(summary.sessions, 1);
  assert.equal(summary.duration, 50);
  assert.equal(summary.distanceKm, 13);
  assert.equal(summary.load, 330);
});

test("cardio frequency always uses continuous Monday-Sunday week buckets", () => {
  const now = new Date("2026-09-06T12:00:00");
  const entries = [
    { date: new Date("2026-08-18T12:00:00"), duration: 20, distanceKm: 0, load: null },
    { date: new Date("2026-09-01T12:00:00"), duration: 30, distanceKm: 0, load: null }
  ];
  const weeks = analytics.groupCardioByWeek(entries, now, 28);

  assert.ok(weeks.length >= 4);
  assert.deepEqual(weeks.map(week => week.start.getDay()), weeks.map(() => 1));
  assert.ok(weeks.some(week => week.duration === 0));
  assert.equal(weeks.reduce((sum, week) => sum + week.duration, 0), 50);
});

test("cardio UI uses the selected appearance accent for trends and bars", async () => {
  const [view, styles, logger] = await Promise.all([
    read("js/progress/progress-ui.js"),
    read("css/cardio-analytics.css"),
    read("js/workouts/workout-session.js")
  ]);
  assert.match(view, /Weekly Cardio Minutes/);
  assert.match(view, /Average Speed/);
  assert.match(view, /Minutes by Activity/);
  assert.match(styles, /linear-gradient\(180deg,var\(--accent,#ff3b44\),var\(--accent-dark,#991018\)\)/);
  assert.match(styles, /linear-gradient\(90deg,var\(--accent-dark,#8d1017\),var\(--accent,#ff3039\)\)/);
  assert.match(await read("js/progress/cardio-analytics.js"), /stroke="var\(--accent\)"/);
  assert.match(logger, /class="session-cardio-rpe"/);
  assert.match(logger, /session\.exercises\[exerciseIndex\]\.rpe/);
});

test("progress prioritizes lifting and removes Photo Log at runtime", async () => {
  const source = await read("js/progress/cardio-analytics.js");
  assert.match(source, /tabs\.insertBefore\(liftingButton, tabs\.firstElementChild\)/);
  assert.match(source, /photo-log-tab/);
  assert.match(source, /photo-log-progress/);
  assert.match(source, /liftingButton\.click\(\)/);
  assert.match(source, /Track lifting performance, body weight, nutrition and cardio over time/);
});

test("mobile Cardio layout overrides desktop grids after the base rules", async () => {
  const styles = await read("css/cardio-analytics.css");
  const desktopGrid = styles.lastIndexOf(".cardio-summary-grid{display:grid;grid-template-columns:repeat(5");
  const mobileGrid = styles.lastIndexOf("@media(max-width:760px)");

  assert.ok(desktopGrid >= 0);
  assert.ok(mobileGrid > desktopGrid);
  assert.match(styles.slice(mobileGrid), /cardio-summary-grid\{grid-template-columns:repeat\(2/);
  assert.match(styles.slice(mobileGrid), /cardio-chart-grid\{grid-template-columns:1fr\}/);
  assert.match(styles.slice(mobileGrid), /white-space:normal/);
});
