import { getCalculatedMaintenanceEstimate } from "./calculated-maintenance.js?v=food-log-macro-bars-1";

const STYLE_ID = "level-up-tdee-live-display-styles";
let queued = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #calorie-progress .tdee-live-estimate-row strong { color: var(--accent, #45cb75); }
        #calorie-progress .tdee-live-context-note {
            display: block;
            margin-top: 5px;
            color: var(--text-secondary, #9696a0);
            font-size: 9px;
            line-height: 1.45;
        }
    `;
    document.head.appendChild(style);
}

function format(value) {
    return Math.round(Number(value)).toLocaleString();
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function syncCard(card) {
    const estimate = getCalculatedMaintenanceEstimate();
    if (!estimate) return;

    const reviewed = Number(estimate.maintenanceCalories);
    const live = Number(estimate.liveMaintenanceCalories ?? estimate.maintenanceCalories);
    const rate = Number(estimate.weightRateLbPerWeek);
    const correction = Number(estimate.energyCorrection);
    const breakdown = card.querySelector(".calculated-maintenance-breakdown");
    if (!breakdown) return;

    let row = breakdown.querySelector("[data-tdee-live-estimate-row]");
    if (!row) {
        row = document.createElement("div");
        row.className = "tdee-live-estimate-row";
        row.dataset.tdeeLiveEstimateRow = "1";
        row.innerHTML = "<span>Live TDEE from current data</span><strong>—</strong>";
        const correctionRow = [...breakdown.children].find(child => child.querySelector?.("span")?.textContent?.includes("TDEE correction"));
        correctionRow?.insertAdjacentElement("afterend", row);
        if (!row.isConnected) breakdown.prepend(row);
    }

    setText(row.querySelector("strong"), Number.isFinite(live) ? `${format(live)} cal/day` : "—");

    let note = row.querySelector(".tdee-live-context-note");
    if (!note) {
        note = document.createElement("small");
        note.className = "tdee-live-context-note";
        row.appendChild(note);
    }

    const reviewedDiffers = Number.isFinite(reviewed) && Number.isFinite(live) && Math.round(reviewed) !== Math.round(live);
    setText(
        note,
        reviewedDiffers
            ? `Your reviewed TDEE remains ${format(reviewed)} cal/day until the normal weekly review. The live value already reflects the current smoothed Weekly Trend.`
            : "This is the current-data estimate before weekly review stabilization."
    );

    const rateRow = [...breakdown.children].find(child => child.querySelector?.("span")?.textContent?.startsWith("Current "));
    if (rateRow && Number.isFinite(rate)) {
        setText(rateRow.querySelector("strong"), `${rate > 0 ? "+" : rate < 0 ? "−" : ""}${Math.abs(rate).toFixed(2)} lb/week`);
    }
    const correctionRow = [...breakdown.children].find(child => child.querySelector?.("span")?.textContent?.includes("TDEE correction"));
    if (correctionRow && Number.isFinite(correction)) {
        setText(correctionRow.querySelector("strong"), `${correction > 0 ? "+" : correction < 0 ? "−" : ""}${format(Math.abs(correction))} cal/day`);
    }
}

function refresh() {
    queued = false;
    ensureStyles();
    document.querySelectorAll("#calorie-progress .calculated-maintenance-card").forEach(syncCard);
}

function schedule() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(refresh);
}

const content = document.getElementById("content");
if (content) new MutationObserver(schedule).observe(content, { childList: true, subtree: true });
["pageshow", "levelup:nutrition-updated", "levelup:food-log-updated", "levelup:weight-updated"]
    .forEach(name => window.addEventListener(name, schedule));
document.addEventListener("click", event => {
    if (event.target.closest?.("#nutrition-progress-tab, [data-page='progress']")) window.setTimeout(schedule, 0);
}, true);

schedule();
