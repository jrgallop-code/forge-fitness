import { getCalculatedMaintenanceEstimate } from "./calculated-maintenance.js?v=nutrition-authority-sync-1";
import { getActiveNutritionPhase, getActivePhaseMetrics } from "./nutrition-phase.js?v=nutrition-authority-sync-1";

const SNAPSHOT_KEY = "level_up_weekly_tdee_estimate_v1";
const STYLE_ID = "level-up-nutrition-authority-sync-styles";
let queued = false;
let lastReviewSync = "";

install();

function install() {
    ensureStyles();
    schedule();
    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-weekly-calorie-review-ready"] });
    [
        "levelup:nutrition-updated",
        "levelup:nutrition-phase-updated",
        "levelup:maintenance-check-in-updated",
        "levelup:weekly-calorie-review-readiness",
        "levelup:body-composition-updated",
        "levelup:weight-updated"
    ].forEach(name => window.addEventListener(name, schedule));
    document.addEventListener("click", handleInitialPlanCalculatedTdee, true);
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        const signals = getAuthoritySignals();
        patchNutritionPhase(signals);
        patchWeeklyReviewModal(signals);
        syncWeeklyReviewBaseline(signals);
    });
}

function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function currentExpenditure(estimate) {
    return positive(estimate?.liveMaintenanceCalories) ?? positive(estimate?.maintenanceCalories) ?? positive(estimate?.profileEstimate);
}

