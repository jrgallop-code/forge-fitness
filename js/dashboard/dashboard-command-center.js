const SESSION_KEY = "forge_workout_sessions";
const PLAN_KEY = "forge_workout_plans";
const SCHEDULE_KEY = "level_up_workout_schedule_v1";

let weeklyMode = "program";
let queued = false;

function readArray(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(value) ? value : [];
    }
    catch {
        return [];
    }
}

function readObject(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    }
    catch {
        return null;
    }
}

function localDate(date = new Date()) {
    const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return copy.toISOString().slice(0, 10);
}

function lastSevenDates() {
    const today = new Date(`${localDate()}T12:00:00`);
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        return localDate(date);
    });
}

function sessionDate(session) {
    if (session?.date) return String(session.date).slice(0, 10);
    const time = new Date(session?.completedAt || 0);
    return Number.isFinite(time.getTime()) ? localDate(time) : "";
}

function countWorkingSets(session) {
    return (session?.exercises || []).reduce((total, exercise) => {
        const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
        return total + sets.filter(set =>
            set?.completed === true ||
            (set?.weight !== null && set?.weight !== undefined) ||
            (set?.reps !== null && set?.reps !== undefined)
        ).length;
    }, 0);
}

function countRecordedExercises(session) {
    return (session?.exercises || []).filter(exercise => {
        const sets = Array.isArray(exercise?.sets) ? exercise.sets : [];
        const hasWorkingSet = sets.some(set =>
            set?.completed === true ||
            (set?.weight !== null && set?.weight !== undefined) ||
            (set?.reps !== null && set?.reps !== undefined)
        );
        return hasWorkingSet || Boolean(String(exercise?.notes || "").trim());
    }).length;
}

function plannedSetCount(exercise) {
    if (Array.isArray(exercise?.sets)) return exercise.sets.length;
    const value = Number(exercise?.sets ?? exercise?.setCount);
    return Number.isFinite(value) && value > 0 ? value : 0;
}

function getProgramContext() {
    const schedule = readObject(SCHEDULE_KEY);
    const plans = readArray(PLAN_KEY);
    const plan = plans.find(item => item?.id === schedule?.planId) || null;
    if (!schedule || !plan) return null;

    const assignedDays = Object.values(schedule.weekly || {})
        .filter(value => value !== null && value !== undefined && value !== "")
        .map(Number)
        .filter(Number.isFinite);

    let targetSets = 0;
    let targetExercises = 0;
    assignedDays.forEach(dayIndex => {
        const day = plan?.days?.[dayIndex];
        if (!day) return;
        const exercises = Array.isArray(day.exercises) ? day.exercises : [];
        targetExercises += exercises.length;
        targetSets += exercises.reduce((sum, exercise) => sum + plannedSetCount(exercise), 0);
    });

    return {
        schedule,
        plan,
        targets: {
            workouts: assignedDays.length,
            sets: targetSets,
            exercises: targetExercises
        }
    };
}

function getWeeklyStats() {
    const dates = new Set(lastSevenDates());
    const sessions = readArray(SESSION_KEY).filter(session => dates.has(sessionDate(session)));
    const program = getProgramContext();
    const programSessions = program
        ? sessions.filter(session => session?.planId === program.plan.id)
        : [];

    const summarize = list => ({
        workouts: list.length,
        sets: list.reduce((total, session) => total + countWorkingSets(session), 0),
        exercises: list.reduce((total, session) => total + countRecordedExercises(session), 0)
    });

    return {
        all: summarize(sessions),
        program: summarize(programSessions),
        programContext: program
    };
}

function getDailySetSeries() {
    const sessions = readArray(SESSION_KEY);
    return lastSevenDates().map(date => ({
        date,
        sets: sessions
            .filter(session => sessionDate(session) === date)
            .reduce((total, session) => total + countWorkingSets(session), 0)
    }));
}

function formatDayNarrow(date) {
    return new Intl.DateTimeFormat(undefined, { weekday: "narrow" })
        .format(new Date(`${date}T12:00:00`));
}

function formatHeaderDate() {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric"
    }).format(new Date()).toUpperCase();
}

