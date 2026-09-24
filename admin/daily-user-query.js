const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_owner_session";
const PANEL_ID = "admin-daily-user-query";
let selectedDate = localToday();
let observer = null;

export function initializeDailyUserQuery() {
  ensureStyles();
  attachPanel();
  if (!observer) {
    observer = new MutationObserver(attachPanel);
    const content = document.getElementById("admin-analytics-content");
    if (content) observer.observe(content, { childList: true, subtree: true });
  }
  void loadSelectedDay();
}

function attachPanel() {
  const grid = document.querySelector("#admin-analytics-content .admin-analytics-grid");
  if (!grid || document.getElementById(PANEL_ID)) return;
  const panel = document.createElement("section");
  panel.id = PANEL_ID;
  panel.className = "admin-analytics-card admin-analytics-wide admin-daily-user-query";
  panel.innerHTML = panelShell("Choose a date to see its users.");
  grid.prepend(panel);
  bindPanel(panel);
  queueMicrotask(() => void loadSelectedDay());
}

function panelShell(status) {
  return `<div class="admin-analytics-card-head"><div><span class="eyebrow">DAILY USER LOOKUP</span><h3>Who joined on a specific day?</h3><p>See daily active users, new accounts, and whether each new user logged food or completed a workout that day.</p></div></div>
    <form class="admin-daily-user-form"><label for="admin-user-date">Date</label><div><input id="admin-user-date" type="date" value="${escapeHtml(selectedDate)}"><button type="submit">View users</button></div></form>
    <div class="admin-daily-user-results" aria-live="polite"><p class="admin-daily-user-status">${escapeHtml(status)}</p></div>`;
}

function bindPanel(panel) {
  panel.querySelector("form")?.addEventListener("submit", event => {
    event.preventDefault();
    selectedDate = panel.querySelector("#admin-user-date")?.value || selectedDate;
    void loadSelectedDay();
  });
}

