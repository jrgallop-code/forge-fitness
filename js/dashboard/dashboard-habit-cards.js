import { CHECK_IN_APPLE_SVG, getMonthlyCheckInEvents } from "../nutrition/check-in-calendar.js?v=checkin-calendar-1";

const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const SESSION_STORAGE_KEY = "forge_workout_sessions";
const PHASE_STORAGE_KEY = "level_up_nutrition_phases";
const CHECK_STATE_KEY = "level_up_weekly_phase_checkin_state";
const HOLD_STORAGE_KEY = "level_up_phase_reassessment_hold";
const DAY_COUNT = 30;
const RECENT_DAY_COUNT = 7;

let queued = false;

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

function recentDates(count) {
    const today = new Date(`${localDate()}T12:00:00`);
    return Array.from({ length: count }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (count - 1 - index));
        return localDate(date);
    });
}

function currentMonthDates() {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12).getDate();
    return Array.from({ length: last }, (_, index) => localDate(new Date(now.getFullYear(), now.getMonth(), index + 1, 12)));
}

function getWeightDateSet() {
    return new Set(
        readArray(WEIGHT_STORAGE_KEY)
            .filter(entry => Number.isFinite(Number(entry?.weight)) && Number(entry.weight) > 0)
            .map(entry => normalizeDate(entry?.date))
            .filter(Boolean)
    );
}

function getCompletedSessions() {
    return readArray(SESSION_STORAGE_KEY).filter(session => {
        if (session?.status && session.status !== "completed" && !session.completedAt) return false;
        return Boolean(normalizeDate(session?.date || session?.completedAt));
    });
}

function sessionDate(session) {
    return normalizeDate(session?.date || session?.completedAt);
}

function renderHeatmap(dates, activeDates, kind) {
    return `
        <span class="dashboard-habit-heatmap dashboard-habit-heatmap--${kind}" aria-hidden="true">
            ${dates.map(date => `
                <i class="dashboard-habit-cell ${activeDates.has(date) ? "is-active" : ""}" title="${date}"></i>
            `).join("")}
        </span>
    `;
}

function renderCheckInHeatmap(dates, events) {
    const byDate = new Map(events.map(event => [event.date, event]));
    return `
        <span class="dashboard-habit-heatmap dashboard-habit-heatmap--checkins" aria-hidden="true">
            ${dates.map(date => {
                const event = byDate.get(date);
                const state = event ? ` is-active is-${event.state}` : "";
                return `<i class="dashboard-habit-cell${state}" title="${event ? `${date} · ${event.label}` : date}"></i>`;
            }).join("")}
        </span>
    `;
}

function checkInSummary(events) {
    const today = localDate();
    const next = events.find(event => event.date >= today);
    if (next?.state === "ready") return "Review ready";
    if (next?.state === "waiting") return "Action needed";
    if (next) {
        const date = new Date(`${next.date}T12:00:00`);
        return `Next ${date.toLocaleDateString(undefined, { weekday: "short" })}`;
    }
    return events.length ? `${events.length} this month` : "No check-ins this month";
}

