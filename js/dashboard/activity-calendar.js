import { calculateWorkoutVolume } from "../workouts/volume-calculator.js?v=two-dumbbells-1";
import { CHECK_IN_APPLE_SVG, getMonthlyCheckInEvents } from "../nutrition/check-in-calendar.js?v=checkin-calendar-1";

const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const SESSION_STORAGE_KEY = "forge_workout_sessions";
const PHASE_STORAGE_KEY = "level_up_nutrition_phases";
const CHECK_STATE_KEY = "level_up_weekly_phase_checkin_state";
const HOLD_STORAGE_KEY = "level_up_phase_reassessment_hold";

let viewDate = new Date();
let selectedDate = "";
let previousOverflow = "";

function readArray(key) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}

function localDate(date = new Date()) {
    const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return copy.toISOString().slice(0, 10);
}

function normalizeDate(value) {
    if (!value) return "";
    const text = String(value);
    const direct = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct) return direct[1];
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? localDate(date) : "";
}

function workoutDate(session) {
    return normalizeDate(session?.date || session?.completedAt);
}

function completedWorkouts() {
    return readArray(SESSION_STORAGE_KEY).filter(session => {
        if (session?.status && session.status !== "completed" && !session.completedAt) return false;
        return Boolean(workoutDate(session));
    });
}

function weighIns() {
    return readArray(WEIGHT_STORAGE_KEY).filter(entry =>
        Number.isFinite(Number(entry?.weight)) &&
        Number(entry.weight) > 0 &&
        normalizeDate(entry?.date)
    );
}

function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date) {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

function fullDateLabel(value) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(new Date(`${value}T12:00:00`));
}

