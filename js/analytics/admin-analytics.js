const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";

function sessionToken() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.token || ""; }
    catch { return ""; }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;", "'":"&#39;"}[character]));
}

function number(value) { return Number(value || 0).toLocaleString(); }
function personName(person) { return person.display_name || String(person.email || "User").split("@")[0] || "User"; }
function statPeople(label, people, metric, tone = "users") {
    const rows = people.length ? people.map(person => `<div class="admin-analytics-stat-person"><span><strong>${escapeHtml(personName(person))}</strong><small>${escapeHtml(person.email || "")}</small></span><b>${escapeHtml(metric(person))}</b></div>`).join("") : `<p class="admin-analytics-empty">No matching users in this period.</p>`;
    return `<section class="admin-analytics-stat-group is-${tone}"><div class="admin-analytics-stat-group-head"><h4>${escapeHtml(label)}</h4><strong>${number(people.length)}</strong></div><div class="admin-analytics-stat-list">${rows}</div></section>`;
}

export function renderAdminAnalytics() {
    return `<section class="admin-analytics-page">
        <div class="admin-analytics-head"><div><button class="nutrition-planner-back" id="admin-analytics-back" type="button">← More</button><span class="eyebrow">LEVEL UP · OWNER VIEW</span><h2>Stats & Analytics</h2><p>See how people are using Level Up and whether training is sticking.</p></div><select id="admin-analytics-range" aria-label="Analytics date range"><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option></select></div>
        <div id="admin-analytics-status" class="admin-analytics-status">Loading your dashboard…</div>
        <div id="admin-analytics-content" hidden></div>
    </section>`;
}

export function initializeAdminAnalytics({ onBack } = {}) {
    ensureUsageStyles();
    document.getElementById("admin-analytics-back")?.addEventListener("click", () => onBack?.());
    const range = document.getElementById("admin-analytics-range");
    range?.addEventListener("change", () => loadAnalytics(Number(range.value)));
    loadAnalytics(Number(range?.value || 30));
}

