import { getActiveNutritionPhase, getActivePhaseMetrics } from "./nutrition-phase.js?v=calorie-authority-recovery-1";
import { getCalculatedMaintenanceEstimate } from "./calculated-maintenance.js?v=independent-tdee-staged-target-1";
import { getMaintenanceCheckIn, getMaintenanceUpdateMode } from "./maintenance-check-in.js?v=weekly-review-ready-indicator-2";
import { readAdjustmentHold } from "./calorie-adjustment-coordinator.js?v=independent-tdee-staged-target-1";
import { getLoggedCalorieWindow, localDateKey, previousDateKey } from "./food-log-data.js?v=adaptive-calorie-average-1";

const FIRST_CHECK_DAY = 14;
const WEEKLY_CADENCE_DAYS = 7;
const MIN_COMPLETE_FOOD_DAYS = 4;
const CHECK_STATE_KEY = "level_up_weekly_phase_checkin_state";
const STYLE_ID = "weekly-calorie-checkin-status-styles";
let started = false;
let refreshTimer = null;

function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, Number(value) || 0));
}

function shiftDateKey(value, days) {
    const date = new Date(`${value}T12:00:00`);
    if (!Number.isFinite(date.getTime())) return value;
    date.setDate(date.getDate() + days);
    return localDateKey(date);
}

function localDateFromIso(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? localDateKey(date) : null;
}

function daysBetween(startKey, endKey) {
    const start = new Date(`${startKey}T12:00:00`).getTime();
    const end = new Date(`${endKey}T12:00:00`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return Math.max(0, Math.round((end - start) / 86400000));
}

function formatWeekday(value) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isFinite(date.getTime())
        ? date.toLocaleDateString(undefined, { weekday: "long" })
        : "your next review day";
}

function formatDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isFinite(date.getTime())
        ? date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
        : "";
}

function phaseDayFromDate(phase, today = localDateKey()) {
    if (!phase?.startDate) return null;
    const start = new Date(`${phase.startDate}T12:00:00`).getTime();
    const end = new Date(`${today}T12:00:00`).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    return Math.max(1, Math.floor((end - start) / 86400000) + 1);
}

function recentFoodWindow() {
    const endDate = previousDateKey(localDateKey());
    let startDate = endDate;
    for (let day = 1; day < WEEKLY_CADENCE_DAYS; day += 1) startDate = previousDateKey(startDate);
    return getLoggedCalorieWindow({
        startDate,
        endDate,
        minLoggedDays: MIN_COMPLETE_FOOD_DAYS
    });
}

function readHandledCheck(phase) {
    if (!phase) return null;
    try {
        const state = JSON.parse(localStorage.getItem(CHECK_STATE_KEY) || "{}");
        const key = String(phase.id || `${phase.goalId || "phase"}|${phase.startDate || ""}`);
        return state?.[key] || null;
    } catch {
        return null;
    }
}

function authoritativeReviewReady(checkIn) {
    const shared = document.documentElement.dataset.weeklyCalorieReviewReady;
    if (shared === "true") return true;
    if (shared === "false") return false;
    return checkIn?.ready === true;
}

function holdReviewDate(hold) {
    const appliedDate = localDateFromIso(hold?.appliedAt);
    return appliedDate ? shiftDateKey(appliedDate, WEEKLY_CADENCE_DAYS) : null;
}

function missingDataCopy({ foodNeeded, needsWeighIn }) {
    const items = [];
    if (needsWeighIn) items.push("a new weigh-in");
    if (foodNeeded > 0) items.push(`${foodNeeded} more complete nutrition day${foodNeeded === 1 ? "" : "s"}`);
    if (!items.length) return "Keep logging completed nutrition days and weigh-ins so Level Up can finish the review.";
    if (items.length === 1) return `Log ${items[0]} to finish this check-in.`;
    return `Log ${items[0]} and ${items[1]} to finish this check-in.`;
}