function workoutName(session) {
    return String(
        session?.name ||
        session?.workoutName ||
        session?.planName ||
        session?.dayName ||
        "Workout"
    ).trim();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function hasRecordedValue(value) {
    if (value === null || value === undefined || String(value).trim() === "") return false;
    const number = Number(value);
    return Number.isFinite(number) ? number > 0 : true;
}

function isRecordedSet(set) {
    return Boolean(
        set?.completed ||
        hasRecordedValue(set?.weight) ||
        hasRecordedValue(set?.reps) ||
        hasRecordedValue(set?.duration) ||
        hasRecordedValue(set?.durationMinutes)
    );
}

function recordedExercises(session) {
    return (session?.exercises || []).filter(exercise => {
        if (exercise?.trackingType === "notes") {
            return Number(exercise?.durationMinutes) > 0 ||
                String(exercise?.distance || "").trim() ||
                String(exercise?.notes || "").trim();
        }
        return (exercise?.sets || []).some(isRecordedSet);
    });
}

function recordedSetCount(session) {
    return (session?.exercises || [])
        .flatMap(exercise => exercise?.sets || [])
        .filter(isRecordedSet)
        .length;
}

function formatDuration(session) {
    const milliseconds = Number(session?.durationMs) || Number(session?.durationMinutes) * 60000;
    if (!(milliseconds > 0)) return "";
    const totalMinutes = Math.max(1, Math.round(milliseconds / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (!hours) return `${minutes} min`;
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function workoutSummary(session) {
    const parts = [];
    const name = workoutName(session);
    const trainingDay = String(session?.trainingDayName || session?.dayName || "").trim();
    const duration = formatDuration(session);
    const exercises = recordedExercises(session).length;
    const sets = recordedSetCount(session);
    const volume = calculateWorkoutVolume(session);

    if (trainingDay && trainingDay !== "Workout" && trainingDay !== name) parts.push(trainingDay);
    if (duration) parts.push(duration);
    if (exercises) parts.push(`${exercises} ${exercises === 1 ? "exercise" : "exercises"}`);
    if (sets) parts.push(`${sets} ${sets === 1 ? "set" : "sets"}`);
    if (volume > 0) parts.push(`${Math.round(volume).toLocaleString()} lb volume`);
    return parts.join(" · ");
}

function formatWeight(value) {
    return `${Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    })} lb`;
}

function weighInChange(entry, weights) {
    const date = normalizeDate(entry?.date);
    const previous = weights
        .filter(candidate => normalizeDate(candidate?.date) < date)
        .sort((a, b) => normalizeDate(b?.date).localeCompare(normalizeDate(a?.date)))[0];
    if (!previous) return "First recorded weigh-in";

    const difference = Number(entry?.weight) - Number(previous?.weight);
    if (!Number.isFinite(difference)) return "";
    if (Math.abs(difference) < 0.05) return "No change from previous weigh-in";
    const sign = difference > 0 ? "+" : "−";
    return `${sign}${Math.abs(difference).toFixed(1)} lb from previous weigh-in`;
}

function calendarDays(date) {
    const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
    const days = [];

    for (let blank = 0; blank < first.getDay(); blank += 1) days.push(null);
    for (let day = 1; day <= last.getDate(); day += 1) {
        days.push(new Date(date.getFullYear(), date.getMonth(), day, 12));
    }
    while (days.length % 7) days.push(null);
    return days;
}

function checkInMeta(event) {
    if (event.state === "handled") return "Weekly calorie review completed.";
    if (event.state === "ready") return "Your calorie review is ready to open in Nutrition → Goals & Plan.";
    if (event.state === "waiting") return "The scheduled review is due, but Level Up still needs enough current nutrition and weight data.";
    if (event.state === "past") return "Scheduled weekly calorie check-in.";
    return "Scheduled weekly calorie check-in. Keep logging nutrition and weigh-ins so it is ready on time.";
}

function renderDetails(dateKey, sessions, weights, checkIns) {
    if (!dateKey) {
        return `
            <div class="activity-calendar-empty">
                <strong>Select a highlighted day</strong>
                <span>See workouts, weigh-ins and calorie check-ins.</span>
            </div>
        `;
    }

    const daySessions = sessions.filter(session => workoutDate(session) === dateKey);
    const dayWeights = weights.filter(entry => normalizeDate(entry?.date) === dateKey);
    const dayCheckIns = checkIns.filter(event => event.date === dateKey);

    if (!daySessions.length && !dayWeights.length && !dayCheckIns.length) {
        return `
            <div class="activity-calendar-detail-head"><span>${fullDateLabel(dateKey)}</span></div>
            <div class="activity-calendar-empty">
                <strong>No activity logged</strong>
                <span>No workout, weigh-in or calorie check-in is recorded on this day.</span>
            </div>
        `;
    }

    return `
        <div class="activity-calendar-detail-head"><span>${fullDateLabel(dateKey)}</span></div>
        <div class="activity-calendar-events">
            ${dayCheckIns.map(event => `
                <div class="activity-calendar-event activity-calendar-event--checkin is-${event.state}">
                    <i class="activity-calendar-checkin-icon" aria-hidden="true">${CHECK_IN_APPLE_SVG}</i>
                    <span>
                        <small>CALORIE CHECK-IN</small>
                        <strong>${escapeHtml(event.label)}</strong>
                        <p class="activity-calendar-event-meta">${escapeHtml(checkInMeta(event))}</p>
                    </span>
                </div>
            `).join("")}
            ${daySessions.map(session => {
                const summary = workoutSummary(session);
                return `
                <div class="activity-calendar-event activity-calendar-event--workout">
                    <i aria-hidden="true"></i>
                    <span>
                        <small>WORKOUT</small>
                        <strong>${escapeHtml(workoutName(session))}</strong>
                        ${summary ? `<p class="activity-calendar-event-meta">${escapeHtml(summary)}</p>` : ""}
                    </span>
                </div>
            `;
            }).join("")}
            ${dayWeights.map(entry => `
                <div class="activity-calendar-event activity-calendar-event--weight">
                    <i aria-hidden="true"></i>
                    <span>
                        <small>WEIGH-IN</small>
                        <strong>${formatWeight(entry?.weight)}</strong>
                        <p class="activity-calendar-event-meta">${weighInChange(entry, weights)}</p>
                    </span>
                </div>
            `).join("")}
        </div>
    `;
}

function renderCalendar() {
    const page = document.querySelector("[data-activity-calendar-page]");
    if (!page) return;

    const sessions = completedWorkouts();
    const weights = weighIns();
    const checkIns = getMonthlyCheckInEvents(viewDate);
    const workoutDates = new Set(sessions.map(workoutDate));
    const weightDates = new Set(weights.map(entry => normalizeDate(entry?.date)));
    const checkInDates = new Map(checkIns.map(event => [event.date, event]));
    const today = localDate();

    page.querySelector("[data-activity-calendar-month-label]").textContent = monthLabel(viewDate);
    page.querySelector("[data-activity-calendar-month-input]").value = monthKey(viewDate);

    page.querySelector("[data-activity-calendar-grid]").innerHTML = calendarDays(viewDate)
        .map(date => {
            if (!date) return '<span class="activity-calendar-day is-empty" aria-hidden="true"></span>';
            const key = localDate(date);
            const hasWorkout = workoutDates.has(key);
            const hasWeight = weightDates.has(key);
            const checkIn = checkInDates.get(key);
            const hasCheckIn = Boolean(checkIn);
            return `
                <button
                    type="button"
                    class="activity-calendar-day ${hasWorkout ? "has-workout" : ""} ${hasWeight ? "has-weight" : ""} ${hasCheckIn ? `has-checkin checkin-${checkIn.state}` : ""} ${key === today ? "is-today" : ""} ${key === selectedDate ? "is-selected" : ""}"
                    data-activity-calendar-date="${key}"
                    aria-label="${fullDateLabel(key)}${hasWorkout ? ", workout logged" : ""}${hasWeight ? ", weigh-in logged" : ""}${hasCheckIn ? `, ${checkIn.label.toLowerCase()}` : ""}"
                >
                    <span>${date.getDate()}</span>
                    <i aria-hidden="true">
                        ${hasWorkout ? '<b class="workout-dot"></b>' : ""}
                        ${hasWeight ? '<b class="weight-dot"></b>' : ""}
                        ${hasCheckIn ? '<b class="checkin-dot"></b>' : ""}
                    </i>
                </button>
            `;
        }).join("");

    page.querySelector("[data-activity-calendar-details]").innerHTML =
        renderDetails(selectedDate, sessions, weights, checkIns);
}

function closeActivityCalendar() {
    document.querySelector("[data-activity-calendar-page]")?.remove();
    document.body.style.overflow = previousOverflow;
}

export function openActivityCalendar() {
    if (document.querySelector("[data-activity-calendar-page]")) return;
    viewDate = new Date();
    selectedDate = "";
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const page = document.createElement("section");
    page.className = "activity-calendar-page";
    page.dataset.activityCalendarPage = "true";
    page.setAttribute("aria-label", "Activity Calendar");
    page.innerHTML = `
        <header class="activity-calendar-header">
            <button type="button" class="activity-calendar-back" data-activity-calendar-close aria-label="Close Activity Calendar">‹</button>
            <div>
                <span class="eyebrow">CONSISTENCY</span>
                <h1>Activity Calendar</h1>
            </div>
        </header>
        <div class="activity-calendar-content">
            <div class="activity-calendar-month-controls">
                <button type="button" data-activity-calendar-previous aria-label="Previous month">‹</button>
                <label>
                    <span data-activity-calendar-month-label></span>
                    <input type="month" data-activity-calendar-month-input aria-label="Select month">
                </label>
                <button type="button" data-activity-calendar-next aria-label="Next month">›</button>
            </div>
            <div class="activity-calendar-card">
                <div class="activity-calendar-weekdays" aria-hidden="true">
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                </div>
                <div class="activity-calendar-grid" data-activity-calendar-grid></div>
                <div class="activity-calendar-legend">
                    <span><i class="workout-dot"></i>Workout</span>
                    <span><i class="weight-dot"></i>Weigh-in</span>
                    <span class="activity-calendar-legend-checkin">${CHECK_IN_APPLE_SVG}Check-in</span>
                </div>
            </div>
            <div class="activity-calendar-details" data-activity-calendar-details></div>
        </div>
    `;
    document.body.appendChild(page);
    renderCalendar();
}

document.addEventListener("click", event => {
    if (event.target.closest("[data-activity-calendar-close]")) {
        closeActivityCalendar();
        return;
    }

    if (event.target.closest("[data-activity-calendar-previous]")) {
        viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1, 12);
        selectedDate = "";
        renderCalendar();
        return;
    }

    if (event.target.closest("[data-activity-calendar-next]")) {
        viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1, 12);
        selectedDate = "";
        renderCalendar();
        return;
    }

    const day = event.target.closest("[data-activity-calendar-date]");
    if (day) {
        selectedDate = day.dataset.activityCalendarDate || "";
        renderCalendar();
    }
});

document.addEventListener("change", event => {
    const input = event.target.closest("[data-activity-calendar-month-input]");
    if (!input?.value) return;
    const [year, month] = input.value.split("-").map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
    viewDate = new Date(year, month - 1, 1, 12);
    selectedDate = "";
    renderCalendar();
});

[
    "levelup:nutrition-phase-updated",
    "levelup:maintenance-check-in-updated",
    "levelup:weekly-calorie-review-readiness",
    "levelup:calorie-target-applied"
].forEach(name => window.addEventListener(name, renderCalendar));

window.addEventListener("storage", event => {
    if ([WEIGHT_STORAGE_KEY, SESSION_STORAGE_KEY, PHASE_STORAGE_KEY, CHECK_STATE_KEY, HOLD_STORAGE_KEY].includes(event.key)) renderCalendar();
});