function getAuthoritySignals() {
    const estimate = getCalculatedMaintenanceEstimate();
    const phase = getActiveNutritionPhase();
    const metrics = phase ? getActivePhaseMetrics(phase, { rolling: true }) : null;
    return {
        estimate,
        phase,
        metrics,
        expenditure: currentExpenditure(estimate),
        planBaseline: positive(phase?.maintenanceCalories),
        targetCalories: positive(phase?.currentCalories ?? phase?.startCalories)
    };
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function formatCalories(value) {
    return Number.isFinite(Number(value)) ? `${Math.round(Number(value)).toLocaleString()} kcal/day` : "—";
}

function formatRate(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "Need more data";
    const sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return `${sign}${Math.abs(number).toFixed(2)} lb/week`;
}

function patchNutritionPhase(signals) {
    const { estimate, phase, metrics, expenditure, planBaseline, targetCalories } = signals;

    const calculated = document.getElementById("unified-calculated-maintenance");
    if (calculated) {
        setText(calculated, expenditure !== null ? formatCalories(expenditure) : estimate?.label || "Not enough data");
        setText(calculated.parentElement?.querySelector(":scope > span"), "Current Expenditure");
        const meta = document.getElementById("unified-calculated-maintenance-meta");
        if (meta) {
            const evidence = Number.isFinite(expenditure)
                ? `${estimate?.label || "Estimate"} · ${Number(estimate?.foodDays) || 0} food days · ${Number(estimate?.weighIns) || 0} weigh-ins`
                : `${Number(estimate?.foodDays) || 0}/2 food days · ${Number(estimate?.weighIns) || 0}/3 weigh-ins`;
            setText(meta, `${evidence} · same daily expenditure shown in Progress`);
        }
    }

    const baselineLabel = document.querySelector('label[for="unified-maintenance"]');
    setText(baselineLabel, "Weekly Plan Baseline");
    const help = document.querySelector("#unified-goals-calories-card .unified-help");
    setText(help, "This is the saved expenditure baseline from your current plan or last weekly review. Current Expenditure can update daily, but your calorie target changes only during the weekly review.");
    const choiceNote = document.querySelector("#unified-goals-calories-card .unified-maintenance-choice-note");
    if (choiceNote) choiceNote.innerHTML = "<strong>One expenditure estimate</strong> Level Up uses the live Current Expenditure shown in Progress. At a weekly review, that value becomes the new plan baseline before the calorie target is calculated.";

    const modeHelp = document.getElementById("unified-maintenance-mode-help");
    if (modeHelp && modeHelp.textContent?.includes("maintenance estimate")) {
        modeHelp.textContent = modeHelp.textContent.replace(/maintenance estimate/gi, "Current Expenditure estimate");
    }

    document.querySelectorAll("#nutrition-current-phase .nutrition-current-phase-grid > div").forEach(cell => {
        const label = cell.querySelector("span")?.textContent?.trim() || "";
        const value = cell.querySelector("strong");
        if (!value) return;
        if (/current weekly trend|actual since start|phase weekly rate|weight trend/i.test(label)) {
            setText(value, formatRate(metrics?.actualRateLbPerWeek));
            return;
        }
        if (/maintenance|calculated tdee|current expenditure/i.test(label)) {
            setText(cell.querySelector("span"), "Current Expenditure");
            setText(value, formatCalories(expenditure));
            return;
        }
        if (/current calories|calorie target|daily target/i.test(label) && targetCalories !== null) {
            setText(value, formatCalories(targetCalories));
        }
    });

    const input = document.getElementById("unified-maintenance");
    if (input && phase && planBaseline !== null && document.activeElement !== input) {
        const rounded = String(Math.round(planBaseline));
        if (input.value !== rounded) input.value = rounded;
    }

    const adultNote = document.querySelector("#unified-goals-calories-card .unified-adult-note");
    setText(adultNote, "Phase timing controls when Level Up can change calories. The displayed weight rate itself is the same smoothed Trend Weight rate used in Progress and expenditure calculations.");
}

function handleInitialPlanCalculatedTdee(event) {
    const button = event.target.closest?.("#unified-use-calculated");
    if (!button) return;
    const phase = getActiveNutritionPhase();
    if (phase) return;
    const estimate = getCalculatedMaintenanceEstimate();
    const expenditure = currentExpenditure(estimate);
    if (expenditure === null) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const input = document.getElementById("unified-maintenance");
    if (!input) return;
    input.value = String(Math.round(expenditure));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setText(document.getElementById("unified-calculated-action-status"), "Current Expenditure added as your initial plan baseline.");
    setText(button, "Added below ✓");
}

function syncWeeklyReviewBaseline(signals) {
    if (document.documentElement.dataset.weeklyCalorieReviewReady !== "true") return;
    const live = positive(signals.expenditure);
    if (live === null) return;

    let snapshot;
    try { snapshot = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null"); }
    catch { snapshot = null; }
    if (!snapshot?.estimate || typeof snapshot.estimate !== "object") return;

    const rounded = Math.round(live);
    const signature = `${snapshot.reviewedAt || ""}|${rounded}`;
    if (signature === lastReviewSync) return;
    lastReviewSync = signature;

    const previous = Number(snapshot.estimate.maintenanceCalories);
    if (Math.round(previous) === rounded && snapshot.estimate.authoritySynchronized === true) return;

    snapshot.estimate = {
        ...snapshot.estimate,
        maintenanceCalories: rounded,
        liveMaintenanceCalories: rounded,
        uncappedMaintenanceCalories: rounded,
        authoritySynchronized: true,
        authoritySynchronizedAt: new Date().toISOString()
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function patchWeeklyReviewModal(signals) {
    const modal = document.querySelector("[data-weekly-calorie-modal]");
    if (!modal) return;
    modal.querySelectorAll(".weekly-calorie-modal-breakdown > div").forEach(row => {
        const label = row.querySelector("span")?.textContent?.trim() || "";
        const value = row.querySelector("strong");
        if (!value) return;
        if (/current weight trend/i.test(label)) {
            setText(value, formatRate(signals.metrics?.actualRateLbPerWeek));
        }
        if (/independently calculated maintenance|current expenditure used for review/i.test(label)) {
            setText(row.querySelector("span"), "Current expenditure used for review");
            setText(value, formatCalories(signals.expenditure));
        }
    });
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #unified-goals-calories-card .unified-calculated-maintenance > div > span::after{
            content:" · LIVE";
            color:var(--accent);
            font-size:9px;
            font-weight:900;
            letter-spacing:.05em;
        }
        #unified-goals-calories-card label[for="unified-maintenance"]::after{
            content:" · WEEKLY";
            color:var(--muted);
            font-size:9px;
            font-weight:850;
            letter-spacing:.05em;
        }
    `;
    document.head.appendChild(style);
}