export function getWeeklyCheckInStatus() {
    const phase = getActiveNutritionPhase();
    if (!phase) return null;

    const mode = getMaintenanceUpdateMode();
    const currentTarget = Number(phase.currentCalories ?? phase.startCalories);
    const estimate = getCalculatedMaintenanceEstimate();
    const metrics = getActivePhaseMetrics(phase, { rolling: true });
    const hold = readAdjustmentHold({ phase, currentCalories: currentTarget });
    const checkIn = getMaintenanceCheckIn({
        estimate,
        currentMaintenance: Number(phase.maintenanceCalories),
        currentTarget,
        adaptiveMetrics: metrics,
        adjustmentHold: hold
    });
    const food = recentFoodWindow();
    const trend = metrics?.trend || {};
    const today = localDateKey();
    const phaseDay = Number(trend.phaseDay) || phaseDayFromDate(phase, today) || 1;
    const checkDay = Number(trend.checkDay);
    const handled = readHandledCheck(phase);
    const handledCurrentCheck = Number.isFinite(checkDay)
        && Number(handled?.lastHandledCheckDay) === checkDay;
    const foodDays = Math.max(0, Number(food?.loggedDays) || 0);
    const foodNeeded = Math.max(0, MIN_COMPLETE_FOOD_DAYS - foodDays);
    const recentWeighIns = Math.max(0, Number(checkIn?.recentWeighIns ?? estimate?.recentWeighIns ?? estimate?.weighIns) || 0);
    const needsWeighIn = metrics?.status === "AWAITING WEIGH-IN" || recentWeighIns < 1;
    const reviewReady = mode !== "track" && authoritativeReviewReady(checkIn);
    const firstCheckDate = trend.nextCheckDate || shiftDateKey(phase.startDate, FIRST_CHECK_DAY - 1);
    const currentCheckDate = trend.checkDate || firstCheckDate;
    const nextCheckDate = trend.nextCheckDate || shiftDateKey(currentCheckDate, WEEKLY_CADENCE_DAYS);

    let state = "upcoming";
    let reviewDate = nextCheckDate;
    let headline = "";
    let detail = "";
    let context = "";
    let progress = 0;

    if (mode === "track") {
        state = "tracking";
        reviewDate = null;
        headline = "Weekly calorie reviews are paused";
        detail = "Tracking mode keeps your expenditure estimate informational and does not schedule calorie target updates.";
        context = "Switch back to Review or Automatic mode in Goals & Plan whenever you want weekly target check-ins.";
        progress = 0;
    } else if (hold) {
        state = "upcoming";
        reviewDate = holdReviewDate(hold) || shiftDateKey(today, hold.daysRemaining || WEEKLY_CADENCE_DAYS);
        const remaining = Math.max(0, Number(hold.daysRemaining) || 0);
        headline = remaining === 1 ? "Check-in tomorrow" : `Next check-in ${formatWeekday(reviewDate)}`;
        detail = `${remaining} day${remaining === 1 ? "" : "s"} remaining · ${formatDate(reviewDate)}`;
        context = "Your current calorie target is being held steady while Level Up measures the response.";
        progress = clamp(((WEEKLY_CADENCE_DAYS - remaining) / WEEKLY_CADENCE_DAYS) * 100);
    } else if (reviewReady) {
        state = "ready";
        reviewDate = currentCheckDate || today;
        headline = mode === "automatic" ? "Your weekly update is ready" : "Your calorie review is ready";
        detail = mode === "automatic"
            ? "Level Up will apply the coordinated weekly update automatically."
            : "Your latest Trend Weight and completed nutrition days are ready to review.";
        context = "Review one recommended daily calorie target, then Level Up waits seven days before another change.";
        progress = 100;
    } else if (phaseDay < FIRST_CHECK_DAY) {
        state = "upcoming";
        reviewDate = firstCheckDate;
        const remaining = Math.max(0, daysBetween(today, reviewDate) ?? (FIRST_CHECK_DAY - phaseDay));
        headline = remaining === 1 ? "First check-in tomorrow" : `First check-in ${formatWeekday(reviewDate)}`;
        detail = `${remaining} day${remaining === 1 ? "" : "s"} remaining · Phase Day ${phaseDay} of ${FIRST_CHECK_DAY}`;
        context = "Level Up builds your initial Trend Weight first. The first calorie decision is on Day 14.";
        progress = clamp(((phaseDay - 1) / (FIRST_CHECK_DAY - 1)) * 100);
    } else if (metrics?.status === "AWAITING WEIGH-IN") {
        state = "waiting";
        reviewDate = trend.awaitingNewWeighIn ? (trend.nextCheckDate || today) : (currentCheckDate || today);
        headline = "Check-in due — weigh-in needed";
        detail = missingDataCopy({ foodNeeded, needsWeighIn: true });
        context = `Scheduled for ${formatWeekday(reviewDate)}, ${formatDate(reviewDate)}. The review stays pending until a current weigh-in is available.`;
        progress = 100;
    } else if (metrics?.recommendationReady && foodNeeded > 0) {
        state = "waiting";
        reviewDate = currentCheckDate || today;
        headline = "Check-in due — nutrition data needed";
        detail = missingDataCopy({ foodNeeded, needsWeighIn: false });
        context = `Level Up needs at least ${MIN_COMPLETE_FOOD_DAYS} complete nutrition days from the previous 7 days before changing calories.`;
        progress = 100;
    } else if (handledCurrentCheck || (metrics?.recommendationReady && ["ON TRACK", "MAINTAINING"].includes(metrics.status))) {
        state = "upcoming";
        reviewDate = nextCheckDate;
        const remaining = Math.max(0, daysBetween(today, reviewDate) ?? WEEKLY_CADENCE_DAYS);
        headline = remaining === 1 ? "Check-in tomorrow" : `Next check-in ${formatWeekday(reviewDate)}`;
        detail = `${remaining} day${remaining === 1 ? "" : "s"} remaining · ${formatDate(reviewDate)}`;
        context = ["ON TRACK", "MAINTAINING"].includes(metrics?.status)
            ? "Your latest assessment did not call for a calorie change. Level Up will check again next week."
            : "Your last weekly check-in has been handled. Keep logging normally until the next review.";
        progress = clamp(((WEEKLY_CADENCE_DAYS - Math.min(WEEKLY_CADENCE_DAYS, remaining)) / WEEKLY_CADENCE_DAYS) * 100);
    } else if (metrics?.recommendationReady && foodNeeded === 0) {
        state = "upcoming";
        reviewDate = nextCheckDate;
        const remaining = Math.max(0, daysBetween(today, reviewDate) ?? WEEKLY_CADENCE_DAYS);
        headline = remaining === 1 ? "Check-in tomorrow" : `Next check-in ${formatWeekday(reviewDate)}`;
        detail = `${remaining} day${remaining === 1 ? "" : "s"} remaining · ${formatDate(reviewDate)}`;
        context = "Your latest assessment did not produce a target change. Level Up will reassess on the next weekly check-in.";
        progress = clamp(((WEEKLY_CADENCE_DAYS - Math.min(WEEKLY_CADENCE_DAYS, remaining)) / WEEKLY_CADENCE_DAYS) * 100);
    } else if (phaseDay >= FIRST_CHECK_DAY && (metrics?.status === "NEED MORE DATA" || foodNeeded > 0 || needsWeighIn)) {
        state = "waiting";
        reviewDate = currentCheckDate || today;
        headline = "Check-in due — more data needed";
        detail = missingDataCopy({ foodNeeded, needsWeighIn });
        context = "The scheduled date has arrived, but Level Up will not make a calorie decision from incomplete data.";
        progress = 100;
    } else {
        state = "upcoming";
        reviewDate = nextCheckDate;
        const remaining = Math.max(0, daysBetween(today, reviewDate) ?? WEEKLY_CADENCE_DAYS);
        headline = remaining === 1 ? "Check-in tomorrow" : remaining === 0 ? "Check-in today" : `Next check-in ${formatWeekday(reviewDate)}`;
        detail = remaining === 0 ? formatDate(reviewDate) : `${remaining} day${remaining === 1 ? "" : "s"} remaining · ${formatDate(reviewDate)}`;
        context = "Keep logging completed nutrition days and regular weigh-ins so the next review is ready on schedule.";
        progress = remaining === 0 ? 100 : clamp(((WEEKLY_CADENCE_DAYS - Math.min(WEEKLY_CADENCE_DAYS, remaining)) / WEEKLY_CADENCE_DAYS) * 100);
    }

    return {
        state,
        mode,
        reviewReady: state === "ready" && mode === "review",
        reviewDate,
        headline,
        detail,
        context,
        progress,
        phaseDay,
        foodDays,
        foodNeeded,
        recentWeighIns,
        needsWeighIn,
        currentTarget: Number.isFinite(currentTarget) ? Math.round(currentTarget) : null
    };
}