function enhanceHeader(welcome) {
    if (welcome.dataset.commandCenterHeader === "true") return;
    welcome.dataset.commandCenterHeader = "true";
    welcome.classList.add("dashboard-command-header");
    welcome.innerHTML = `
        <div>
            <span class="dashboard-command-date">${formatHeaderDate()}</span>
            <h2>DASHBOARD</h2>
            <p>Training, recovery, and progress at a glance.</p>
        </div>
    `;
}

function renderMetric(label, value, target) {
    const hasTarget = Number.isFinite(target) && target > 0;
    const percent = hasTarget ? Math.min(100, Math.round((value / target) * 100)) : 0;
    const remaining = hasTarget ? Math.max(0, target - value) : null;
    return `
        <div class="dashboard-weekly-metric ${hasTarget ? "" : "is-unbounded"}">
            <span>${label}</span>
            <strong>${value}${hasTarget ? `<small> / ${target}</small>` : ""}</strong>
            <em>${hasTarget ? (remaining ? `${remaining} left` : "Target reached") : "last 7 days"}</em>
            ${hasTarget ? `<div class="dashboard-weekly-bar" aria-hidden="true"><span style="width:${percent}%"></span></div>` : ""}
        </div>
    `;
}

function renderWeeklySection(stats) {
    const hasProgram = Boolean(stats.programContext);
    if (!hasProgram) weeklyMode = "all";
    const usingProgram = weeklyMode === "program" && hasProgram;
    const values = usingProgram ? stats.program : stats.all;
    const targets = usingProgram ? stats.programContext.targets : {};

    return `
        <div class="dashboard-command-weekly-head">
            <div>
                <span class="eyebrow">LAST 7 DAYS</span>
                <h2>Training Summary</h2>
            </div>
            ${hasProgram ? `
                <div class="dashboard-weekly-toggle" role="group" aria-label="Last 7 days training view">
                    <button type="button" data-dashboard-weekly-mode="program" class="${usingProgram ? "active" : ""}">Active Program</button>
                    <button type="button" data-dashboard-weekly-mode="all" class="${!usingProgram ? "active" : ""}">All Training</button>
                </div>
            ` : ""}
        </div>
        <div class="dashboard-weekly-grid">
            ${renderMetric("Workouts", values.workouts, targets.workouts)}
            ${renderMetric("Working Sets", values.sets, targets.sets)}
            ${renderMetric("Exercises", values.exercises, targets.exercises)}
        </div>
    `;
}

function ensureWeeklySection(content, dashboard) {
    const stats = getWeeklyStats();
    const signature = JSON.stringify({
        mode: weeklyMode,
        all: stats.all,
        program: stats.program,
        planId: stats.programContext?.plan?.id || null,
        targets: stats.programContext?.targets || null
    });

    let section = content.querySelector(".dashboard-command-weekly");
    if (!section) {
        section = document.createElement("section");
        section.className = "section-card dashboard-command-weekly";
        dashboard.insertAdjacentElement("beforebegin", section);
    }

    if (section.dataset.signature !== signature) {
        section.dataset.signature = signature;
        section.innerHTML = renderWeeklySection(stats);
    }
}

function ensureTodayFallback(content, welcome) {
    const scheduleCard = content.querySelector(".schedule-dashboard-card");
    const existingFallback = content.querySelector(".dashboard-command-today-empty");
    if (scheduleCard) {
        existingFallback?.remove();
        scheduleCard.classList.add("dashboard-command-today");
        return;
    }
    if (existingFallback) return;

    const fallback = document.createElement("section");
    fallback.className = "section-card dashboard-command-today dashboard-command-today-empty";
    fallback.innerHTML = `
        <div>
            <span class="eyebrow">TODAY</span>
            <h2>No workout scheduled</h2>
            <p>Open Workout to choose a plan, schedule your week, or start a session.</p>
        </div>
        <button class="primary-btn" type="button" data-dashboard-open-workout>Open Workout</button>
    `;
    welcome.insertAdjacentElement("afterend", fallback);
}

function cardTitle(card) {
    return String(card.querySelector("h3")?.textContent || "").trim();
}