async function loadSelectedDay() {
  const panel = document.getElementById(PANEL_ID);
  const target = panel?.querySelector(".admin-daily-user-results");
  const token = sessionToken();
  if (!panel || !target || !token) return;
  target.innerHTML = `<p class="admin-daily-user-status">Loading users…</p>`;
  try {
    const range = Number(document.getElementById("admin-analytics-range")?.value || 30);
    const response = await fetch(`${API_URL}/v1/admin/analytics?days=${range}&date=${encodeURIComponent(selectedDate)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Daily users could not be loaded.");
    renderResults(target, payload.selectedDay || {});
  } catch (error) {
    target.innerHTML = `<p class="admin-daily-user-status is-error">${escapeHtml(error.message || "Daily users could not be loaded.")}</p>`;
  }
}

function renderResults(target, data) {
  const users = Array.isArray(data.users) ? data.users : [];
  const rows = users.map(user => {
    const foods = Number(user.food_logs || 0);
    const workouts = Number(user.workout_logs || 0);
    const activity = [];
    if (foods) activity.push(`<span class="is-food">${foods} food entr${foods === 1 ? "y" : "ies"}</span>`);
    if (workouts) activity.push(`<span class="is-workout">${workouts} workout${workouts === 1 ? "" : "s"}</span>`);
    if (!activity.length) activity.push(`<span class="is-none">No tracked logs that day</span>`);
    return `<div class="admin-daily-user-row"><div><strong>${escapeHtml(personName(user))} ${platformBadge(user.signup_platform)}</strong><small>${escapeHtml(user.email || "")}</small><em>Joined ${escapeHtml(formatTime(user.created_at))}${user.signup_app_version ? ` · v${escapeHtml(user.signup_app_version)}${user.signup_app_build ? ` (${escapeHtml(user.signup_app_build)})` : ""}` : ""}</em></div><div>${activity.join("")}</div></div>`;
  }).join("");
  const byPlatform = data.newUsersByPlatform || {};
  target.innerHTML = `<div class="admin-daily-user-summary"><div><span>Active users</span><strong>${number(data.activeUsers)}</strong></div><div><span>New accounts</span><strong>${number(data.newUsers)}</strong></div><div><span>iOS</span><strong>${number(byPlatform.ios)}</strong></div><div><span>PWA</span><strong>${number(byPlatform.pwa)}</strong></div><div><span>Unknown</span><strong>${number(byPlatform.unknown)}</strong></div></div>
    <div class="admin-daily-user-list">${rows || `<p class="admin-daily-user-status">No new accounts were created on this date.</p>`}</div>`;
}

function sessionToken() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.token || ""; }
  catch { return ""; }
}

function localToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Halifax", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function formatTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Halifax", hour: "numeric", minute: "2-digit" }).format(date);
}

function personName(user) { return user.display_name || String(user.email || "User").split("@")[0] || "User"; }
function platformBadge(platform) { const value = platform === "ios" ? "ios" : platform === "pwa" ? "pwa" : "unknown"; const label = value === "ios" ? "iOS" : value === "pwa" ? "PWA" : "Unknown"; return `<span class="admin-daily-platform is-${value}">${label}</span>`; }
function number(value) { return Number(value || 0).toLocaleString(); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" }[character])); }

function ensureStyles() {
  if (document.getElementById("admin-daily-user-query-styles")) return;
  const style = document.createElement("style");
  style.id = "admin-daily-user-query-styles";
  style.textContent = `
    .admin-daily-user-query{grid-column:1/-1}.admin-daily-user-form{display:grid;gap:7px;margin-top:14px}.admin-daily-user-form label{font-size:11px;font-weight:850}.admin-daily-user-form>div{display:grid;grid-template-columns:minmax(0,260px) auto;gap:8px;justify-content:start}.admin-daily-user-form input,.admin-daily-user-form button{min-height:44px;border:1px solid var(--line);border-radius:11px;font:inherit}.admin-daily-user-form input{padding:0 12px;background:var(--surface);color:var(--text);color-scheme:dark}.admin-daily-user-form button{padding:0 17px;background:var(--accent);color:var(--accent-contrast);font-weight:850}.admin-daily-user-summary{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin:15px 0}.admin-daily-user-summary>div{display:grid;gap:4px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-raised)}.admin-daily-user-summary span{color:var(--muted);font-size:10px}.admin-daily-user-summary strong{font-size:24px}.admin-daily-user-list{display:grid;gap:7px}.admin-daily-user-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--surface-raised)}.admin-daily-user-row>div:first-child{display:grid;gap:2px;min-width:0}.admin-daily-user-row strong{display:flex;align-items:center;gap:6px;font-size:13px}.admin-daily-platform{display:inline-flex;padding:2px 6px;border-radius:999px;font-size:8px;font-style:normal;letter-spacing:.04em}.admin-daily-platform.is-ios{background:rgba(59,130,246,.15);color:#8dc8ff}.admin-daily-platform.is-pwa{background:rgba(16,185,129,.15);color:#80e2bd}.admin-daily-platform.is-unknown{background:rgba(148,163,184,.12);color:#aaaab3}.admin-daily-user-row small,.admin-daily-user-row em{overflow:hidden;color:var(--muted);font-size:9px;font-style:normal;text-overflow:ellipsis}.admin-daily-user-row>div:last-child{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:5px}.admin-daily-user-row>div:last-child span{padding:5px 8px;border-radius:999px;font-size:9px;font-weight:800}.admin-daily-user-row .is-food{background:rgba(59,130,246,.14);color:#75aaff}.admin-daily-user-row .is-workout{background:rgba(239,68,68,.14);color:#ff7676}.admin-daily-user-row .is-none{background:rgba(148,163,184,.12);color:var(--muted)}.admin-daily-user-status{margin:14px 0 0;color:var(--muted);font-size:11px}.admin-daily-user-status.is-error{color:#ff7676}@media(max-width:640px){.admin-daily-user-form>div{grid-template-columns:1fr}.admin-daily-user-summary{grid-template-columns:1fr 1fr}.admin-daily-user-row{align-items:flex-start;display:grid}.admin-daily-user-row>div:last-child{justify-content:flex-start}.admin-daily-user-form input{font-size:16px}}
  `;
  document.head.appendChild(style);
}