function badgeCopy(status) {
    if (status.state === "ready") return "READY";
    if (status.state === "waiting") return "ACTION NEEDED";
    if (status.state === "tracking") return "PAUSED";
    if (!status.reviewDate) return "WEEKLY";
    const remaining = daysBetween(localDateKey(), status.reviewDate);
    if (remaining === 0) return "TODAY";
    if (remaining === 1) return "TOMORROW";
    return `${remaining} DAYS`;
}

function dataMarkup(status) {
    const foodClass = status.foodNeeded > 0 ? " is-needed" : "";
    const weightClass = status.needsWeighIn ? " is-needed" : "";
    return `<div class="weekly-checkin-data" aria-label="Check-in data status">
        <span class="weekly-checkin-data-chip${foodClass}"><small>COMPLETE FOOD DAYS</small><strong>${status.foodDays}/${MIN_COMPLETE_FOOD_DAYS} min</strong></span>
        <span class="weekly-checkin-data-chip${weightClass}"><small>RECENT WEIGH-INS</small><strong>${status.recentWeighIns}${status.needsWeighIn ? " · new one needed" : ""}</strong></span>
    </div>`;
}

function mainCardMarkup(status) {
    return `<section class="weekly-checkin-card weekly-checkin-main-card is-${status.state}" data-weekly-checkin-surface="nutrition">
        <header class="weekly-checkin-head">
            <div><span class="eyebrow">WEEKLY CALORIE CHECK-IN</span><h3>${status.headline}</h3><p>${status.detail}</p></div>
            <b class="weekly-checkin-badge">${badgeCopy(status)}</b>
        </header>
        <div class="weekly-checkin-progress" aria-label="Weekly check-in progress"><i><b style="width:${status.progress}%"></b></i><small>${status.state === "tracking" ? "Weekly reviews paused" : status.phaseDay < FIRST_CHECK_DAY ? `Initial review progress · Day ${status.phaseDay} of ${FIRST_CHECK_DAY}` : "Weekly review cycle"}</small></div>
        ${dataMarkup(status)}
        <div class="weekly-checkin-context"><p>${status.context}</p><small>First calorie review: Day 14 · then every 7 days · completed nutrition days + Trend Weight.</small></div>
        ${status.reviewReady ? '<button type="button" class="weekly-checkin-review-btn" data-weekly-checkin-review>Review now</button>' : ""}
    </section>`;
}

