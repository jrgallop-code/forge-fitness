const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const SESSION_STORAGE_KEY = "forge_workout_sessions";

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

function renderDetails(dateKey, sessions, weights) {
    if (!dateKey) {
        return `
            <div class="activity-calendar-empty">
                <strong>Select a highlighted day</strong>
                <span>See the workouts and weigh-ins you recorded.</span>
            </div>
        `;
    }

    const daySessions = sessions.filter(session => workoutDate(session) === dateKey);
    const dayWeights = weights.filter(entry => normalizeDate(entry?.date) === dateKey);

    if (!daySessions.length && !dayWeights.length) {
        return `
            <div class="activity-calendar-detail-head"><span>${fullDateLabel(dateKey)}</span></div>
            <div class="activity-calendar-empty">
                <strong>No activity logged</strong>
                <span>No workout or weigh-in was recorded on this day.</span>
            </div>
        `;
    }

    return `
        <div class="activity-calendar-detail-head"><span>${fullDateLabel(dateKey)}</span></div>
        <div class="activity-calendar-events">
            ${daySessions.map(session => `
                <div class="activity-calendar-event activity-calendar-event--workout">
                    <i aria-hidden="true"></i>
                    <span><small>WORKOUT</small><strong>${workoutName(session)}</strong></span>
                </div>
            `).join("")}
            ${dayWeights.map(() => `
                <div class="activity-calendar-event activity-calendar-event--weight">
                    <i aria-hidden="true"></i>
                    <span><small>WEIGH-IN</small><strong>Weight logged</strong></span>
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
    const workoutDates = new Set(sessions.map(workoutDate));
    const weightDates = new Set(weights.map(entry => normalizeDate(entry?.date)));
    const today = localDate();

    page.querySelector("[data-activity-calendar-month-label]").textContent = monthLabel(viewDate);
    page.querySelector("[data-activity-calendar-month-input]").value = monthKey(viewDate);

    page.querySelector("[data-activity-calendar-grid]").innerHTML = calendarDays(viewDate)
        .map(date => {
            if (!date) return '<span class="activity-calendar-day is-empty" aria-hidden="true"></span>';
            const key = localDate(date);
            const hasWorkout = workoutDates.has(key);
            const hasWeight = weightDates.has(key);
            return `
                <button
                    type="button"
                    class="activity-calendar-day ${hasWorkout ? "has-workout" : ""} ${hasWeight ? "has-weight" : ""} ${key === today ? "is-today" : ""} ${key === selectedDate ? "is-selected" : ""}"
                    data-activity-calendar-date="${key}"
                    aria-label="${fullDateLabel(key)}${hasWorkout ? ", workout logged" : ""}${hasWeight ? ", weigh-in logged" : ""}"
                >
                    <span>${date.getDate()}</span>
                    <i aria-hidden="true">
                        ${hasWorkout ? '<b class="workout-dot"></b>' : ""}
                        ${hasWeight ? '<b class="weight-dot"></b>' : ""}
                    </i>
                </button>
            `;
        }).join("");

    page.querySelector("[data-activity-calendar-details]").innerHTML =
        renderDetails(selectedDate, sessions, weights);
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

window.addEventListener("storage", event => {
    if (event.key === WEIGHT_STORAGE_KEY || event.key === SESSION_STORAGE_KEY) renderCalendar();
});
