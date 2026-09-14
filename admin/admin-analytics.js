const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_owner_session";

function sessionToken() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.token || ""; }
    catch { return ""; }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;", "'":"&#39;"}[character]));
}

function number(value) { return Number(value || 0).toLocaleString(); }
function personName(person) { return person.display_name || String(person.email || "User").split("@")[0] || "User"; }
function statPeople(label, people, metric, tone = "users", emptyMessage = "No matching users in this period.") {
    const rows = people.length ? people.map(person => `<div class="admin-analytics-stat-person"><span><strong>${escapeHtml(personName(person))}</strong><small>${escapeHtml(person.email || "")}</small></span><b>${escapeHtml(metric(person))}</b></div>`).join("") : `<p class="admin-analytics-empty">${escapeHtml(emptyMessage)}</p>`;
    return `<section class="admin-analytics-stat-group is-${tone}"><div class="admin-analytics-stat-group-head"><h4>${escapeHtml(label)}</h4><strong>${number(people.length)}</strong></div><div class="admin-analytics-stat-list">${rows}</div></section>`;
}

export function renderAdminAnalytics() {
    return `<section class="admin-analytics-page">
        <div class="admin-analytics-head"><div><span class="eyebrow">LEVEL UP · OWNER VIEW</span><h2>Stats & Analytics</h2><p>See how people are using Level Up and whether training is sticking.</p></div><select id="admin-analytics-range" aria-label="Analytics date range"><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option></select></div>
        <div id="admin-analytics-status" class="admin-analytics-status">Loading your dashboard…</div>
        <div id="admin-analytics-content" hidden></div>
    </section>`;
}

export function initializeAdminAnalytics() {
    ensureUsageStyles();
    const range = document.getElementById("admin-analytics-range");
    range?.addEventListener("change", () => loadAnalytics(Number(range.value)));
    loadAnalytics(Number(range?.value || 30));
}

