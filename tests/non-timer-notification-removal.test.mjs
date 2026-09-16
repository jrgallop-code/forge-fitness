import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("removes non-timer notifications while preserving rest and cardio alarms", () => {
    const app = read("js/app.js");
    const more = read("js/more/more-ui-v2.js");
    const native = read("js/core/native-capabilities.js");
    const cleanup = read("js/core/non-timer-notification-cleanup.js");

    assert.doesNotMatch(app, /personal-record-notifications|workout-reminders/);
    assert.doesNotMatch(more, /data-more-page="notifications"|renderNotificationSettings/);
    assert.doesNotMatch(native, /showAppNotification|replaceScheduledAppNotifications|native-notification-opened/);
    assert.match(native, /scheduleNativeAlarm/);
    assert.match(cleanup, /LocalNotifications[\s\S]*cancel/);
    assert.equal(existsSync(new URL("../js/notifications/workout-reminders.js", import.meta.url)), false);
    assert.match(read("js/workouts/rest-timer-authority.js"), /scheduleNativeAlarm/);
    assert.match(read("js/workouts/logger-cardio-timer.js"), /scheduleNativeAlarm/);
});

test("cardio Live Activity receives current workout context while its notification retains reached copy", () => {
    const cardio = read("js/workouts/logger-cardio-timer.js");
    assert.match(cardio, /liveActivityTitle: "Cardio timer"/);
    assert.match(cardio, /liveActivityDetail: getCardioName\(card\)/);
    assert.match(cardio, /workoutName: getCurrentWorkoutName\(\)/);
    assert.match(cardio, /minute\$\{Number\(state\.alarmMinutes\) === 1 \? "" : "s"\} reached/);
});