function progressCardMarkup(status) {
    const dataLine = `Food ${status.foodDays}/${MIN_COMPLETE_FOOD_DAYS} min · ${status.recentWeighIns} recent weigh-in${status.recentWeighIns === 1 ? "" : "s"}`;
    return `<section class="weekly-checkin-progress-card is-${status.state}" data-weekly-checkin-surface="progress">
        <div class="weekly-checkin-progress-copy"><span>WEEKLY CALORIE CHECK-IN</span><strong>${status.headline}</strong><small>${status.detail} · ${dataLine}</small></div>
        ${status.reviewReady ? '<button type="button" data-weekly-checkin-review>Review now</button>' : '<b class="weekly-checkin-mini-badge">' + badgeCopy(status) + '</b>'}
    </section>`;
}

function dashboardCopy(status) {
    if (status.state === "ready") return "Calorie review ready";
    if (status.state === "waiting") return "Calorie check-in due · more data needed";
    if (status.state === "tracking") return "Weekly calorie reviews paused";
    const remaining = status.reviewDate ? daysBetween(localDateKey(), status.reviewDate) : null;
    if (remaining === 1) return "Next calorie check-in tomorrow";
    if (remaining === 0) return "Calorie check-in today";
    return `Next calorie check-in ${status.reviewDate ? formatWeekday(status.reviewDate) : "next week"}${Number.isFinite(remaining) ? ` · ${remaining} days` : ""}`;
}

