import { getCalculatedMaintenanceEstimate } from "./calculated-maintenance.js?v=nutrition-authority-sync-2";
import { getActiveNutritionPhase } from "./nutrition-phase.js?v=nutrition-authority-sync-2";

const SNAPSHOT_KEY = "level_up_weekly_tdee_estimate_v1";
const STYLE_ID = "level-up-nutrition-authority-sync-styles";
let queued = false;
let lastReviewSync = "";

install();

function install() {
    ensureStyles();
    schedule();
    new MutationObserver(schedule).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-weekly-calorie-review-ready"]
    });
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
        syncReviewCalculationToCurrentExpenditure(signals);
    });
}

function positive(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function finite(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function currentExpenditure(estimate) {
    return positive(estimate?.liveMaintenanceCalories)
        ?? positive(estimate?.maintenanceCalories)
        ?? positive(estimate?.profileEstimate);
}

function getAuthoritySignals() {
    const estimate = getCalculatedMaintenanceEstimate();
    const phase = getActiveNutritionPhase();
    return {
        estimate,
        phase,
        expenditure: currentExpenditure(estimate),
        // This is deliberately the exact Trend Weight rate consumed by the TDEE engine.
        // Do not calculate a separate phase-specific user-facing rate here.
        weightRate: finite(estimate?.weightRateLbPerWeek),
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
    const { estimate, phase, expenditure, weightRate, planBaseline, targetCalories } = signals;

    const calculated = document.getElementById("unified-calculated-maintenance");
    if (calculated) {
        setText(calculated, expenditure !== null ? formatCalories(expenditure) : estimate?.label || "Not enough data");
        setText(calculated.parentElement?.querySelector(":scope > span"), "Current Expenditure");
        const meta = document.getElementById("unified-calculated-maintenance-meta");
        if (meta) {
            const evidence = Number.isFinite(expenditure)
                ? `${estimate?.label || "Estimate"} · ${Number(estimate?.foodDays) || 0} food days · ${Number(estimate?.weighIns) || 0} weigh-ins`
                : `${Number(estimate?.foodDays) || 0}/2 food days · ${Number(estimate?.weighIns) || 0}/3 weigh-ins`;
            setText(meta, `${evidence} · identical to Progress → Nutrition`);
        }
    }

    const baselineLabel = document.querySelector('label[for="unified-maintenance"]');
    setText(baselineLabel, "Weekly Plan Baseline");
    const help = document.querySelector("#unified-goals-calories-card .unified-help");
    setText(help, "Current Expenditure is Level Up's one live TDEE estimate. The Weekly Plan Baseline is the expenditure value locked in at the last accepted review and used to hold your calorie target steady between reviews.");
    const choiceNote = document.querySelector("#unified-goals-calories-card .unified-maintenance-choice-note");
    if (choiceNote) choiceNote.innerHTML = "<strong>One TDEE, two jobs</strong> Current Expenditure updates from intake + Trend Weight. Your calorie target stays on the Weekly Plan Baseline until the next accepted weekly review.";

    const modeHelp = document.getElementById("unified-maintenance-mode-help");
    if (modeHelp) {
        setText(modeHelp, "Automatic reviews use the same Current Expenditure and Trend Weight shown in Progress. The saved calorie target only changes when a weekly review is applied.");
    }

    patchCurrentPhaseGrid(signals);
    ensureAuthorityStrip(signals);

    const input = document.getElementById("unified-maintenance");
    if (input && phase && planBaseline !== null && document.activeElement !== input) {
        const rounded = String(Math.round(planBaseline));
        if (input.value !== rounded) input.value = rounded;
    }

    const adultNote = document.querySelector("#unified-goals-calories-card .unified-adult-note");
    setText(adultNote, "Weight Trend and Current Expenditure are shared with Progress. Phase timing only controls when the calorie target may be updated; it does not create a second weight trend or a second TDEE.");
}

function patchCurrentPhaseGrid(signals) {
    const { expenditure, weightRate, targetCalories } = signals;
    document.querySelectorAll("#nutrition-current-phase .nutrition-current-phase-grid > div").forEach(cell => {
        const labelNode = cell.querySelector("span");
        const label = labelNode?.textContent?.trim() || "";
        const value = cell.querySelector("strong");
        if (!value) return;
        if (/current weekly trend|actual since start|phase weekly rate|weight trend/i.test(label)) {
            setText(labelNode, "Current Weight Trend");
            setText(value, formatRate(weightRate));
            return;
        }
        if (/maintenance|calculated tdee|current expenditure/i.test(label)) {
            setText(labelNode, "Current Expenditure");
            setText(value, formatCalories(expenditure));
            return;
        }
        if (/current calories|calorie target|daily target/i.test(label) && targetCalories !== null) {
            setText(labelNode, "Current Calorie Target");
            setText(value, formatCalories(targetCalories));
        }
    });
}

function ensureAuthorityStrip(signals) {
    const phaseCard = document.getElementById("nutrition-current-phase");
    if (!phaseCard) return;
    let strip = phaseCard.querySelector("[data-nutrition-authority-strip]");
    if (!strip) {
        strip = document.createElement("div");
        strip.className = "nutrition-authority-strip";
        strip.dataset.nutritionAuthorityStrip = "1";
        const grid = phaseCard.querySelector(".nutrition-current-phase-grid");
        if (grid) grid.insertAdjacentElement("afterend", strip);
        else phaseCard.appendChild(strip);
    }
    strip.innerHTML = `
        <div><span>Current Weight Trend</span><strong>${formatRate(signals.weightRate)}</strong><small>Same Trend Weight rate as Progress</small></div>
        <div><span>Current Expenditure</span><strong>${formatCalories(signals.expenditure)}</strong><small>Live TDEE · same as Progress</small></div>
        <div><span>Weekly Plan Baseline</span><strong>${formatCalories(signals.planBaseline)}</strong><small>Held from last accepted review</small></div>
        <div><span>Current Calorie Target</span><strong>${formatCalories(signals.targetCalories)}</strong><small>Changes only after review</small></div>`;
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
    setText(document.getElementById("unified-calculated-action-status"), "Current Expenditure added as your initial weekly plan baseline.");
    setText(button, "Added below ✓");
}

// The existing weekly review engine reads the weekly TDEE snapshot when it builds
// the recommendation. At the instant a review becomes ready, mirror the current
// live expenditure into that review snapshot so the recommendation uses the same
// TDEE visible in Progress. This does NOT change the phase baseline or calorie
// target; those remain unchanged until the user actually applies the review.
function syncReviewCalculationToCurrentExpenditure(signals) {
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

    if (Math.round(Number(snapshot.estimate.maintenanceCalories)) === rounded
        && Math.round(Number(snapshot.estimate.liveMaintenanceCalories)) === rounded
        && snapshot.estimate.reviewAuthoritySynchronized === true) return;

    snapshot.estimate = {
        ...snapshot.estimate,
        maintenanceCalories: rounded,
        liveMaintenanceCalories: rounded,
        uncappedMaintenanceCalories: rounded,
        reviewAuthoritySynchronized: true,
        reviewAuthoritySynchronizedAt: new Date().toISOString()
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

function patchWeeklyReviewModal(signals) {
    const modal = document.querySelector("[data-weekly-calorie-modal]");
    if (!modal) return;
    modal.querySelectorAll(".weekly-calorie-modal-breakdown > div").forEach(row => {
        const labelNode = row.querySelector("span");
        const label = labelNode?.textContent?.trim() || "";
        const value = row.querySelector("strong");
        if (!value) return;
        if (/current weight trend/i.test(label)) {
            setText(value, formatRate(signals.weightRate));
        }
        if (/independently calculated maintenance|current expenditure used for review/i.test(label)) {
            setText(labelNode, "Current Expenditure used for review");
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
        .nutrition-authority-strip{
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:8px;
            margin:12px 0;
        }
        .nutrition-authority-strip>div{
            padding:11px 12px;
            border:1px solid color-mix(in srgb,var(--text,#fff) 10%,transparent);
            border-radius:14px;
            background:color-mix(in srgb,var(--card,#1c1c1e) 97%,transparent);
        }
        .nutrition-authority-strip span,.nutrition-authority-strip small{display:block;color:var(--muted);font-size:9px}
        .nutrition-authority-strip strong{display:block;margin:4px 0;color:var(--text);font-size:14px}
        @media(max-width:520px){.nutrition-authority-strip{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
}
