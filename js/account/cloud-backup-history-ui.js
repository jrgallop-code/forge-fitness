import {
    restoreBackupSnapshot,
    verifyBackupSnapshot
} from "../core/backup-manager.js?v=backup-complete-6";

const API_URL = "https://api.leveluphypertrophy.com";
const SESSION_KEY = "level_up_cloud_session";
const LAST_SYNC_KEY = "level_up_cloud_last_sync";
const AUTO_STATE_KEY = "level_up_cloud_auto_backup_state";
const STYLE_ID = "level-up-backup-history-ui-styles";

installBackupHistoryRecovery();

function installBackupHistoryRecovery() {
    ensureStyles();
    document.addEventListener("click", event => {
        const restoreButton = event.target.closest?.("#account-cloud-download");
        if (restoreButton) {
            event.preventDefault();
            event.stopImmediatePropagation();
            void openBackupHistory(restoreButton);
            return;
        }

        const closeButton = event.target.closest?.("[data-close-backup-history]");
        if (closeButton) {
            event.preventDefault();
            closePanel();
            return;
        }

        const versionButton = event.target.closest?.("[data-restore-backup-version]");
        if (versionButton) {
            event.preventDefault();
            event.stopImmediatePropagation();
            void restoreVersion(Number(versionButton.dataset.restoreBackupVersion), versionButton);
        }
    }, true);
}

