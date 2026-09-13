import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkoutReminders } from "../js/notifications/workout-reminder-model.js";

const settings = { upcomingWorkouts: true, workoutDay: true, missedWorkouts: true, workoutTime: "18:00", leadMinutes: 60, dayReminderTime: "09:00", missedTime: "20:00", quietStart: "22:00", quietEnd: "07:00" };
const plan = { id: "plan-1", days: [{ name: "Push" }] };

test("creates morning, upcoming and missed reminders for a scheduled workout", () => {
    const now = new Date(2026, 8, 14, 8, 0);
    const schedule = { planId: "plan-1", weekly: { 1: 0 }, exceptions: {} };
    const result = buildWorkoutReminders({ now, schedule, plan, sessions: [], settings, days: 0 });
    assert.deepEqual(result.map(item => item.key), ["day:2026-09-14", "upcoming:2026-09-14", "missed:2026-09-14"]);
});

test("does not schedule reminders for completed, skipped or quiet-hour workouts", () => {
    const now = new Date(2026, 8, 14, 8, 0);
    const schedule = { planId: "plan-1", weekly: { 1: 0 }, exceptions: {} };
    const completed = [{ date: "2026-09-14", planId: "plan-1", trainingDayIndex: 0 }];
    assert.equal(buildWorkoutReminders({ now, schedule, plan, sessions: completed, settings, days: 0 }).length, 0);
    schedule.exceptions["2026-09-14"] = { status: "skipped", dayIndex: null };
    assert.equal(buildWorkoutReminders({ now, schedule, plan, sessions: [], settings, days: 0 }).length, 0);
    const quiet = { ...settings, dayReminderTime: "06:00", upcomingWorkouts: false, missedWorkouts: false };
    delete schedule.exceptions["2026-09-14"];
    assert.equal(buildWorkoutReminders({ now: new Date(2026, 8, 14, 5, 0), schedule, plan, sessions: [], settings: quiet, days: 0 }).length, 0);
});