function renderCards() {
    const content = document.getElementById("content");
    const dashboard = content?.querySelector(":scope > .dashboard.dashboard-command-insights, :scope > .dashboard");
    if (!content || !dashboard || !content.classList.contains("dashboard-command-center")) return;

    const thirtyDates = recentDates(DAY_COUNT);
    const monthDates = currentMonthDates();
    const sevenDates = recentDates(RECENT_DAY_COUNT);
    const sevenDateSet = new Set(sevenDates);
    const weightDates = getWeightDateSet();
    const sessions = getCompletedSessions();
    const workoutDates = new Set(sessions.map(sessionDate).filter(Boolean));
    const checkInEvents = getMonthlyCheckInEvents(new Date());

    const recentWeighInDays = sevenDates.filter(date => weightDates.has(date)).length;
    const recentWorkoutCount = sessions.filter(session => sevenDateSet.has(sessionDate(session))).length;
    const handledCheckIns = checkInEvents.filter(event => event.state === "handled").length;
    const checkInStatus = checkInSummary(checkInEvents);

    const signature = JSON.stringify({
        weights: thirtyDates.map(date => weightDates.has(date) ? 1 : 0),
        workouts: thirtyDates.map(date => workoutDates.has(date) ? 1 : 0),
        checkins: checkInEvents.map(event => `${event.date}:${event.state}`),
        recentWeighInDays,
        recentWorkoutCount
    });

    let section = content.querySelector(".dashboard-habit-section");
    if (!section) {
        section = document.createElement("section");
        section.className = "dashboard-habit-section";
    }

    // Keep Activity/Consistency below the main dashboard detail cards. This is
    // the lower dashboard position users were accustomed to and prevents the
    // calendar cards from breaking the flow between At a Glance and current activity.
    const detailGrid = content.querySelector(":scope > .dashboard-detail-grid");
    if (detailGrid) {
        if (section.previousElementSibling !== detailGrid) detailGrid.insertAdjacentElement("afterend", section);
    }
    else if (!section.isConnected) {
        dashboard.insertAdjacentElement("afterend", section);
    }

    if (section.dataset.signature === signature) return;
    section.dataset.signature = signature;
    section.innerHTML = `
        <div class="dashboard-habit-section-heading">
            <span class="eyebrow">HABITS</span>
            <h2>Consistency</h2>
        </div>
        <div class="dashboard-habit-grid">
            <button type="button" class="dashboard-habit-card dashboard-habit-card--weigh-in" data-dashboard-habit="weight" aria-label="Open Activity Calendar. Weigh-ins: ${recentWeighInDays} of the last 7 days have a weigh-in.">
                <span class="dashboard-habit-card-heading">
                    <strong>Weigh-In</strong>
                    <small>Last 30 Days</small>
                </span>
                ${renderHeatmap(thirtyDates, weightDates, "weight")}
                <span class="dashboard-habit-divider" aria-hidden="true"></span>
                <span class="dashboard-habit-summary">
                    <span><b>${recentWeighInDays}/7</b><small>last 7 days</small></span>
                    <i class="dashboard-habit-chevron" aria-hidden="true"></i>
                </span>
            </button>

            <button type="button" class="dashboard-habit-card dashboard-habit-card--workouts" data-dashboard-habit="workouts" aria-label="Open Activity Calendar. Workouts: ${recentWorkoutCount} workouts completed in the last 7 days.">
                <span class="dashboard-habit-card-heading">
                    <strong>Workouts</strong>
                    <small>Last 30 Days</small>
                </span>
                ${renderHeatmap(thirtyDates, workoutDates, "workouts")}
                <span class="dashboard-habit-divider" aria-hidden="true"></span>
                <span class="dashboard-habit-summary">
                    <span><b>${recentWorkoutCount}</b><small>${recentWorkoutCount === 1 ? "workout" : "workouts"} · last 7 days</small></span>
                    <i class="dashboard-habit-chevron" aria-hidden="true"></i>
                </span>
            </button>

            <button type="button" class="dashboard-habit-card dashboard-habit-card--checkins" data-dashboard-habit="checkins" aria-label="Open Activity Calendar. ${checkInEvents.length} calorie check-ins scheduled this month.">
                <span class="dashboard-habit-card-heading dashboard-habit-card-heading--icon">
                    <span class="dashboard-habit-checkin-icon" aria-hidden="true">${CHECK_IN_APPLE_SVG}</span>
                    <span><strong>Check-Ins</strong><small>This Month</small></span>
                </span>
                ${renderCheckInHeatmap(monthDates, checkInEvents)}
                <span class="dashboard-habit-divider" aria-hidden="true"></span>
                <span class="dashboard-habit-summary">
                    <span><b>${handledCheckIns}/${checkInEvents.length || 0}</b><small>${checkInStatus}</small></span>
                    <i class="dashboard-habit-chevron" aria-hidden="true"></i>
                </span>
            </button>
        </div>
    `;
}

function openActivityCalendar() {
    import("./activity-calendar.js?v=checkin-calendar-1")
        .then(module => module.openActivityCalendar())
        .catch(error => console.warn("Activity Calendar could not open", error));
}

function queueRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        renderCards();
    });
}

document.addEventListener("click", event => {
    const card = event.target.closest?.("[data-dashboard-habit]");
    if (!card) return;
    openActivityCalendar();
});

const content = document.getElementById("content");
if (content) {
    new MutationObserver(queueRender).observe(content, { childList: true, subtree: true });
}

[
    "levelup:nutrition-phase-updated",
    "levelup:maintenance-check-in-updated",
    "levelup:weekly-calorie-review-readiness",
    "levelup:calorie-target-applied"
].forEach(name => window.addEventListener(name, queueRender));

window.addEventListener("focus", queueRender);
window.addEventListener("storage", event => {
    if ([WEIGHT_STORAGE_KEY, SESSION_STORAGE_KEY, PHASE_STORAGE_KEY, CHECK_STATE_KEY, HOLD_STORAGE_KEY].includes(event.key)) queueRender();
});

queueRender();
