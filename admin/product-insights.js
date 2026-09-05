const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_owner_session";
const STYLE_HREF = "./product-insights.css?v=owner-product-insights-1";

const THEME_LABELS = {
    system: "System",
    "level-up": "Level Up",
    arctic: "Arctic",
    pure: "Pure",
    ocean: "Ocean",
    midnight: "Midnight",
    slate: "Slate",
    pulse: "Pulse"
};

let cachedInsights = null;
let observer = null;
let refreshTimer = 0;
let initialized = false;

export function initializeOwnerProductInsights() {
    ensureStyles();
    if (initialized) {
        scheduleRefresh(80);
        return;
    }
    initialized = true;

    const range = document.getElementById("admin-analytics-range");
    range?.addEventListener("change", () => scheduleRefresh(120));

    const content = document.getElementById("admin-analytics-content");
    if (content) {
        observer = new MutationObserver(() => {
            if (
                cachedInsights &&
                !content.querySelector(".owner-product-insights") &&
                content.querySelector(".admin-analytics-kpis")
            ) renderProductInsights(cachedInsights);
        });
        observer.observe(content, { childList: true });
    }

    scheduleRefresh(180);
}

function scheduleRefresh(delay = 0) {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => void loadProductInsights(), Math.max(0, delay));
}

