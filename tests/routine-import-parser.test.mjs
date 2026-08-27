import test from "node:test";
import assert from "node:assert/strict";

globalThis.localStorage = { getItem: () => null };
const { parseRoutineText, parseExerciseLine, matchExerciseName } = await import("../js/workouts/routine-import-parser.js?v=routine-import-1");

test("parses common copied routine formats into workout days", () => {
  const result = parseRoutineText(`Push Day
Bench Press - 3x6-8
Incline DB Press: 3 sets of 8-12 reps

Pull Day
3x10-12 Lat Pulldown
Cable Row 4 x 8-10`);
  assert.equal(result.days.length, 2);
  assert.equal(result.days[0].exercises.length, 2);
  assert.deepEqual(
    result.days[1].exercises.map(item => ({ sets: item.sets, reps: item.reps })),
    [{ sets: 3, reps: "10-12" }, { sets: 4, reps: "8-10" }]
  );
});

test("recognizes notes without losing the prescribed sets and reps", () => {
  const parsed = parseExerciseLine("Cable Fly — 3x12-15, 1 RIR");
  assert.equal(parsed.name, "Cable Fly");
  assert.equal(parsed.sets, 3);
  assert.equal(parsed.reps, "12-15");
  assert.equal(parsed.notes, "1 RIR");
});

test("matches common abbreviations and misspellings to Level Up exercises", () => {
  assert.equal(matchExerciseName("DB chest flys").exerciseId, "dumbbell-fly");
  assert.equal(matchExerciseName("BB bench press").exerciseId, "barbell-bench-press");
  assert.equal(matchExerciseName("RDL").exerciseId, "romanian-deadlift");
});

test("maps generic squats to Back Squat and never suggests a zero-score exercise", () => {
  assert.equal(matchExerciseName("Squats").exerciseId, "back-squat");
  assert.equal(matchExerciseName("Squats").confirmed, true);
  assert.equal(matchExerciseName("Zorbulator").exerciseId, null);
  assert.equal(matchExerciseName("Zorbulator").confirmed, false);
});

test("parses compact slash-separated routines commonly found in Reddit comments", () => {
  const result = parseRoutineText(`## Upper
Incline Bench Press / 2x8-10 Pec Deck / 2x10-12 Lat Pulldown / 3x8-12`);
  assert.equal(result.days.length, 1);
  assert.equal(result.days[0].name, "Upper");
  assert.deepEqual(result.days[0].exercises.map(item => item.sets), [2, 2, 3]);
});

test("splits exercise rows collapsed by ChatGPT or iPhone paste", () => {
  const result = parseRoutineText(`Day 1\nBench Press – 4x6-10 Incline Dumbbell Press – 4x8-12 Overhead Press – 3x6-10 Lateral Raises – 3x15-20 Triceps Pushdowns – 3x12-15\n\u2028Day 2 — Pull (Back, Biceps, Rear Delts)\u2028Pull-Ups or Lat Pulldowns – 4x8-12 Barbell Rows – 3x6-10 Dumbbell Curls – 3x10-15 Hammer Curls – 3x10-15 Face Pulls – 3x15-20`);

  assert.equal(result.days.length, 2);
  assert.equal(result.days[0].name, "Day 1");
  assert.equal(result.days[0].exercises.length, 5);
  assert.equal(result.days[1].exercises.length, 5);
  assert.deepEqual(result.days[1].exercises.map(item => item.name), [
    "Pull-Ups or Lat Pulldowns",
    "Barbell Rows",
    "Dumbbell Curls",
    "Hammer Curls",
    "Face Pulls"
  ]);
  assert.deepEqual(result.skipped, []);
});
