const WEIGHT_STORAGE_KEY = "forge_weight_entries";
const SESSION_STORAGE_KEY = "forge_workout_sessions";
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

function renderCards() {
    const content = document.getElementById("content");
    const dashboard = content?.querySelector(":scope > .dashboard.dashboard-command-insights, :scope > .dashboard");
    if (!content || !dashboard || !content.classList.contains("dashboard-command-center")) return;

    const thirtyDates = recentDates(DAY_COUNT);
    const sevenDates = recentDates(RECENT_DAY_COUNT);
    const sevenDateSet = new Set(sevenDates);
    const weightDates = getWeightDateSet();
    const sessions = getCompletedSessions();
    const workoutDates = new Set(sessions.map(sessionDate).filter(Boolean));

    const recentWeighInDays = sevenDates.filter(date => weightDates.has(date)).length;
    const recentWorkoutCount = sessions.filter(session => sevenDateSet.has(sessionDate(session))).length;

    const signature = JSON.stringify({
        weights: thirtyDates.map(date => weightDates.has(date) ? 1 : 0),
        workouts: thirtyDates.map(date => workoutDates.has(date) ? 1 : 0),
        recentWeighInDays,
        recentWorkoutCount
    });

    let section = content.querySelector(".dashboard-habit-section");
    if (!section) {
        section = document.createElement("section");
        section.className = "dashboard-habit-section";
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
            <button type="button" class="dashboard-habit-card dashboard-habit-card--weigh-in" data-dashboard-habit="weight" aria-label="Open Weight Progress. ${recentWeighInDays} of the last 7 days have a weigh-in.">
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

            <button type="button" class="dashboard-habit-card dashboard-habit-card--workouts" data-dashboard-habit="workouts" aria-label="Open Workout History. ${recentWorkoutCount} workouts completed in the last 7 days.">
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
        </div>
    `;
}

function openWeightProgress() {
    const progressButton = document.querySelector('.nav-btn[data-page="progress"]');
    if (!progressButton) return;
    progressButton.click();
    window.setTimeout(() => {
        document.getElementById("weight-tab")?.click();
        document.getElementById("weight-progress")?.scrollIntoView({ block: "start" });
    }, 0);
}

function openWorkoutHistory() {
    document.querySelector('.nav-btn[data-page="workout"]')?.click();
    window.setTimeout(() => {
        import("../core/router.js?v=first-run-onboarding-1")
            .then(({ navigate }) => navigate("history"))
            .catch(error => console.warn("Workout history could not open", error));
    }, 0);
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
    if (card.dataset.dashboardHabit === "weight") openWeightProgress();
    if (card.dataset.dashboardHabit === "workouts") openWorkoutHistory();
});

const content = document.getElementById("content");
if (content) {
    new MutationObserver(queueRender).observe(content, { childList: true, subtree: true });
}

window.addEventListener("focus", queueRender);
window.addEventListener("storage", event => {
    if (event.key === WEIGHT_STORAGE_KEY || event.key === SESSION_STORAGE_KEY) queueRender();
});

queueRender();