function dashboardMarkup(status) {
    return `<button type="button" class="dashboard-weekly-checkin-reminder is-${status.state}" data-dashboard-weekly-checkin>
        <i aria-hidden="true"></i>
        <span><small>WEEKLY CALORIE CHECK-IN</small><strong>${dashboardCopy(status)}</strong></span>
        <em aria-hidden="true">›</em>
    </button>`;
}

function renderNutritionSurface(status) {
    document.querySelectorAll('[data-weekly-checkin-surface="nutrition"]').forEach(node => node.remove());
    if (!status) return;
    const currentPhase = document.getElementById("nutrition-current-phase");
    const planPanel = document.querySelector('[data-calories-panel="plan"]');
    if (!currentPhase && !planPanel) return;
    const template = document.createElement("template");
    template.innerHTML = mainCardMarkup(status).trim();
    const card = template.content.firstElementChild;
    if (currentPhase?.parentNode) currentPhase.insertAdjacentElement("afterend", card);
    else planPanel?.prepend(card);

    const legacy = document.querySelector(".maintenance-hub-alert");
    if (legacy) legacy.hidden = planPanel ? !planPanel.hidden : false;
}

function renderProgressSurface(status) {
    document.querySelectorAll('[data-weekly-checkin-surface="progress"]').forEach(node => node.remove());
    const page = document.querySelector("[data-progress-calorie-stats] .calorie-stats-page");
    if (!status || !page) return;
    const template = document.createElement("template");
    template.innerHTML = progressCardMarkup(status).trim();
    const card = template.content.firstElementChild;
    const ranges = page.querySelector(".calorie-stats-ranges");
    if (ranges) ranges.insertAdjacentElement("afterend", card);
    else page.querySelector("header")?.insertAdjacentElement("afterend", card);

    document.querySelectorAll(".progress-weekly-review-alert, .maintenance-check-in-alert").forEach(node => node.remove());
}

function renderDashboardSurface(status) {
    document.querySelectorAll(".dashboard-weekly-checkin-reminder").forEach(node => node.remove());
    const dashboard = document.querySelector(".dashboard");
    if (!status || !dashboard || status.state === "tracking") return;
    const template = document.createElement("template");
    template.innerHTML = dashboardMarkup(status).trim();
    const reminder = template.content.firstElementChild;
    const nutritionCard = dashboard.querySelector(".dashboard-food-summary-card");
    if (nutritionCard) nutritionCard.insertAdjacentElement("afterend", reminder);
    else dashboard.prepend(reminder);
}