async function loadProductInsights() {
    const token = sessionToken();
    if (!token) return;
    const range = document.getElementById("admin-analytics-range");
    const days = Math.max(7, Math.min(365, Number(range?.value) || 30));

    try {
        const response = await fetch(`${API_URL}/v1/admin/analytics?days=${days}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Product insights could not be loaded.");
        cachedInsights = data.productInsights || null;
        renderProductInsights(cachedInsights);
    } catch (error) {
        renderProductInsights({ error: error.message });
    }
}

function renderProductInsights(insights) {
    const content = document.getElementById("admin-analytics-content");
    if (!content || content.hidden) return;

    content.querySelector(".owner-product-insights")?.remove();
    const anchor = content.querySelector(".admin-analytics-kpis");
    if (!anchor) return;

    const section = document.createElement("section");
    section.className = "owner-product-insights";

    if (insights?.error) {
        section.innerHTML = `<div class="owner-insight-card owner-insight-status"><span class="eyebrow">PRODUCT INSIGHTS</span><h3>Additional analytics unavailable</h3><p>${escapeHtml(insights.error)}</p></div>`;
        anchor.insertAdjacentElement("afterend", section);
        return;
    }

    const migrationPending = Boolean(insights?.migrationPending);
    const programRows = Array.isArray(insights?.programUsage) ? insights.programUsage : [];
    const appearanceRows = Array.isArray(insights?.appearance) ? insights.appearance : [];
    const recentPrograms = Array.isArray(insights?.recentPrograms) ? insights.recentPrograms : [];
    const coverage = insights?.coverage || {};

    section.innerHTML = `
        <div class="owner-product-insights-head">
            <div><span class="eyebrow">PRODUCT INSIGHTS</span><h3>How people use Level Up</h3></div>
            <small>${migrationPending ? "Collecting new product-state data" : "Updates as signed-in users use the app"}</small>
        </div>
        <div class="owner-product-insights-grid">
            ${renderProgramUsage(programRows, migrationPending)}
            ${renderAppearanceUsage(appearanceRows, coverage, migrationPending)}
            ${renderCurrentProgramChoices(recentPrograms, migrationPending)}
        </div>`;

    anchor.insertAdjacentElement("afterend", section);
}

function renderProgramUsage(rows, migrationPending) {
    const totalWorkouts = rows.reduce((sum, row) => sum + Number(row.workouts || 0), 0);
    const body = rows.length
        ? rows.map((row, index) => {
            const workouts = Number(row.workouts || 0);
            const users = Number(row.users || 0);
            const share = totalWorkouts ? Math.round(workouts / totalWorkouts * 100) : 0;
            return `<div class="owner-insight-row">
                <span class="owner-insight-rank">${index + 1}</span>
                <div class="owner-insight-copy"><strong>${escapeHtml(programLabel(row))}</strong><small>${number(workouts)} workout${workouts === 1 ? "" : "s"} · ${number(users)} user${users === 1 ? "" : "s"}</small><div class="owner-insight-meter"><i style="width:${share}%"></i></div></div>
                <b>${share}%</b>
            </div>`;
        }).join("")
        : emptyInsight(migrationPending ? "Program rankings will fill as the analytics migration completes." : "No named program workouts in this period yet.");

    return `<article class="owner-insight-card">
        <div class="owner-insight-card-head"><div><span class="eyebrow">PROGRAMS</span><h4>Most used programs</h4></div><strong>${number(totalWorkouts)}</strong></div>
        <p class="owner-insight-caption">Ranked by completed workouts in the selected date range.</p>
        <div class="owner-insight-list">${body}</div>
    </article>`;
}

function renderAppearanceUsage(rows, coverage, migrationPending) {
    const totalTracked = rows.reduce((sum, row) => sum + Number(row.users || 0), 0);
    const body = rows.length
        ? rows.map((row, index) => {
            const users = Number(row.users || 0);
            const share = totalTracked ? Math.round(users / totalTracked * 100) : 0;
            const label = THEME_LABELS[row.theme] || titleCase(row.theme || "Unknown");
            return `<div class="owner-insight-row">
                <span class="owner-insight-rank">${index + 1}</span>
                <div class="owner-insight-copy"><strong>${escapeHtml(label)}</strong><small>${number(users)} user${users === 1 ? "" : "s"}</small><div class="owner-insight-meter"><i style="width:${share}%"></i></div></div>
                <b>${share}%</b>
            </div>`;
        }).join("")
        : emptyInsight(migrationPending ? "Appearance tracking is starting now." : "Waiting for signed-in users to reopen Level Up.");

    const tracked = Number(coverage.tracked_users || 0);
    const total = Number(coverage.total_users || 0);
    const coveragePct = total ? Math.round(tracked / total * 100) : 0;

    return `<article class="owner-insight-card">
        <div class="owner-insight-card-head"><div><span class="eyebrow">APPEARANCE</span><h4>Theme preferences</h4></div><strong>${number(totalTracked)}</strong></div>
        <p class="owner-insight-caption">Each tracked signed-in user counts once using their current selected appearance.</p>
        <div class="owner-insight-list">${body}</div>
        <div class="owner-insight-coverage"><span>Coverage</span><strong>${number(tracked)} of ${number(total)} users · ${coveragePct}%</strong><small>This fills as signed-in users reopen the app.</small></div>
    </article>`;
}

function renderCurrentProgramChoices(rows, migrationPending) {
    const total = rows.reduce((sum, row) => sum + Number(row.users || 0), 0);
    const body = rows.length
        ? rows.map(row => `<div class="owner-current-program-row"><span><strong>${escapeHtml(programLabel(row))}</strong><small>${escapeHtml(sourceLabel(row.program_source))}</small></span><b>${number(row.users)} user${Number(row.users) === 1 ? "" : "s"}</b></div>`).join("")
        : emptyInsight(migrationPending ? "Current-program state is starting now." : "No recent named programs reported yet.");

    return `<article class="owner-insight-card owner-insight-card-wide">
        <div class="owner-insight-card-head"><div><span class="eyebrow">CURRENT PROGRAM</span><h4>Recent program choices</h4></div><strong>${number(total)}</strong></div>
        <p class="owner-insight-caption">Most recently completed named program for each tracked signed-in user. One-off workouts are excluded.</p>
        <div class="owner-current-program-list">${body}</div>
    </article>`;
}

function programLabel(row) {
    return row?.program_name || row?.program_id || "Unknown program";
}

function sourceLabel(source) {
    const labels = {
        coach_builder: "Coach Builder",
        manual_builder: "Manual Builder",
        template_library: "Template Library",
        imported_routine: "Imported Routine",
        legacy_unknown: "Older program"
    };
    return labels[source] || (source ? titleCase(source) : "Program");
}

function emptyInsight(message) {
    return `<p class="owner-insight-empty">${escapeHtml(message)}</p>`;
}

function number(value) {
    return Number(value || 0).toLocaleString();
}

function titleCase(value) {
    return String(value || "").replace(/[-_]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function sessionToken() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.token || ""; }
    catch { return ""; }
}

function ensureStyles() {
    if (document.querySelector('link[data-owner-product-insights]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLE_HREF;
    link.dataset.ownerProductInsights = "1";
    document.head.appendChild(link);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;"
    }[character]));
}