function renderSevenDaySetsCard(card) {
    const series = getDailySetSeries();
    const total = series.reduce((sum, item) => sum + item.sets, 0);
    const maxSets = Math.max(1, ...series.map(item => item.sets));
    const signature = JSON.stringify(series.map(item => [item.date, item.sets]));
    if (card.dataset.sevenDaySetsSignature === signature) return;

    card.dataset.sevenDaySetsSignature = signature;
    card.classList.add("dashboard-seven-day-sets-card");
    card.innerHTML = `
        <div class="dashboard-seven-day-sets-content">
            <div class="dashboard-seven-day-sets-heading">
                <h3>Working Sets</h3>
                <small>Last 7 Days</small>
            </div>
            <div class="dashboard-seven-day-bars" aria-label="Working sets completed per day over the last 7 days">
                ${series.map(item => {
                    const height = item.sets > 0
                        ? Math.max(12, Math.round((item.sets / maxSets) * 100))
                        : 4;
                    return `
                        <span class="dashboard-seven-day-bar" title="${item.sets} working sets">
                            <i class="${item.sets > 0 ? "has-sets" : ""}" style="height:${height}%"></i>
                            <small>${formatDayNarrow(item.date)}</small>
                        </span>
                    `;
                }).join("")}
            </div>
            <div class="dashboard-seven-day-sets-value">
                <strong>${total}</strong>
                <small>sets logged</small>
            </div>
        </div>
    `;
}

function prepareInsights(content, dashboard) {
    const removeTitles = new Set([
        "Workouts — Last 7 Days",
        "Exercises — Last 7 Days",
        "Saved Workout Plans",
        "Water Recorded Today",
        "Latest Sleep Duration",
        "Water Today",
        "Last Sleep"
    ]);
    const rename = new Map([
        ["Latest Recorded Weight", "Latest Weight"],
        ["Daily Calorie Target", "Calories"],
        ["Daily Protein Target", "Protein"]
    ]);

    dashboard.querySelectorAll(".metric-card").forEach(card => {
        const title = cardTitle(card);
        if (title === "Completed Sets — Last 7 Days" || card.classList.contains("dashboard-seven-day-sets-card")) {
            renderSevenDaySetsCard(card);
            return;
        }
        if (removeTitles.has(title)) {
            card.remove();
            return;
        }
        const nextTitle = rename.get(title);
        const heading = card.querySelector("h3");
        if (heading && nextTitle) heading.textContent = nextTitle;
    });

    dashboard.classList.add("dashboard-command-insights");

    let heading = content.querySelector(".dashboard-command-insights-heading");
    if (!heading) {
        heading = document.createElement("div");
        heading.className = "dashboard-command-insights-heading";
        heading.innerHTML = `<span class="eyebrow">INSIGHTS & ANALYTICS</span><h2>At a Glance</h2>`;
        dashboard.insertAdjacentElement("beforebegin", heading);
    }

    content.querySelector(".performance-dashboard-card")?.classList.add("dashboard-command-performance");
}

function enhanceDashboard() {
    const content = document.getElementById("content");
    const welcome = content?.querySelector(":scope > .dashboard-welcome");
    const dashboard = content?.querySelector(":scope > .dashboard");

    if (!content || !welcome || !dashboard) {
        content?.classList.remove("dashboard-command-center");
        return;
    }

    content.classList.add("dashboard-command-center");
    enhanceHeader(welcome);
    ensureTodayFallback(content, welcome);
    ensureWeeklySection(content, dashboard);
    prepareInsights(content, dashboard);
}

function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        enhanceDashboard();
    });
}

document.addEventListener("click", event => {
    const modeButton = event.target.closest("[data-dashboard-weekly-mode]");
    if (modeButton) {
        weeklyMode = modeButton.dataset.dashboardWeeklyMode === "all" ? "all" : "program";
        queueEnhance();
        return;
    }

    if (event.target.closest("[data-dashboard-open-workout]")) {
        document.querySelector('.nav-btn[data-page="workout"]')?.click();
    }
});

const content = document.getElementById("content");
if (content) {
    new MutationObserver(queueEnhance).observe(content, { childList: true, subtree: true });
}

window.addEventListener("levelup:nutrition-updated", queueEnhance);
window.addEventListener("levelup:nutrition-phase-updated", queueEnhance);
window.addEventListener("storage", event => {
    if (event.key === SESSION_KEY) queueEnhance();
});
queueEnhance();