async function openBackupHistory(trigger) {
    const panel = ensurePanel(trigger);
    panel.hidden = false;
    const list = panel.querySelector("[data-backup-history-list]");
    const status = panel.querySelector("[data-backup-history-status]");
    if (list) list.innerHTML = `<div class="account-backup-history-loading">Checking your saved backups…</div>`;
    if (status) status.textContent = "";

    try {
        const result = await api("/v1/backup/history");
        renderHistory(panel, result.backups || [], result.recommendedVersion);
    }
    catch (error) {
        if (list) list.innerHTML = "";
        if (status) {
            status.textContent = error.message || "Saved backups could not be loaded.";
            status.dataset.status = "error";
        }
    }

    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function ensurePanel(trigger) {
    let panel = document.querySelector("[data-backup-history-panel]");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.className = "account-backup-history-panel";
    panel.dataset.backupHistoryPanel = "1";
    panel.hidden = true;
    panel.innerHTML = `
        <div class="account-backup-history-heading">
            <div>
                <span class="eyebrow">RECOVERY</span>
                <h3>Restore a saved backup</h3>
                <p>Level Up keeps up to 20 cloud versions and recommends the newest copy that still contains your established history.</p>
            </div>
            <button type="button" class="account-backup-history-close" data-close-backup-history aria-label="Close backup history">×</button>
        </div>
        <div class="account-backup-history-notice">
            Restoring changes this device only. Your cloud backup history is kept so you can choose another version if needed.
        </div>
        <div class="account-backup-history-list" data-backup-history-list></div>
        <p class="account-backup-history-status" data-backup-history-status aria-live="polite"></p>`;

    const card = trigger.closest?.(".account-cloud-card");
    const anchor = card?.querySelector?.(".account-cloud-status");
    if (anchor) anchor.insertAdjacentElement("afterend", panel);
    else card?.appendChild(panel);
    return panel;
}

function renderHistory(panel, backups, recommendedVersion) {
    const list = panel.querySelector("[data-backup-history-list]");
    const status = panel.querySelector("[data-backup-history-status]");
    if (!list || !status) return;

    status.textContent = "";
    status.dataset.status = "";

    if (!backups.length) {
        list.innerHTML = `<div class="account-backup-history-empty">No cloud backup versions are available for this account yet.</div>`;
        return;
    }

    list.innerHTML = backups.map(entry => {
        const summary = entry.summary || {};
        const recommended = Number(entry.version) === Number(recommendedVersion) || entry.recommended === true;
        const reduced = entry.health === "reduced";
        const healthCopy = reduced
            ? "Contains less history than another saved copy"
            : recommended
                ? "Newest healthy recovery point"
                : "Saved recovery point";
        const reasonCopy = reduced && Array.isArray(entry.healthReasons) && entry.healthReasons.length
            ? `<small class="account-backup-history-reasons">${escapeHtml(entry.healthReasons.slice(0, 2).join(" · "))}</small>`
            : "";

        return `<article class="account-backup-history-item${recommended ? " is-recommended" : ""}${reduced ? " is-reduced" : ""}">
            <div class="account-backup-history-item-top">
                <div>
                    <strong>${escapeHtml(formatDate(entry.created_at || entry.client_exported_at))}</strong>
                    <span>Version ${Number(entry.version)}</span>
                </div>
                ${recommended ? `<span class="account-backup-history-badge is-recommended">RECOMMENDED</span>` : reduced ? `<span class="account-backup-history-badge is-reduced">CHECK</span>` : `<span class="account-backup-history-badge">SAVED</span>`}
            </div>
            <div class="account-backup-history-stats">
                <span><b>${number(summary.completedWorkouts)}</b> workouts</span>
                <span><b>${number(summary.weighIns)}</b> weigh-ins</span>
                <span><b>${number(summary.foodLogDays)}</b> food days</span>
                <span><b>${number(summary.measurements)}</b> measurements</span>
            </div>
            <p>${escapeHtml(healthCopy)}</p>
            ${reasonCopy}
            <button type="button" class="${recommended ? "primary-btn" : "secondary-btn"}" data-restore-backup-version="${Number(entry.version)}">
                ${recommended ? "Restore recommended backup" : "Restore this backup"}
            </button>
        </article>`;
    }).join("");
}

async function restoreVersion(version, button) {
    if (!Number.isInteger(version) || version <= 0) return;
    const panel = button.closest?.("[data-backup-history-panel]");
    const status = panel?.querySelector?.("[data-backup-history-status]");

    try {
        setBusy(button, true, "Checking backup…");
        if (status) {
            status.textContent = "Verifying the selected backup…";
            status.dataset.status = "";
        }

        const result = await api(`/v1/backup/history/${version}`);
        verifyBackupSnapshot(result.backup);
        const summary = recoverySummary(result.backup);
        const confirmed = window.confirm(
            `Restore cloud backup version ${version} from ${formatDate(result.createdAt || result.clientExportedAt)}?\n\n` +
            `${summary.completedWorkouts} workouts · ${summary.weighIns} weigh-ins · ${summary.foodLogDays} food-log days\n\n` +
            `Included local sections on this device will be replaced. Your other cloud backup versions will remain available.`
        );
        if (!confirmed) {
            if (status) status.textContent = "Restore cancelled.";
            return;
        }

        setBusy(button, true, "Restoring…");
        await restoreBackupSnapshot(result.backup, { removeNullValues: true });

        const completedAt = new Date().toISOString();
        localStorage.setItem(LAST_SYNC_KEY, JSON.stringify({
            direction: "history-restore",
            updatedAt: result.createdAt || result.clientExportedAt || completedAt,
            version,
            completedAt
        }));
        localStorage.setItem(AUTO_STATE_KEY, JSON.stringify({
            version,
            status: "history-restored",
            restoredAt: completedAt
        }));

        window.alert("Backup restored successfully. Your saved cloud versions were kept. Level Up will reload now.");
        window.location.reload();
    }
    catch (error) {
        if (status) {
            status.textContent = error.message || "This backup could not be restored.";
            status.dataset.status = "error";
        }
    }
    finally {
        setBusy(button, false);
    }
}

function recoverySummary(backup) {
    const data = backup?.data || {};
    return {
        completedWorkouts: arrayLength(data.forge_workout_sessions),
        weighIns: arrayLength(data.forge_weight_entries),
        foodLogDays: countFoodLogDays(data.level_up_food_log_v1)
    };
}

async function api(path) {
    const token = sessionToken();
    if (!token) throw new Error("Sign in is required to view cloud backup history.");
    let response;
    try {
        response = await fetch(`${API_URL}${path}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });
    }
    catch {
        throw new Error("Level Up cloud could not be reached. Check your connection and try again.");
    }
    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw new Error(payload.error || "Cloud backup history could not be loaded.");
    return payload;
}

function sessionToken() {
    try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        if (!session?.token) return "";
        if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now()) return "";
        return session.token;
    }
    catch { return ""; }
}

function closePanel() {
    const panel = document.querySelector("[data-backup-history-panel]");
    if (panel) panel.hidden = true;
}

function setBusy(button, busy, busyLabel = "") {
    if (!button) return;
    if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent.trim();
    button.disabled = busy;
    button.textContent = busy ? busyLabel : button.dataset.defaultLabel;
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Saved backup";
    return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function arrayLength(value) {
    return Array.isArray(value) ? value.length : 0;
}

function countFoodLogDays(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
    return Object.values(value).filter(day => hasLoggedFood(day)).length;
}

function hasLoggedFood(day) {
    if (Array.isArray(day)) return day.length > 0;
    if (!day || typeof day !== "object") return false;
    return Object.values(day).some(value => {
        if (Array.isArray(value)) return value.length > 0;
        if (value && typeof value === "object") return Object.keys(value).length > 0;
        return Boolean(value);
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .account-backup-history-panel[hidden]{display:none!important}
        .account-backup-history-panel{margin-top:18px;padding-top:18px;border-top:1px solid color-mix(in srgb,var(--text,#fff) 12%,transparent)}
        .account-backup-history-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
        .account-backup-history-heading h3{margin:5px 0 6px;color:var(--text,#fff)}
        .account-backup-history-heading p{margin:0;color:var(--muted,#a5a5aa);font-size:13px;line-height:1.45}
        .account-backup-history-close{flex:0 0 36px;width:36px;height:36px;border:1px solid color-mix(in srgb,var(--text,#fff) 14%,transparent);border-radius:50%;background:color-mix(in srgb,var(--surface,#151518) 92%,transparent);color:var(--text,#fff);font-size:23px;line-height:1;cursor:pointer}
        .account-backup-history-notice{margin:14px 0;padding:11px 12px;border-radius:12px;background:color-mix(in srgb,var(--accent,#ef3348) 9%,var(--surface,#151518));color:var(--text,#fff);font-size:12px;line-height:1.45}
        .account-backup-history-list{display:grid;gap:10px}
        .account-backup-history-item{padding:14px;border:1px solid color-mix(in srgb,var(--text,#fff) 11%,transparent);border-radius:16px;background:color-mix(in srgb,var(--surface,#151518) 96%,transparent)}
        .account-backup-history-item.is-recommended{border-color:color-mix(in srgb,var(--accent,#ef3348) 55%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--accent,#ef3348) 18%,transparent)}
        .account-backup-history-item.is-reduced{opacity:.78}
        .account-backup-history-item-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
        .account-backup-history-item-top>div{display:grid;gap:3px}
        .account-backup-history-item-top strong{color:var(--text,#fff);font-size:14px}
        .account-backup-history-item-top span{color:var(--muted,#a5a5aa);font-size:11px}
        .account-backup-history-badge{padding:5px 7px;border-radius:999px;border:1px solid color-mix(in srgb,var(--text,#fff) 14%,transparent);color:var(--muted,#a5a5aa)!important;font-size:9px!important;font-weight:900;letter-spacing:.08em}
        .account-backup-history-badge.is-recommended{border-color:color-mix(in srgb,var(--accent,#ef3348) 45%,transparent);background:color-mix(in srgb,var(--accent,#ef3348) 12%,transparent);color:var(--accent,#ef3348)!important}
        .account-backup-history-badge.is-reduced{color:var(--muted,#a5a5aa)!important}
        .account-backup-history-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:12px 0}
        .account-backup-history-stats span{padding:8px 9px;border-radius:10px;background:color-mix(in srgb,var(--text,#fff) 5%,transparent);color:var(--muted,#a5a5aa);font-size:11px}
        .account-backup-history-stats b{color:var(--text,#fff);font-size:13px}
        .account-backup-history-item p{margin:0 0 10px;color:var(--muted,#a5a5aa);font-size:12px}
        .account-backup-history-reasons{display:block;margin:-4px 0 10px;color:var(--muted,#a5a5aa);font-size:10px;line-height:1.4}
        .account-backup-history-item button{width:100%;min-height:44px}
        .account-backup-history-status{min-height:0;margin:10px 0 0;color:var(--muted,#a5a5aa);font-size:12px}
        .account-backup-history-status[data-status="error"]{color:#ff6676}
        .account-backup-history-loading,.account-backup-history-empty{padding:18px 8px;text-align:center;color:var(--muted,#a5a5aa);font-size:13px}
    `;
    document.head.appendChild(style);
}
