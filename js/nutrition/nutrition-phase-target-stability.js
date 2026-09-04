import { getActiveNutritionPhase, getActivePhaseMetrics } from "./nutrition-phase.js?v=nutrition-phase-target-stability-2";

const STYLE_ID = "level-up-phase-target-stability-styles";
let queued = false;
let syncing = false;

// Older phase helpers already respect this flag. Declaring the authority here
// prevents them from briefly swapping the saved calorie target for a projected
// recommendation before the unified nutrition authority restores the real value.
window.__levelUpFullAdjustmentAuthority = true;

install();

function install() {
    ensureStyles();
    syncSavedTarget();

    new MutationObserver(mutations => {
        if (syncing) return;
        // Target surfaces are corrected in the observer microtask rather than a
        // later animation frame, so an old/blank value cannot reach the screen.
        if (mutationsTouchTargetSurface(mutations)) syncSavedTarget();
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

    [
        "levelup:nutrition-updated",
        "levelup:nutrition-phase-updated",
        "levelup:maintenance-check-in-updated",
        "levelup:weekly-calorie-review-readiness",
        "levelup:calorie-target-applied"
    ].forEach(name => window.addEventListener(name, schedule));
}

function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        syncSavedTarget();
    });
}

function savedTargetState() {
    const phase = getActiveNutritionPhase();
    const calories = Number(phase?.currentCalories ?? phase?.startCalories);
    const metrics = phase ? getActivePhaseMetrics(phase, { rolling: true }) : null;
    return {
        phase,
        metrics,
        calories: Number.isFinite(calories) && calories > 0 ? Math.round(calories) : null
    };
}

function mutationsTouchTargetSurface(mutations) {
    for (const mutation of mutations) {
        const target = mutation.target?.nodeType === Node.ELEMENT_NODE
            ? mutation.target
            : mutation.target?.parentElement;
        if (target?.closest?.("#nutrition-current-phase, #weight-progress, [data-phase-calorie-suggestion], #weight-calorie-suggestion-card")) {
            return true;
        }

        for (const node of mutation.addedNodes || []) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            if (node.matches?.("#nutrition-current-phase, #weight-progress, [data-phase-calorie-suggestion], #weight-calorie-suggestion-card")
                || node.querySelector?.("#nutrition-current-phase, #weight-progress, [data-phase-calorie-suggestion], #weight-calorie-suggestion-card")) {
                return true;
            }
        }
    }
    return false;
}

function ensureStableTargetCards(calories) {
    const display = `${calories.toLocaleString()} kcal/day`;

    const phaseCard = document.getElementById("nutrition-current-phase");
    const phaseGrid = phaseCard?.querySelector(".nutrition-current-phase-grid");
    if (phaseGrid && !phaseCard.querySelector("[data-phase-calorie-suggestion]")) {
        const card = document.createElement("div");
        card.className = "phase-calorie-suggestion-card";
        card.setAttribute("data-phase-calorie-suggestion", "");
        card.innerHTML = `
            <span>Current Calorie Target</span>
            <strong>${display}</strong>
            <small>Active target · changes only when a weekly review is applied</small>
        `;
        phaseGrid.insertAdjacentElement("afterend", card);
    }

    const weightPage = document.getElementById("weight-progress");
    const summary = weightPage?.querySelector(".weight-summary");
    if (weightPage && summary) {
        let card = document.getElementById("weight-calorie-suggestion-card");
        if (!card) {
            card = document.createElement("div");
            card.id = "weight-calorie-suggestion-card";
            card.className = "metric-card weight-calorie-suggestion-card";
            card.innerHTML = `
                <div>
                    <h3>Current Calorie Target</h3>
                    <p id="weight-calorie-suggestion">${display}</p>
                    <small id="weight-calorie-suggestion-total">Active target · changes only when a weekly review is applied</small>
                </div>
            `;
        }

        // Keep the calorie target in the same horizontal metric carousel as the
        // weight metrics, immediately beside the Phase Weekly Rate/weight-change card.
        const rateCard = document.getElementById("weight-phase-rate")?.closest(".metric-card");
        if (rateCard?.parentElement === summary) {
            if (rateCard.nextElementSibling !== card) rateCard.insertAdjacentElement("afterend", card);
        }
        else if (card.parentElement !== summary) {
            summary.appendChild(card);
        }
    }
}

function syncSavedTarget() {
    if (syncing) return;
    const { phase, metrics, calories } = savedTargetState();
    if (!phase || calories === null) return;

    syncing = true;
    try {
        ensureStableTargetCards(calories);
        const display = `${calories.toLocaleString()} kcal/day`;
        const futureTestActive = metrics?.isFutureTest === true;

        const phaseCard = document.getElementById("nutrition-current-phase");
        if (phaseCard) {
            const suggestion = phaseCard.querySelector("[data-phase-calorie-suggestion]");
            if (suggestion) {
                setText(suggestion.querySelector("span"), "Current Calorie Target");
                setText(suggestion.querySelector("strong"), display);
                const note = suggestion.querySelector("small");
                if (note && !/review|reassess|applied|target/i.test(note.textContent || "")) {
                    setText(note, "Active target · changes only when a weekly review is applied");
                }
            }

            phaseCard.querySelectorAll(".nutrition-current-phase-grid > div").forEach(cell => {
                const label = cell.querySelector("span")?.textContent?.trim() || "";
                if (!/current calories|calorie target|daily target/i.test(label)) return;
                setText(cell.querySelector("span"), "Current Calorie Target");
                setText(cell.querySelector("strong"), display);
            });
        }

        // Future-weight testing intentionally owns the Weight Progress calorie value
        // so the user can preview the simulated recommendation. Otherwise the saved
        // target is authoritative and is written before the browser paints.
        if (!futureTestActive) {
            setText(document.getElementById("weight-calorie-suggestion"), display);
            const secondary = document.getElementById("weight-calorie-suggestion-total");
            if (secondary && !secondary.textContent?.trim()) {
                setText(secondary, "Active target · changes only when a weekly review is applied");
            }
        }
    } finally {
        syncing = false;
    }
}

function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #nutrition-current-phase [data-phase-calorie-suggestion],
        #nutrition-current-phase [data-phase-calorie-suggestion] strong,
        #nutrition-current-phase .nutrition-current-phase-grid strong,
        #weight-calorie-suggestion-card,
        #weight-calorie-suggestion{
            transition:none!important;
            animation:none!important;
        }
        .phase-calorie-suggestion-card{
            margin-top:16px;
            padding:14px;
            border:1px solid var(--border,rgba(255,255,255,.1));
            border-radius:16px;
            background:var(--card,#15151a);
        }
        .phase-calorie-suggestion-card span,
        .phase-calorie-suggestion-card small{display:block}
        .phase-calorie-suggestion-card strong{display:block;margin:4px 0;font-size:20px}
        #weight-progress .weight-summary #weight-calorie-suggestion-card{margin-top:0!important}
        #weight-progress .weight-summary #weight-calorie-suggestion-card>div{padding:0!important}
        #weight-progress .weight-summary #weight-calorie-suggestion-card h3{margin:0;font-size:10px;line-height:1.2}
        #weight-progress .weight-summary #weight-calorie-suggestion{margin-top:5px;font-size:16px;line-height:1.12;font-weight:800}
        #weight-progress .weight-summary #weight-calorie-suggestion-total{display:block;margin-top:3px;color:var(--muted);font-size:10px;line-height:1.25}
    `;
    document.head.appendChild(style);
}