async function loadAnalytics(days) {
    const status = document.getElementById("admin-analytics-status");
    const content = document.getElementById("admin-analytics-content");
    const token = sessionToken();
    if (!token) { status.textContent = "Sign in with your owner account to view analytics."; return; }
    status.textContent = "Updating the dashboard…";
    try {
        const response = await fetch(`${API_URL}/v1/admin/analytics?days=${days}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Analytics could not be loaded.");
        content.innerHTML = renderAnalytics(data);
        bindRestaurantReviewActions(content, days);
        content.hidden = false;
        status.hidden = true;
    } catch (error) {
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
    const todayLabel = formatAnalyticsDate(data.today, data.timeZone);
    const updatedLabel = formatAnalyticsTime(data.updatedAt, data.timeZone);
    const feedbackSummary = data.feedbackSummary || {};
    const feedback = data.feedback || [];
    const namedStats = [
        statPeople("Food loggers", people.filter(person => Number(person.foods_logged) > 0), person => `${number(person.foods_logged)} foods`, "foods"),
        statPeople("Workout users", people.filter(person => Number(person.workouts_logged) > 0), person => `${number(person.workouts_logged)} workouts`, "workouts"),
        renderSatisfactionFeedback(feedbackSummary, feedback)
    ].join("");
    const chart = daily.length ? daily.map(item => `<div class="admin-analytics-bar" title="${escapeHtml(item.day)} · ${number(item.active_users)} users · ${number(item.foods)} foods · ${number(item.workouts)} workouts"><div><i class="admin-analytics-series admin-analytics-series--users" style="height:${barHeight(item.active_users, max)}%"></i><i class="admin-analytics-series admin-analytics-series--foods" style="height:${barHeight(item.foods, max)}%"></i><i class="admin-analytics-series admin-analytics-series--workouts" style="height:${barHeight(item.workouts, max)}%"></i></div><small>${escapeHtml(item.day.slice(5))}</small></div>`).join("") : `<p class="admin-analytics-empty">Usage will appear here as people open the app, log food, and train.</p>`;
    const restaurantCatalogue = renderRestaurantCatalogue(data.restaurantCatalogue || {});
    const workoutSourceBreakdown = renderWorkoutSourceBreakdown(data.workoutSources || []);
    return `<div class="admin-analytics-kpis">
        ${kpi("Total users", totals.total_users, "all time")}${kpi("New users today", totals.new_users_today, todayLabel)}${kpi("Signed-in users today", totals.users_today, `opened the app · ${todayLabel}`)}${kpi("Engaged users today", totals.engaged_users_today, "logged food or a workout")}${kpi("Active users", totals.active_users, "last 7 days")}${kpi("Returning users", totals.repeat_users, `2+ local days in ${data.days} days`)}${kpi("Food loggers", totals.food_log_users, `in ${data.days} days`)}${kpi("Weight loggers", totals.weight_log_users, "all time · at least 1 weigh-in")}${kpi("Workout users", totals.workout_users, `in ${data.days} days`)}${kpi("Workouts logged", totals.workouts, `in ${data.days} days`)}
    </div><div class="admin-analytics-grid"><section class="admin-analytics-card admin-analytics-wide"><div class="admin-analytics-card-head"><div><span class="eyebrow">ACTIVITY</span><h3>Daily app usage</h3><p>Halifax local dates · updated ${escapeHtml(updatedLabel)}</p></div><div class="admin-analytics-legend"><span class="is-users">Users</span><span class="is-foods">Foods</span><span class="is-workouts">Workouts</span></div></div><div class="admin-analytics-chart">${chart}</div></section><section class="admin-analytics-card"><div class="admin-analytics-card-head"><div><span class="eyebrow">ENGAGEMENT</span><h3>What people use</h3></div></div><div class="admin-analytics-funnel"><div><span>Returning users</span><strong>${number(totals.repeat_users)}</strong></div><div><span>People logging food</span><strong>${number(totals.food_log_users)}</strong></div><div><span>Food entries logged</span><strong>${number(totals.foods_logged)}</strong></div><div><span>People with weigh-ins</span><strong>${number(totals.weight_log_users)}</strong></div><div><span>People completing workouts</span><strong>${number(totals.workout_users)}</strong></div><div><span>Onboarding completed</span><strong>${number(totals.onboarding_completions)}</strong></div></div></section>${workoutSourceBreakdown}<section class="admin-analytics-card"><div class="admin-analytics-card-head"><div><span class="eyebrow">ACQUISITION</span><h3>Where people came from</h3></div></div><div class="admin-analytics-sources">${sourceRows || `<p class="admin-analytics-empty">No acquisition responses yet.</p>`}</div></section>${restaurantCatalogue}<section class="admin-analytics-card admin-analytics-wide"><div class="admin-analytics-card-head"><div><span class="eyebrow">ENGAGED USERS</span><h3>Who logged activity</h3><p>Only people who logged food or completed a workout appear below.</p></div></div><div class="admin-analytics-stat-groups">${namedStats}</div></section></div>`;
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

function renderRestaurantCatalogue(data) {
    if (data.migrationPending) return `<section class="admin-analytics-card admin-analytics-wide"><span class="eyebrow">RESTAURANT DATA</span><h3>Catalogue migration pending</h3><p>The verified restaurant review tools will appear after the production database migration finishes.</p></section>`;
    const audit = data.audit || [];
    const totalItems = audit.reduce((sum, row) => sum + Number(row.item_count || 0), 0);
    const fullItems = audit.reduce((sum, row) => sum + Number(row.full_nutrition_count || 0), 0);
    const coverage = audit.length ? audit.map(row => `<tr><td>${escapeHtml(row.brand)}</td><td>${escapeHtml(row.country_code)}</td><td>${number(row.item_count)}</td><td>${number(row.full_nutrition_count)}</td><td>${number(row.calories_only_count)}</td><td>${number(row.review_due_count)}</td></tr>`).join("") : `<tr><td colspan="6">No restaurant foods yet.</td></tr>`;
    const misses = (data.misses || []).map(row => `<li><span>${escapeHtml(row.query_normalized)} <small>${escapeHtml(row.country_code)}</small></span><strong>${number(row.searches)}</strong></li>`).join("") || `<li>No uncovered searches in the last 30 days.</li>`;
    const due = (data.dueReviews || []).map(row => `<li><a href="${escapeHtml(row.source_url)}" target="_blank" rel="noopener">${escapeHtml(row.brand)} · ${escapeHtml(row.name)}</a><small>${escapeHtml(String(row.next_review_at || "").slice(0, 10))}</small></li>`).join("") || `<li>No verifications are overdue.</li>`;
    const staging = (data.staging || []).map(row => `<div class="restaurant-review-row"><div><strong>${escapeHtml(row.brand)} · ${escapeHtml(row.name)}</strong><small>${escapeHtml(row.country_code)} · ${escapeHtml(row.serving_label)} · ${number(row.calories)} kcal · ${escapeHtml(row.nutrition_scope)}</small><a href="${escapeHtml(row.source_url)}" target="_blank" rel="noopener">Open official source</a>${JSON.parse(row.validation_errors || "[]").length ? `<b>${escapeHtml(JSON.parse(row.validation_errors).join(" · "))}</b>` : ""}</div><span><button type="button" data-restaurant-review="approve" data-staging-id="${escapeHtml(row.id)}">Approve</button><button type="button" data-restaurant-review="reject" data-staging-id="${escapeHtml(row.id)}">Reject</button></span></div>`).join("") || `<p class="admin-analytics-empty">The staging queue is clear.</p>`;
    return `<section class="admin-analytics-card admin-analytics-wide restaurant-catalogue"><div class="admin-analytics-card-head"><div><span class="eyebrow">VERIFIED RESTAURANT DATA</span><h3>Catalogue quality</h3><p>${number(totalItems)} active items · ${number(fullItems)} with full macros · country variants stay separate</p></div></div><div class="restaurant-catalogue-grid"><div><h4>Coverage</h4><div class="restaurant-table-wrap"><table><thead><tr><th>Restaurant</th><th>Country</th><th>Items</th><th>Full</th><th>Calories</th><th>Review</th></tr></thead><tbody>${coverage}</tbody></table></div></div><div><h4>Uncovered searches</h4><ul>${misses}</ul><h4>Verification due</h4><ul>${due}</ul></div></div><h4>Staging review</h4><div class="restaurant-review-list">${staging}</div></section>`;
}

function bindRestaurantReviewActions(container, days) {
    container.querySelectorAll("[data-restaurant-review]").forEach(button => button.addEventListener("click", async () => {
        button.disabled = true;
        try {
            const response = await fetch(`${API_URL}/v1/admin/restaurants/staging/${encodeURIComponent(button.dataset.stagingId)}/review`, { method: "POST", headers: { Authorization: `Bearer ${sessionToken()}`, "Content-Type": "application/json" }, body: JSON.stringify({ action: button.dataset.restaurantReview }) });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.error || "Review failed.");
            await loadAnalytics(days);
        } catch (error) { button.disabled = false; button.title = error.message; }
    }));
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
    link.href = "css/admin-analytics-usage.css?v=workout-source-stats-1";
    link.dataset.adminUsageStyles = "";
    document.head.append(link);
}