async function loadAnalytics(days) {
    const status = document.getElementById("admin-analytics-status");
    const content = document.getElementById("admin-analytics-content");
    const token = sessionToken();
    if (!token) { status.textContent = "Sign in with your owner account to view analytics."; return; }
    status.hidden = false;
    status.className = "admin-analytics-status";
    status.textContent = "Updating the dashboard…";
    try {
        const response = await fetch(`${API_URL}/v1/admin/analytics?days=${days}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Analytics could not be loaded.");
        content.innerHTML = renderAnalytics(data);
        bindUserDirectory(content);
        content.hidden = false;
        status.hidden = true;
    } catch (error) {
        content.hidden = true;
        status.hidden = false;
        status.textContent = error.message;
        status.className = "admin-analytics-status is-error";
    }
}

function renderAnalytics(data) {
    const totals = data.totals || {};
    const daily = data.daily || [];
    const max = Math.max(1, ...daily.flatMap(item => [Number(item.active_users || 0), Number(item.foods || 0), Number(item.workouts || 0)]));
    const sourceRows = (data.acquisition || []).slice(0, 6).map(item => `<div class="admin-analytics-source"><span>${escapeHtml(item.source)}</span><strong>${number(item.users)}</strong></div>`).join("");
    const people = data.people || [];
    const weightLoggers = Array.isArray(data.weightLoggers) ? data.weightLoggers : [];
    const todayLabel = formatAnalyticsDate(data.today, data.timeZone);
    const updatedLabel = formatAnalyticsTime(data.updatedAt, data.timeZone);
    const feedbackSummary = data.feedbackSummary || {};
    const feedback = data.feedback || [];
    const namedStats = [
        statPeople("Repeat weight loggers", weightLoggers, person => `${number(person.weigh_ins)} weigh-ins`, "weights", "No users have logged more than one weigh-in yet."),
        statPeople("Food loggers", people.filter(person => Number(person.foods_logged) > 0), person => `${number(person.foods_logged)} foods`, "foods"),
        statPeople("Workout users", people.filter(person => Number(person.workouts_logged) > 0), person => `${number(person.workouts_logged)} workouts`, "workouts"),
        renderSatisfactionFeedback(feedbackSummary, feedback)
    ].join("");
    const chart = daily.length ? daily.map(item => `<div class="admin-analytics-bar" title="${escapeHtml(item.day)} · ${number(item.active_users)} users · ${number(item.foods)} foods · ${number(item.workouts)} workouts"><div><i class="admin-analytics-series admin-analytics-series--users" style="height:${barHeight(item.active_users, max)}%"></i><i class="admin-analytics-series admin-analytics-series--foods" style="height:${barHeight(item.foods, max)}%"></i><i class="admin-analytics-series admin-analytics-series--workouts" style="height:${barHeight(item.workouts, max)}%"></i></div><small>${escapeHtml(item.day.slice(5))}</small></div>`).join("") : `<p class="admin-analytics-empty">Usage will appear here as people open the app, log food, and train.</p>`;
    const workoutSourceBreakdown = renderUserDirectory(people, data.days) + renderWorkoutSourceBreakdown(data.workoutSources || []);
    return `<div class="admin-analytics-kpis">
        ${kpi("Total users", totals.total_users, "all time")}${kpi("New users today", totals.new_users_today, todayLabel)}${kpi("Signed-in users today", totals.users_today, `opened the app · ${todayLabel}`)}${kpi("Engaged users today", totals.engaged_users_today, "logged food or a workout")}${kpi("Active users", totals.active_users, "last 7 days")}${kpi("Returning users", totals.repeat_users, `2+ local days in ${data.days} days`)}${kpi("Food loggers", totals.food_log_users, `in ${data.days} days`)}${kpi("Weight loggers", totals.weight_log_users, "all time · at least 1 weigh-in")}${kpi("Repeat weight loggers", totals.repeat_weight_log_users, "all time · 2+ weigh-ins")}${kpi("Workout users", totals.workout_users, `in ${data.days} days`)}${kpi("Workouts logged", totals.workouts, `in ${data.days} days`)}
    </div><div class="admin-analytics-grid"><section class="admin-analytics-card admin-analytics-wide"><div class="admin-analytics-card-head"><div><span class="eyebrow">ACTIVITY</span><h3>Daily app usage</h3><p>Halifax local dates · updated ${escapeHtml(updatedLabel)}</p></div><div class="admin-analytics-legend"><span class="is-users">Users</span><span class="is-foods">Foods</span><span class="is-workouts">Workouts</span></div></div><div class="admin-analytics-chart">${chart}</div></section><section class="admin-analytics-card"><div class="admin-analytics-card-head"><div><span class="eyebrow">ENGAGEMENT</span><h3>What people use</h3></div></div><div class="admin-analytics-funnel"><div><span>Returning users</span><strong>${number(totals.repeat_users)}</strong></div><div><span>People logging food</span><strong>${number(totals.food_log_users)}</strong></div><div><span>Food entries logged</span><strong>${number(totals.foods_logged)}</strong></div><div><span>People with weigh-ins</span><strong>${number(totals.weight_log_users)}</strong></div><div><span>Repeat weight loggers</span><strong>${number(totals.repeat_weight_log_users)}</strong></div><div><span>People completing workouts</span><strong>${number(totals.workout_users)}</strong></div><div><span>Onboarding completed</span><strong>${number(totals.onboarding_completions)}</strong></div></div></section>${workoutSourceBreakdown}<section class="admin-analytics-card"><div class="admin-analytics-card-head"><div><span class="eyebrow">ACQUISITION</span><h3>Where people came from</h3></div></div><div class="admin-analytics-sources">${sourceRows || `<p class="admin-analytics-empty">No acquisition responses yet.</p>`}</div></section><section class="admin-analytics-card admin-analytics-wide"><div class="admin-analytics-card-head"><div><span class="eyebrow">ENGAGED USERS</span><h3>Who logged activity</h3><p>Food and workout lists follow the selected period. Repeat weight loggers are all-time and exclude users with only one weigh-in.</p></div></div><div class="admin-analytics-stat-groups">${namedStats}</div></section></div>`;
}

function renderUserDirectory(people, days) {
    const rows = people.map(person => `<button type="button" class="admin-user-directory-row" data-user-id="${escapeHtml(person.id)}" data-user-search="${escapeHtml(`${personName(person)} ${person.email || ""}`.toLowerCase())}"><span><strong>${escapeHtml(personName(person))}</strong><small>${escapeHtml(person.email || "")}</small></span><span class="admin-user-totals"><b>${number(person.active_days)}<small>active days</small></b><b>${number(person.foods_logged)}<small>foods</small></b><b>${number(person.workouts_logged)}<small>workouts</small></b><em>View dates ›</em></span></button>`).join("");
    return `<section class="admin-analytics-card admin-user-directory"><div class="admin-analytics-card-head"><div><span class="eyebrow">USER LOOKUP</span><h3>What each user has done</h3><p>Search any account, then open its complete recorded activity history.</p></div></div><label class="admin-user-search"><span>Search by name or email</span><input type="search" placeholder="Start typing a user…" data-admin-user-search></label><div class="admin-user-directory-list">${rows || `<p class="admin-analytics-empty">No users found.</p>`}</div><p class="admin-user-directory-empty" hidden>No users match that search.</p><div class="admin-user-history" hidden></div></section>`;
}

function bindUserDirectory(content) {
    const input = content.querySelector("[data-admin-user-search]");
    if (!input) return;
    input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        const rows = [...content.querySelectorAll(".admin-user-directory-row")];
        let shown = 0;
        rows.forEach(row => {
            const match = !query || String(row.dataset.userSearch || "").includes(query);
            row.hidden = !match;
            if (match) shown += 1;
        });
        content.querySelector(".admin-user-directory-empty")?.toggleAttribute("hidden", shown > 0);
    });
    content.querySelectorAll("[data-user-id]").forEach(row => row.addEventListener("click", () => loadUserHistory(content, row.dataset.userId)));
    content.addEventListener("click", event => {
        if (!event.target.closest("[data-close-user-history]")) return;
        const target = content.querySelector(".admin-user-history");
        if (target) { target.hidden = true; target.innerHTML = ""; }
    });
}

async function loadUserHistory(content, userId) {
    const target = content.querySelector(".admin-user-history");
    if (!target || !userId) return;
    target.hidden = false;
    target.innerHTML = `<p class="admin-analytics-empty">Loading complete activity history…</p>`;
    try {
        const days = Number(document.getElementById("admin-analytics-range")?.value || 30);
        const response = await fetch(`${API_URL}/v1/admin/analytics?days=${days}&user=${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${sessionToken()}` } });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "User history could not be loaded.");
        target.innerHTML = renderUserHistory(payload.selectedUserHistory);
        target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
        target.innerHTML = `<p class="admin-analytics-empty">${escapeHtml(error.message)}</p>`;
    }
}

function renderUserHistory(history) {
    if (!history?.user) return `<p class="admin-analytics-empty">This user could not be found.</p>`;
    const days = new Map();
    (history.events || []).forEach(event => {
        const date = formatHistoryDate(event.occurred_at);
        if (!date) return;
        if (!days.has(date)) days.set(date, { food: 0, workout: 0, weight: 0, weights: [] });
        const day = days.get(date);
        if (event.activity_type === "weight") { day.weight += 1; if (Number(event.value)) day.weights.push(Number(event.value)); }
        else if (event.activity_type === "workout") day.workout += 1;
        else if (event.activity_type === "food") day.food += 1;
    });
    const rows = [...days.entries()].map(([date, activity]) => {
        const items = [];
        if (activity.food) items.push(`<span class="is-food">${number(activity.food)} food entr${activity.food === 1 ? "y" : "ies"}</span>`);
        if (activity.workout) items.push(`<span class="is-workout">${number(activity.workout)} workout${activity.workout === 1 ? "" : "s"}</span>`);
        if (activity.weight) items.push(`<span class="is-weight">${number(activity.weight)} weigh-in${activity.weight === 1 ? "" : "s"}${activity.weights.length ? ` · ${activity.weights.map(value => number(value)).join(", ")}` : ""}</span>`);
        return `<div class="admin-user-history-day"><strong>${escapeHtml(date)}</strong><div>${items.join("")}</div></div>`;
    }).join("");
    return `<div class="admin-user-history-head"><div><span class="eyebrow">COMPLETE HISTORY</span><h4>${escapeHtml(personName(history.user))}</h4><small>${escapeHtml(history.user.email || "")}</small></div><button type="button" data-close-user-history>Close</button></div><div class="admin-user-history-days">${rows || `<p class="admin-analytics-empty">No food, workout, or weigh-in dates have been recorded.</p>`}</div>`;
}

function formatHistoryDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Halifax", year: "numeric", month: "short", day: "numeric", weekday: "short" }).format(date);
}

function renderWorkoutSourceBreakdown(rows) {
    const labels = {
        coach_builder: "Coach Builder",
        manual_builder: "Manual Builder",
        template_library: "Template Library",
        imported_routine: "Imported Routine",
        one_off: "One-Off Workout",
        legacy_unknown: "Older data"
    };
    const order = ["coach_builder", "manual_builder", "template_library", "imported_routine", "one_off", "legacy_unknown"];
    const values = new Map(rows.map(row => [row.workout_source, row]));
    const total = rows.reduce((sum, row) => sum + Number(row.workouts || 0), 0);
    const sourceRows = order.filter(source => values.has(source)).map(source => {
        const row = values.get(source);
        const percent = total ? Math.round(Number(row.workouts || 0) / total * 100) : 0;
        return `<div class="admin-workout-source${source === "legacy_unknown" ? " is-legacy" : ""}"><div><span>${escapeHtml(labels[source])}</span><small>${number(row.users)} user${Number(row.users) === 1 ? "" : "s"}</small></div><strong>${number(row.workouts)} <small>${percent}%</small></strong></div>`;
    }).join("");
    return `<section class="admin-analytics-card"><div class="admin-analytics-card-head"><div><span class="eyebrow">WORKOUT TYPES</span><h3>How workouts were created</h3><p>Completed workouts in this date range.</p></div></div><div class="admin-workout-sources">${sourceRows || `<p class="admin-analytics-empty">Workout types will appear after a workout is completed.</p>`}</div>${values.has("legacy_unknown") ? `<p class="admin-analytics-caption">Older workouts were recorded before workout type tracking was added.</p>` : ""}</section>`;
}

function renderSatisfactionFeedback(summary, responses) {
    const average = Number(summary.average_rating || 0);
    const rows = responses.length ? responses.map(item => `<div class="admin-analytics-feedback-row"><div><strong>${escapeHtml(personName(item))}</strong><span aria-label="${number(item.rating)} out of 5 stars">${"★".repeat(Number(item.rating) || 0)}${"☆".repeat(5 - (Number(item.rating) || 0))}</span></div>${item.comment ? `<p>${escapeHtml(item.comment)}</p>` : `<p class="admin-analytics-empty">No written feedback.</p>`}<small>${escapeHtml(formatAnalyticsTime(item.created_at))}</small></div>`).join("") : `<p class="admin-analytics-empty">No satisfaction ratings in this period.</p>`;
    return `<section class="admin-analytics-stat-group admin-analytics-feedback"><div class="admin-analytics-stat-group-head"><div><h4>App satisfaction</h4><small>${number(summary.responses)} responses</small></div><strong>${average ? `${average.toFixed(1)} / 5` : "—"}</strong></div><div class="admin-analytics-rating-distribution">${[5,4,3,2,1].map(rating => `<span>${rating}★ <b>${number(summary[`rating_${rating}`])}</b></span>`).join("")}</div><div class="admin-analytics-feedback-list">${rows}</div></section>`;
}

function formatAnalyticsDate(value, timeZone) {
    if (!value) return "today";
    return new Intl.DateTimeFormat(undefined, { timeZone: timeZone || "America/Halifax", month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00Z`));
}

function formatAnalyticsTime(value, timeZone) {
    if (!value) return "just now";
    return new Intl.DateTimeFormat(undefined, { timeZone: timeZone || "America/Halifax", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}

function kpi(label, value, detail) { return `<div class="admin-analytics-kpi"><span>${label}</span><strong>${number(value)}</strong><small>${detail}</small></div>`; }
function barHeight(value, max) { return Number(value || 0) ? Math.max(5, Math.round(Number(value) / max * 100)) : 0; }

function ensureUsageStyles() {
    if (document.querySelector("link[data-admin-usage-styles]")) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "./admin-analytics-usage.css?v=owner-dashboard-1";
    link.dataset.adminUsageStyles = "";
    document.head.append(link);
}
