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

export function renderAdminAnalytics() {
    return `<section class="admin-analytics-page">
        <div class="admin-analytics-head"><div><button class="nutrition-planner-back" id="admin-analytics-back" type="button">← More</button><span class="eyebrow">LEVEL UP · OWNER VIEW</span><h2>Stats & Analytics</h2><p>See how people are using Level Up and whether training is sticking.</p></div><select id="admin-analytics-range" aria-label="Analytics date range"><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option></select></div>
        <div id="admin-analytics-status" class="admin-analytics-status">Loading your dashboard…</div>
        <div id="admin-analytics-content" hidden></div>
    </section>`;
}

export function initializeAdminAnalytics({ onBack } = {}) {
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
    const max = Math.max(1, ...daily.map(item => Number(item.workouts || 0)));
    const sourceRows = (data.acquisition || []).slice(0, 6).map(item => `<div class="admin-analytics-source"><span>${escapeHtml(item.source)}</span><strong>${number(item.users)}</strong></div>`).join("");
    const chart = daily.length ? daily.map(item => `<div class="admin-analytics-bar" title="${escapeHtml(item.day)}: ${number(item.workouts)} workouts"><span style="height:${Math.max(5, Math.round(Number(item.workouts || 0) / max * 100))}%"></span><small>${escapeHtml(item.day.slice(5))}</small></div>`).join("") : `<p class="admin-analytics-empty">Workout events will appear here as people train.</p>`;
    return `<div class="admin-analytics-kpis">
        ${kpi("Total users", totals.total_users, "all time")}${kpi("New users", totals.new_users, `in ${data.days} days`)}${kpi("Active users", totals.active_users, "last 7 days")}${kpi("Workouts logged", totals.workouts, `in ${data.days} days`)}
    </div><div class="admin-analytics-grid"><section class="admin-analytics-card admin-analytics-wide"><div class="admin-analytics-card-head"><div><span class="eyebrow">ACTIVITY</span><h3>Workout momentum</h3></div><span class="admin-analytics-caption">Daily completed sessions</span></div><div class="admin-analytics-chart">${chart}</div></section><section class="admin-analytics-card"><div class="admin-analytics-card-head"><div><span class="eyebrow">FUNNEL</span><h3>Activation</h3></div></div><div class="admin-analytics-funnel"><div><span>Users who trained</span><strong>${number(totals.workout_users)}</strong></div><div><span>Onboarding completed</span><strong>${number(totals.onboarding_completions)}</strong></div></div></section><section class="admin-analytics-card"><div class="admin-analytics-card-head"><div><span class="eyebrow">ACQUISITION</span><h3>Where people came from</h3></div></div><div class="admin-analytics-sources">${sourceRows || `<p class="admin-analytics-empty">No acquisition responses yet.</p>`}</div></section></div>`;
}

function kpi(label, value, detail) { return `<div class="admin-analytics-kpi"><span>${label}</span><strong>${number(value)}</strong><small>${detail}</small></div>`; }