function syncLegacyNutritionAlert() {
    const legacy = document.querySelector(".maintenance-hub-alert");
    const planPanel = document.querySelector('[data-calories-panel="plan"]');
    if (legacy && planPanel) legacy.hidden = !planPanel.hidden;
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .weekly-checkin-card,
        .weekly-checkin-progress-card,
        .dashboard-weekly-checkin-reminder{box-sizing:border-box;font-family:inherit}
        .weekly-checkin-main-card{display:grid;gap:14px;margin:14px 0;padding:16px;border:1px solid rgba(255,255,255,.11);border-radius:18px;background:rgba(255,255,255,.035);color:#f5f5f7}
        .weekly-checkin-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .weekly-checkin-head .eyebrow{display:block;color:var(--muscle-recovery-accent,#2f80ff);font-size:.66rem;font-weight:850;letter-spacing:.11em}
        .weekly-checkin-head h3{margin:5px 0 3px;color:inherit;font-size:1.05rem;line-height:1.18}
        .weekly-checkin-head p,.weekly-checkin-context p{margin:0;color:#aaa8b0;font-size:.78rem;line-height:1.4}
        .weekly-checkin-badge,.weekly-checkin-mini-badge{flex:0 0 auto;padding:6px 8px;border-radius:999px;background:rgba(47,128,255,.13);color:var(--muscle-recovery-accent,#2f80ff);font-size:.62rem;font-weight:900;letter-spacing:.06em;white-space:nowrap}
        .weekly-checkin-card.is-ready .weekly-checkin-badge,.weekly-checkin-progress-card.is-ready .weekly-checkin-mini-badge{background:rgba(53,211,180,.14);color:#35d3b4}
        .weekly-checkin-card.is-waiting .weekly-checkin-badge,.weekly-checkin-progress-card.is-waiting .weekly-checkin-mini-badge{background:rgba(245,185,66,.15);color:#f5b942}
        .weekly-checkin-card.is-tracking .weekly-checkin-badge,.weekly-checkin-progress-card.is-tracking .weekly-checkin-mini-badge{background:rgba(133,135,147,.15);color:#a3a6b0}
        .weekly-checkin-progress{display:grid;gap:6px}
        .weekly-checkin-progress>i{display:block;height:7px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.08)}
        .weekly-checkin-progress>i>b{display:block;height:100%;border-radius:inherit;background:var(--muscle-recovery-accent,#2f80ff);transition:width .2s ease}
        .weekly-checkin-card.is-ready .weekly-checkin-progress>i>b{background:#35d3b4}
        .weekly-checkin-card.is-waiting .weekly-checkin-progress>i>b{background:#f5b942}
        .weekly-checkin-progress>small{color:#8e8c95;font-size:.68rem;font-weight:700}
        .weekly-checkin-data{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .weekly-checkin-data-chip{display:grid;gap:3px;padding:10px 11px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(0,0,0,.12)}
        .weekly-checkin-data-chip small{color:#8e8c95;font-size:.57rem;font-weight:800;letter-spacing:.06em}
        .weekly-checkin-data-chip strong{color:inherit;font-size:.78rem}
        .weekly-checkin-data-chip.is-needed{border-color:rgba(245,185,66,.28);background:rgba(245,185,66,.06)}
        .weekly-checkin-context{display:grid;gap:6px}
        .weekly-checkin-context>small{color:#787780;font-size:.66rem;line-height:1.35}
        .weekly-checkin-review-btn,.weekly-checkin-progress-card>button{min-height:44px;border:0;border-radius:13px;background:#35d3b4;color:#0d1715;font:inherit;font-size:.82rem;font-weight:850}
        .weekly-checkin-progress-card{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0 15px;padding:13px 14px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.03);color:#f5f5f7}
        .weekly-checkin-progress-copy{display:grid;gap:3px;min-width:0}
        .weekly-checkin-progress-copy>span{color:var(--muscle-recovery-accent,#2f80ff);font-size:.58rem;font-weight:850;letter-spacing:.09em}
        .weekly-checkin-progress-copy>strong{color:inherit;font-size:.88rem;line-height:1.2}
        .weekly-checkin-progress-copy>small{color:#8e8c95;font-size:.66rem;line-height:1.35}
        .weekly-checkin-progress-card>button{min-height:38px;padding:0 12px;white-space:nowrap}
        .dashboard-weekly-checkin-reminder{grid-column:1/-1;display:flex;width:100%;align-items:center;gap:10px;padding:11px 13px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:rgba(255,255,255,.025);color:#f5f5f7;text-align:left}
        .dashboard-weekly-checkin-reminder>i{width:8px;height:8px;flex:0 0 auto;border-radius:50%;background:var(--muscle-recovery-accent,#2f80ff);box-shadow:0 0 0 4px color-mix(in srgb,var(--muscle-recovery-accent,#2f80ff) 14%,transparent)}
        .dashboard-weekly-checkin-reminder.is-ready>i{background:#35d3b4;box-shadow:0 0 0 4px rgba(53,211,180,.14)}
        .dashboard-weekly-checkin-reminder.is-waiting>i{background:#f5b942;box-shadow:0 0 0 4px rgba(245,185,66,.14)}
        .dashboard-weekly-checkin-reminder>span{display:grid;gap:2px;min-width:0;flex:1}
        .dashboard-weekly-checkin-reminder small{color:#8e8c95;font-size:.55rem;font-weight:850;letter-spacing:.08em}
        .dashboard-weekly-checkin-reminder strong{overflow:hidden;color:inherit;font-size:.78rem;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}
        .dashboard-weekly-checkin-reminder em{color:#8e8c95;font-size:1.25rem;font-style:normal}
        html[data-theme-mode="light"] .weekly-checkin-main-card,
        html[data-theme-mode="light"] .weekly-checkin-progress-card,
        html[data-theme-mode="light"] .dashboard-weekly-checkin-reminder{border-color:#cfdae8;background:#f8fbff;color:#152033;box-shadow:0 8px 24px rgba(43,72,107,.06)}
        html[data-theme-mode="light"] .weekly-checkin-head p,
        html[data-theme-mode="light"] .weekly-checkin-context p,
        html[data-theme-mode="light"] .weekly-checkin-progress-copy>small{color:#66758a}
        html[data-theme-mode="light"] .weekly-checkin-progress>i{background:#e4edf7}
        html[data-theme-mode="light"] .weekly-checkin-data-chip{border-color:#d9e3ef;background:#eef4fa}
        html[data-theme-mode="light"] .weekly-checkin-data-chip.is-needed{border-color:#ead08e;background:#fff9e9}
        html[data-theme-mode="light"] .weekly-checkin-data-chip small,
        html[data-theme-mode="light"] .weekly-checkin-progress>small,
        html[data-theme-mode="light"] .dashboard-weekly-checkin-reminder small,
        html[data-theme-mode="light"] .dashboard-weekly-checkin-reminder em{color:#75839a}
        @media(max-width:420px){.weekly-checkin-data{grid-template-columns:1fr}.weekly-checkin-head{gap:8px}.weekly-checkin-progress-card{align-items:flex-start}.dashboard-weekly-checkin-reminder strong{white-space:normal}}
    `;
    document.head.appendChild(style);
}

function openNutritionPlan() {
    document.querySelector('.nav-btn[data-page="energy"]')?.click();
    window.setTimeout(() => document.querySelector('[data-calories-tab="plan"]')?.click(), 100);
    scheduleRefresh(180);
}

function refresh() {
    ensureStyles();
    const status = getWeeklyCheckInStatus();
    renderNutritionSurface(status);
    renderProgressSurface(status);
    renderDashboardSurface(status);
    syncLegacyNutritionAlert();
}

function scheduleRefresh(delay = 0) {
    if (refreshTimer) window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        refresh();
    }, delay);
}

export function initializeWeeklyCheckInStatus() {
    if (started) return;
    started = true;
    ensureStyles();

    [
        "levelup:food-log-updated",
        "levelup:weight-updated",
        "levelup:nutrition-updated",
        "levelup:nutrition-phase-updated",
        "levelup:maintenance-check-in-updated",
        "levelup:maintenance-mode-updated",
        "levelup:weekly-calorie-review-readiness",
        "levelup:calorie-target-applied"
    ].forEach(name => window.addEventListener(name, () => scheduleRefresh(0)));

    window.addEventListener("pageshow", () => scheduleRefresh(0));
    window.addEventListener("levelup:appearance-change", () => scheduleRefresh(0));

    document.addEventListener("click", event => {
        if (event.target.closest?.("[data-weekly-checkin-review]")) {
            window.dispatchEvent(new CustomEvent("levelup:open-weekly-calorie-review"));
            return;
        }
        if (event.target.closest?.("[data-dashboard-weekly-checkin]")) {
            openNutritionPlan();
            return;
        }
        if (event.target.closest?.('.nav-btn, [data-calories-tab], [data-calorie-stats-range], [data-tdee-chart-range]')) {
            scheduleRefresh(120);
            window.setTimeout(() => scheduleRefresh(0), 320);
        }
    });

    scheduleRefresh(60);
    window.setTimeout(() => scheduleRefresh(0), 420);
}

if (typeof window !== "undefined" && typeof document !== "undefined") initializeWeeklyCheckInStatus();
