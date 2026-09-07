const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_owner_session";
const STYLE_ID = "owner-active-user-activity-styles";
let currentPayload = null;
let selectedUserId = "";
let observer = null;

export function initializeActiveUserActivity() {
  ensureStyles();
  attachPanelWhenReady();

  const range = document.getElementById("admin-analytics-range");
  range?.addEventListener("change", () => {
    selectedUserId = "";
    window.setTimeout(() => loadActivity(Number(range.value || 30)), 30);
  });

  if (!observer) {
    observer = new MutationObserver(() => attachPanelWhenReady());
    const content = document.getElementById("admin-analytics-content");
    if (content) observer.observe(content, { childList: true, subtree: true });
  }

  loadActivity(Number(range?.value || 30));
}

function sessionToken() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null")?.token || ""; }
  catch { return ""; }
}

async function loadActivity(days) {
  const panel = attachPanelWhenReady();
  const status = panel?.querySelector("[data-user-activity-status]");
  if (status) status.textContent = "Loading active users…";

  const token = sessionToken();
  if (!token) {
    if (status) status.textContent = "Owner sign-in required.";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/v1/admin/analytics?days=${Math.max(7, Math.min(365, Number(days) || 30))}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "User activity could not be loaded.");
    currentPayload = data;
    renderPanel();
  } catch (error) {
    if (status) status.textContent = error.message || "User activity could not be loaded.";
  }
}

function attachPanelWhenReady() {
  const content = document.getElementById("admin-analytics-content");
  const grid = content?.querySelector(".admin-analytics-grid");
  if (!grid) return document.getElementById("admin-active-user-activity");

  let panel = document.getElementById("admin-active-user-activity");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "admin-active-user-activity";
    panel.className = "admin-analytics-card admin-analytics-wide admin-active-user-activity";
    panel.innerHTML = `
      <div class="admin-analytics-card-head">
        <div>
          <span class="eyebrow">ACTIVE USER HISTORY</span>
          <h3>User activity dates</h3>
          <p>Select an active user to see when they logged food or completed workouts.</p>
        </div>
      </div>
      <div data-user-activity-status class="admin-user-activity-status">Loading active users…</div>`;
    grid.prepend(panel);
    if (currentPayload) requestAnimationFrame(renderPanel);
  }
  return panel;
}

function renderPanel() {
  const panel = attachPanelWhenReady();
  if (!panel || !currentPayload) return;

  const users = Array.isArray(currentPayload.activeUsers) ? currentPayload.activeUsers : [];
  const activity = Array.isArray(currentPayload.userActivity) ? currentPayload.userActivity : [];
  const days = Number(currentPayload.userActivityDays || currentPayload.days || 30);

  if (!users.length) {
    panel.innerHTML = `${panelHeading()}<p class="admin-user-activity-empty">No active users in the last 7 days.</p>`;
    return;
  }

  if (!selectedUserId || !users.some(user => String(user.user_id) === String(selectedUserId))) {
    selectedUserId = String(users[0]?.user_id || "");
  }

  panel.innerHTML = `
    ${panelHeading()}
    <div class="admin-user-activity-picker">
      <label for="admin-active-user-select">Active user</label>
      <select id="admin-active-user-select">
        ${users.map(user => `<option value="${escapeHtml(user.user_id)}"${String(user.user_id) === selectedUserId ? " selected" : ""}>${escapeHtml(userLabel(user))}</option>`).join("")}
      </select>
      <small>${users.length} active user${users.length === 1 ? "" : "s"} in the last 7 days · showing log dates from the selected ${days}-day analytics range.</small>
    </div>
    <div id="admin-active-user-detail"></div>`;

  panel.querySelector("#admin-active-user-select")?.addEventListener("change", event => {
    selectedUserId = String(event.target.value || "");
    renderDetail();
  });

  renderDetail(activity, users);
}

function panelHeading() {
  return `<div class="admin-analytics-card-head"><div><span class="eyebrow">ACTIVE USER HISTORY</span><h3>User activity dates</h3><p>Select an active user to see when they logged food or completed workouts.</p></div></div>`;
}

