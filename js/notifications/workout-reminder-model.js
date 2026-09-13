const DAY_MS = 86400000;

export function buildWorkoutReminders({ now = new Date(), schedule, plan, sessions = [], settings, days = 14 } = {}) {
    if (!schedule || !plan || !settings) return [];
    const reminders = [];
    for (let offset = 0; offset <= days; offset += 1) {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
        const dateKey = localDate(date);
        const exception = schedule.exceptions?.[dateKey];
        const dayIndex = exception ? exception.dayIndex : schedule.weekly?.[date.getDay()];
        const workout = dayIndex !== null && dayIndex !== undefined ? plan.days?.[Number(dayIndex)] : null;
        if (!workout || exception?.status === "skipped") continue;
        const completed = sessions.some(session => session?.date === dateKey && String(session?.planId) === String(plan.id) && Number(session?.trainingDayIndex) === Number(dayIndex));
        if (completed) continue;
        const extra = { type: "levelup:scheduled-workout", planId: String(plan.id), dayIndex: Number(dayIndex), date: dateKey };
        if (settings.upcomingWorkouts) {
            const workoutAt = atTime(date, settings.workoutTime);
            const at = new Date(workoutAt.getTime() - Number(settings.leadMinutes || 60) * 60000);
            add(reminders, now, settings, { key: `upcoming:${dateKey}`, at, title: "Your workout is coming up", body: `${workout.name || "Workout"} starts in ${leadLabel(settings.leadMinutes)}. Tap to get ready.`, extra });
        }
        if (settings.workoutDay) add(reminders, now, settings, { key: `day:${dateKey}`, at: atTime(date, settings.dayReminderTime), title: "Training day 💪", body: `${workout.name || "Your workout"} is scheduled today. Tap to view it.`, extra });
        if (settings.missedWorkouts) add(reminders, now, settings, { key: `missed:${dateKey}`, at: atTime(date, settings.missedTime), title: "Still time to train", body: `${workout.name || "Your workout"} is waiting when you’re ready. Even a shorter session counts.`, extra });
    }
    return reminders.sort((a, b) => a.at - b.at);
}

function add(list, now, settings, reminder) {
    if (reminder.at <= now || insideQuietHours(reminder.at, settings.quietStart, settings.quietEnd)) return;
    list.push(reminder);
}

function atTime(date, value) {
    const [hour, minute] = String(value || "00:00").split(":").map(Number);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour || 0, minute || 0, 0, 0);
}

function minutes(value) { const [hour, minute] = String(value || "00:00").split(":").map(Number); return (hour || 0) * 60 + (minute || 0); }
function insideQuietHours(date, start, end) {
    const current = date.getHours() * 60 + date.getMinutes();
    const from = minutes(start), until = minutes(end);
    if (from === until) return false;
    return from < until ? current >= from && current < until : current >= from || current < until;
}
function leadLabel(value) { const minutes = Number(value); return minutes === 120 ? "2 hours" : minutes === 30 ? "30 minutes" : "1 hour"; }
function localDate(date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }

export const WORKOUT_REMINDER_DAY_MS = DAY_MS;