function renderDetail(activity = currentPayload?.userActivity || [], users = currentPayload?.activeUsers || []) {
  const target = document.getElementById("admin-active-user-detail");
  if (!target) return;
  const user = users.find(item => String(item.user_id) === String(selectedUserId));
  if (!user) {
    target.innerHTML = `<p class="admin-user-activity-empty">Select an active user.</p>`;
    return;
  }

  const rows = activity.filter(item => String(item.user_id) === String(selectedUserId));
  const foodDates = groupDates(rows.filter(item => item.activity_type === "food"));
  const workoutDates = groupDates(rows.filter(item => item.activity_type === "workout"));

  target.innerHTML = `
    <div class="admin-user-activity-person">
      <div><strong>${escapeHtml(personName(user))}</strong><small>${escapeHtml(user.email || "")}</small></div>
      <span>Last active ${escapeHtml(formatTime(user.last_active_at))}</span>
    </div>
    <div class="admin-user-activity-columns">
      ${renderDateColumn("Workout dates", workoutDates, "workouts")}
      ${renderDateColumn("Food log dates", foodDates, "foods")}
    </div>`;
}

function groupDates(rows) {
  const counts = new Map();
  rows.forEach(row => {
    const key = localDateKey(row.occurred_at);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function renderDateColumn(title, rows, noun) {
  if (!rows.length) {
    return `<section class="admin-user-activity-column"><h4>${escapeHtml(title)}</h4><p class="admin-user-activity-empty">No ${escapeHtml(noun)} logged in this period.</p></section>`;
  }
  return `<section class="admin-user-activity-column"><h4>${escapeHtml(title)}</h4><div class="admin-user-activity-dates">${rows.map(([date, count]) => `<div><span>${escapeHtml(formatDateKey(date))}</span><strong>${count}</strong></div>`).join("")}</div></section>`;
}

function localDateKey(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: currentPayload?.timeZone || "America/Halifax",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function formatDateKey(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: currentPayload?.timeZone || "America/Halifax",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function personName(person) {
  return person.display_name || String(person.email || "User").split("@")[0] || "User";
}

function userLabel(user) {
  const name = personName(user);
  return user.email && user.email !== name ? `${name} · ${user.email}` : name;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" }[character]));
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .admin-active-user-activity{grid-column:1/-1}
    .admin-user-activity-picker{display:grid;gap:7px;margin-top:14px;padding:14px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:14px;background:var(--surface-raised,rgba(255,255,255,.035))}
    .admin-user-activity-picker label{font-size:11px;font-weight:850;color:var(--text,#f4f4f6)}
    .admin-user-activity-picker select{width:100%;min-height:46px;padding:0 12px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:11px;background:var(--surface,#111114);color:var(--text,#f4f4f6);font:inherit;font-size:14px}
    .admin-user-activity-picker small,.admin-user-activity-person small,.admin-user-activity-person span{color:var(--muted,#8f8f98);font-size:10px;line-height:1.4}
    .admin-user-activity-person{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-top:12px;padding:12px 2px}
    .admin-user-activity-person>div{display:grid;gap:3px;min-width:0}.admin-user-activity-person strong{color:var(--text,#f4f4f6);font-size:14px}.admin-user-activity-person small{overflow:hidden;text-overflow:ellipsis}
    .admin-user-activity-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .admin-user-activity-column{min-width:0;padding:13px;border:1px solid var(--line,rgba(255,255,255,.1));border-radius:13px;background:var(--surface-raised,rgba(255,255,255,.025))}
    .admin-user-activity-column h4{margin:0 0 9px;color:var(--text,#f4f4f6);font-size:12px}
    .admin-user-activity-dates{display:grid;gap:6px;max-height:260px;overflow:auto;padding-right:2px}
    .admin-user-activity-dates>div{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 9px;border-radius:9px;background:var(--surface,rgba(255,255,255,.035));color:var(--text,#f4f4f6);font-size:11px}
    .admin-user-activity-dates strong{display:grid;place-items:center;min-width:25px;height:25px;padding:0 7px;border-radius:999px;background:var(--accent-soft,rgba(47,128,255,.14));color:var(--accent-text,var(--accent,#2f80ff));font-size:10px}
    .admin-user-activity-empty,.admin-user-activity-status{margin:10px 0 0;color:var(--muted,#8f8f98);font-size:11px}
    @media(max-width:640px){.admin-user-activity-columns{grid-template-columns:1fr}.admin-user-activity-person{display:grid}.admin-user-activity-picker select{font-size:16px}}
  `;
  document.head.appendChild(style);
}
