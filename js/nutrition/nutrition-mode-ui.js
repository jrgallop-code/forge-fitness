import { clearPendingMaintenanceReview, getMaintenanceUpdateMode, setMaintenanceUpdateMode } from "./maintenance-check-in.js?v=calorie-authority-recovery-1";
import { getActiveNutritionPhase, saveNutritionPhase } from "./nutrition-phase.js?v=calorie-authority-recovery-1";
import { getNutritionPlan, setCurrentCalories } from "./nutrition-storage.js?v=calorie-authority-recovery-1";

const STYLE_ID = "nutrition-mode-ui-styles";
const CARD_ID = "nutrition-mode-card";
const ONBOARDING_ID = "onboarding-nutrition-mode";
const MANUAL_TARGET_KEY = "level_up_manual_calorie_target_v1";
let queued = false;
let started = false;
let enforcingManualTarget = false;

function coachIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18V8m0 10h16M7 14l4-4 3 2 4-6"/><circle cx="18" cy="6" r="2"/></svg>`;
}

function manualIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h3"/></svg>`;
}

function modeState() {
    const updateMode = getMaintenanceUpdateMode();
    return {
        updateMode,
        mode: updateMode === "track" ? "manual" : "coach",
        coachApplyMode: updateMode === "automatic" ? "automatic" : "review"
    };
}

function activeTarget() {
    const phase = getActiveNutritionPhase();
    const plan = getNutritionPlan();
    const value = Number(phase?.currentCalories ?? phase?.startCalories ?? plan?.calculatedCalories ?? plan?.currentCalories);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function readManualTarget() {
    const value = Math.round(Number(localStorage.getItem(MANUAL_TARGET_KEY)));
    return Number.isFinite(value) && value >= 500 ? value : null;
}

function seedManualTarget() {
    const existing = readManualTarget();
    if (existing) return existing;
    const current = activeTarget();
    if (current) localStorage.setItem(MANUAL_TARGET_KEY, String(current));
    return current;
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .nutrition-mode-card{display:grid;gap:14px;margin:14px 0 16px;padding:16px;border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(255,255,255,.03);color:#f7f7f8}
        .nutrition-mode-card-header{display:grid;gap:4px}
        .nutrition-mode-card-header>span{color:var(--muscle-recovery-accent,#2f80ff);font-size:.63rem;font-weight:900;letter-spacing:.11em}
        .nutrition-mode-card-header h3{margin:0;font-size:1.05rem;line-height:1.2}
        .nutrition-mode-card-header p{margin:0;color:#9b9ba4;font-size:.73rem;line-height:1.42}
        .nutrition-mode-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
        .nutrition-mode-option{position:relative;display:flex;min-width:0;min-height:126px;padding:12px;border:1px solid rgba(255,255,255,.09);border-radius:15px;background:rgba(0,0,0,.13);color:inherit;text-align:left;flex-direction:column;gap:7px;font:inherit}
        .nutrition-mode-option.is-selected{border-color:color-mix(in srgb,var(--muscle-recovery-accent,#2f80ff) 60%,transparent);background:color-mix(in srgb,var(--muscle-recovery-accent,#2f80ff) 9%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--muscle-recovery-accent,#2f80ff) 12%,transparent)}
        .nutrition-mode-option-icon{display:grid;width:31px;height:31px;place-items:center;border-radius:10px;background:rgba(255,255,255,.055);color:var(--muscle-recovery-accent,#2f80ff)}
        .nutrition-mode-option-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        .nutrition-mode-option strong{font-size:.86rem;line-height:1.15}
        .nutrition-mode-option small{color:#92919a;font-size:.64rem;line-height:1.35}
        .nutrition-mode-option em{position:absolute;top:10px;right:10px;padding:4px 6px;border-radius:999px;background:rgba(53,211,180,.13);color:#35d3b4;font-size:.5rem;font-style:normal;font-weight:900;letter-spacing:.05em}
        .nutrition-mode-controls{display:grid;gap:9px;padding-top:2px}
        .nutrition-mode-controls>span{color:#8f8f98;font-size:.59rem;font-weight:850;letter-spacing:.07em}
        .nutrition-coach-choice{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
        .nutrition-coach-choice button{min-height:42px;padding:9px 10px;border:1px solid rgba(255,255,255,.09);border-radius:12px;background:rgba(255,255,255,.025);color:#aaa9b1;font:inherit;font-size:.69rem;font-weight:800}
        .nutrition-coach-choice button.is-selected{border-color:rgba(53,211,180,.4);background:rgba(53,211,180,.09);color:#dffff9}
        .nutrition-mode-explainer{margin:0;color:#8f8f98;font-size:.67rem;line-height:1.4}
        .nutrition-manual-target{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
        .nutrition-manual-target label{display:grid;gap:5px;color:#8f8f98;font-size:.61rem;font-weight:800;letter-spacing:.04em}
        .nutrition-manual-target input{min-width:0;height:43px;box-sizing:border-box;padding:0 12px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(0,0,0,.16);color:inherit;font:inherit;font-size:.93rem;font-weight:800}
        .nutrition-manual-target button{min-height:43px;padding:0 13px;border:0;border-radius:12px;background:var(--muscle-recovery-accent,#2f80ff);color:#fff;font:inherit;font-size:.7rem;font-weight:850}
        .nutrition-manual-status{min-height:16px;color:#8f8f98;font-size:.64rem;line-height:1.35}
        .unified-maintenance-mode{display:none!important}
        html[data-nutrition-mode="manual"] .weekly-checkin-card,
        html[data-nutrition-mode="manual"] .weekly-checkin-progress-card,
        html[data-nutrition-mode="manual"] .dashboard-weekly-checkin-reminder,
        html[data-nutrition-mode="manual"] .maintenance-hub-alert,
        html[data-nutrition-mode="manual"] .progress-weekly-review-alert,
        html[data-nutrition-mode="manual"] .maintenance-check-in-alert,
        html[data-nutrition-mode="manual"] .dashboard-habit-card--checkins,
        html[data-nutrition-mode="manual"] .activity-calendar-legend-checkin{display:none!important}
        html[data-nutrition-mode="manual"] #unified-goals-calories-card .unified-calorie-summary{display:none!important}
        .onboarding-nutrition-mode{display:grid;gap:10px;margin-top:17px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)}
        .onboarding-nutrition-mode>div:first-child{display:grid;gap:3px}
        .onboarding-nutrition-mode>div:first-child span{color:var(--accent-text,#ff4d5d);font-size:.61rem;font-weight:900;letter-spacing:.1em}
        .onboarding-nutrition-mode>div:first-child strong{font-size:.95rem}
        .onboarding-nutrition-mode>div:first-child small{color:#9a99a2;font-size:.68rem;line-height:1.35}
        .onboarding-nutrition-mode-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .onboarding-nutrition-mode-option{position:relative;display:grid;gap:5px;min-height:112px;padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:15px;background:rgba(255,255,255,.025);color:inherit;text-align:left;font:inherit}
        .onboarding-nutrition-mode-option.selected{border-color:var(--accent-text,#ff4d5d);background:color-mix(in srgb,var(--accent-text,#ff4d5d) 8%,transparent)}
        .onboarding-nutrition-mode-option strong{font-size:.82rem}
        .onboarding-nutrition-mode-option small{color:#92919a;font-size:.63rem;line-height:1.34}
        .onboarding-nutrition-mode-option em{position:absolute;top:9px;right:9px;padding:4px 6px;border-radius:999px;background:rgba(53,211,180,.14);color:#35d3b4;font-size:.48rem;font-style:normal;font-weight:900}
        html[data-theme-mode="light"] .nutrition-mode-card{border-color:#cfdae8;background:#f8fbff;color:#152033;box-shadow:0 8px 24px rgba(43,72,107,.05)}
        html[data-theme-mode="light"] .nutrition-mode-card-header p,
        html[data-theme-mode="light"] .nutrition-mode-option small,
        html[data-theme-mode="light"] .nutrition-mode-explainer,
        html[data-theme-mode="light"] .nutrition-manual-status{color:#66758a}
        html[data-theme-mode="light"] .nutrition-mode-option{border-color:#d7e1ed;background:#eef4fa}
        html[data-theme-mode="light"] .nutrition-mode-option.is-selected{background:#e7f0ff}
        html[data-theme-mode="light"] .nutrition-coach-choice button{border-color:#d7e1ed;background:#eef4fa;color:#526279}
        html[data-theme-mode="light"] .nutrition-manual-target input{border-color:#ccd8e6;background:#fff;color:#152033}
        @media(max-width:390px){.nutrition-mode-options,.onboarding-nutrition-mode-options{grid-template-columns:1fr}.nutrition-manual-target{grid-template-columns:1fr}.nutrition-manual-target button{width:100%}}
    `;
    document.head.appendChild(style);
}

function removeCheckInSurfaces() {
    document.querySelectorAll(`
        .weekly-checkin-card,
        .weekly-checkin-progress-card,
        .dashboard-weekly-checkin-reminder,
        .maintenance-hub-alert,
        .progress-weekly-review-alert,
        .maintenance-check-in-alert
    `).forEach(node => node.remove());
    document.querySelector('.nav-btn[data-page="energy"] .maintenance-nav-badge')?.remove();
}

function enforceManualTarget() {
    if (enforcingManualTarget || getMaintenanceUpdateMode() !== "track") return;
    const target = readManualTarget();
    if (!target) return;
    enforcingManualTarget = true;
    try {
        const phase = getActiveNutritionPhase();
        const phaseTarget = Math.round(Number(phase?.currentCalories ?? phase?.startCalories));
        const maintenance = Number(phase?.maintenanceCalories);
        if (phase?.goalId && Number.isFinite(maintenance) && maintenance > 0 && phaseTarget !== target) {
            saveNutritionPhase({
                goalId: phase.goalId,
                maintenanceCalories: maintenance,
                targetCalories: target
            });
        }
        const planTarget = Math.round(Number(getNutritionPlan()?.calculatedCalories));
        if (planTarget !== target) setCurrentCalories(target, "Manual nutrition target");
    } finally {
        enforcingManualTarget = false;
    }
}

function applyModeToDocument() {
    const state = modeState();
    document.documentElement.dataset.nutritionMode = state.mode;
    if (state.mode === "manual") {
        removeCheckInSurfaces();
        enforceManualTarget();
    }
    return state;
}

function modeCardMarkup(state) {
    const target = state.mode === "manual" ? (readManualTarget() || activeTarget()) : activeTarget();
    return `
        <header class="nutrition-mode-card-header">
            <span>NUTRITION MODE</span>
            <h3>How should Level Up handle your calories?</h3>
            <p>Choose whether Level Up coaches your target or simply tracks the target you set.</p>
        </header>
        <div class="nutrition-mode-options" role="radiogroup" aria-label="Nutrition mode">
            <button type="button" class="nutrition-mode-option ${state.mode === "coach" ? "is-selected" : ""}" data-nutrition-mode-choice="coach" role="radio" aria-checked="${state.mode === "coach"}">
                <span class="nutrition-mode-option-icon">${coachIcon()}</span><strong>Level Up Coach</strong><small>Level Up sets your target and reviews it weekly from your goal, completed food logs and Trend Weight.</small><em>RECOMMENDED</em>
            </button>
            <button type="button" class="nutrition-mode-option ${state.mode === "manual" ? "is-selected" : ""}" data-nutrition-mode-choice="manual" role="radio" aria-checked="${state.mode === "manual"}">
                <span class="nutrition-mode-option-icon">${manualIcon()}</span><strong>Track Manually</strong><small>You choose your calorie target. Food logging and analytics stay active, but Level Up never runs calorie check-ins or changes your target.</small>
            </button>
        </div>
        ${state.mode === "coach" ? `
            <div class="nutrition-mode-controls">
                <span>WEEKLY CHANGES</span>
                <div class="nutrition-coach-choice" role="radiogroup" aria-label="Weekly calorie change preference">
                    <button type="button" class="${state.coachApplyMode === "review" ? "is-selected" : ""}" data-coach-update-choice="review" role="radio" aria-checked="${state.coachApplyMode === "review"}">Review before applying</button>
                    <button type="button" class="${state.coachApplyMode === "automatic" ? "is-selected" : ""}" data-coach-update-choice="automatic" role="radio" aria-checked="${state.coachApplyMode === "automatic"}">Apply automatically</button>
                </div>
                <p class="nutrition-mode-explainer">Your first calorie review is on Day 14, then every 7 days. Review mode asks first; Automatic applies qualifying updates for you.</p>
            </div>
        ` : `
            <div class="nutrition-mode-controls">
                <span>YOUR DAILY TARGET</span>
                <div class="nutrition-manual-target">
                    <label>Calories per day<input type="number" min="500" step="25" inputmode="numeric" value="${target ?? ""}" placeholder="e.g. 2800" data-manual-calorie-target></label>
                    <button type="button" data-save-manual-calorie-target>Save target</button>
                </div>
                <p class="nutrition-mode-explainer">Manual mode keeps calorie and macro logging, weight trends and expenditure analytics. Your phase still describes the direction you want your weight to move, but it does not control calories. Weekly check-in cards, reminders and calendar check-ins are turned off.</p>
                <small class="nutrition-manual-status" data-manual-calorie-status>${target ? `Current manual target: ${target.toLocaleString()} kcal/day.` : "Enter the calorie target you want to follow."}</small>
            </div>
        `}
    `;
}

function syncSaveButtonLabel(host, state) {
    const button = host?.querySelector("#unified-save-plan");
    if (!button) return;
    if (state.mode === "manual") {
        if (!button.dataset.coachLabel) button.dataset.coachLabel = button.textContent || "Save";
        button.textContent = "Save Phase";
    } else if (button.dataset.coachLabel) {
        button.textContent = button.dataset.coachLabel;
        delete button.dataset.coachLabel;
    }
}

function renderGoalsModeCard() {
    const host = document.getElementById("unified-goals-calories-card");
    if (!host) return;
    const state = applyModeToDocument();
    const targetForSignature = state.mode === "manual" ? (readManualTarget() || activeTarget() || 0) : (activeTarget() || 0);
    const signature = `${state.mode}:${state.coachApplyMode}:${targetForSignature}`;
    let card = document.getElementById(CARD_ID);
    if (!card) {
        card = document.createElement("section");
        card.id = CARD_ID;
        card.className = "nutrition-mode-card";
        const currentPhase = host.querySelector("#nutrition-current-phase");
        if (currentPhase) currentPhase.insertAdjacentElement("afterend", card);
        else host.prepend(card);
    }
    if (card.dataset.signature !== signature) {
        card.dataset.signature = signature;
        card.innerHTML = modeCardMarkup(state);
    }
    host.querySelector(".unified-maintenance-mode")?.setAttribute("hidden", "");
    syncSaveButtonLabel(host, state);
}

function onboardingMarkup(state) {
    return `
        <div><span>NUTRITION</span><strong>How should Level Up handle your calories?</strong><small>You can change this later in Nutrition → Goals & Plan.</small></div>
        <div class="onboarding-nutrition-mode-options" role="radiogroup" aria-label="Nutrition mode">
            <button type="button" class="onboarding-nutrition-mode-option ${state.mode === "coach" ? "selected" : ""}" data-onboarding-nutrition-mode="coach" role="radio" aria-checked="${state.mode === "coach"}">
                <strong>Level Up Coach</strong><small>Set and review my calorie target using my goal, food logs and Trend Weight.</small><em>RECOMMENDED</em>
            </button>
            <button type="button" class="onboarding-nutrition-mode-option ${state.mode === "manual" ? "selected" : ""}" data-onboarding-nutrition-mode="manual" role="radio" aria-checked="${state.mode === "manual"}">
                <strong>Track Manually</strong><small>I'll choose my calorie target. Do not show weekly calorie check-ins or adjust it for me.</small>
            </button>
        </div>
    `;
}

function renderOnboardingMode() {
    const screen = document.querySelector(".levelup-onboarding .onboarding-goal-screen");
    if (!screen) return;
    const state = applyModeToDocument();
    const signature = `${state.mode}:${state.coachApplyMode}`;
    let section = screen.querySelector(`#${ONBOARDING_ID}`);
    if (!section) {
        section = document.createElement("section");
        section.id = ONBOARDING_ID;
        section.className = "onboarding-nutrition-mode";
        screen.querySelector(".onboarding-goal-grid")?.insertAdjacentElement("afterend", section);
    }
    if (section && section.dataset.signature !== signature) {
        section.dataset.signature = signature;
        section.innerHTML = onboardingMarkup(state);
    }
}

function setPrimaryMode(mode) {
    const current = getMaintenanceUpdateMode();
    if (mode === "manual") {
        seedManualTarget();
        clearPendingMaintenanceReview();
        setMaintenanceUpdateMode("track");
    } else {
        setMaintenanceUpdateMode(current === "automatic" ? "automatic" : "review");
    }
    applyModeToDocument();
    window.dispatchEvent(new CustomEvent("levelup:nutrition-mode-updated", { detail: { mode } }));
    queueSync();
}

function setCoachApplyMode(mode) {
    if (!new Set(["review", "automatic"]).has(mode)) return;
    setMaintenanceUpdateMode(mode);
    applyModeToDocument();
    window.dispatchEvent(new CustomEvent("levelup:nutrition-mode-updated", { detail: { mode: "coach", updateMode: mode } }));
    queueSync();
}

function saveManualTarget(button) {
    const card = button.closest(`#${CARD_ID}`);
    const input = card?.querySelector("[data-manual-calorie-target]");
    const status = card?.querySelector("[data-manual-calorie-status]");
    const calories = Math.round(Number(input?.value));
    if (!Number.isFinite(calories) || calories < 500) {
        if (status) status.textContent = "Enter a valid daily calorie target.";
        input?.focus();
        return;
    }

    localStorage.setItem(MANUAL_TARGET_KEY, String(calories));
    clearPendingMaintenanceReview();
    setMaintenanceUpdateMode("track");
    enforceManualTarget();
    applyModeToDocument();
    if (status) status.textContent = `Manual target saved: ${calories.toLocaleString()} kcal/day. Weekly calorie check-ins are off.`;
    window.dispatchEvent(new CustomEvent("levelup:nutrition-mode-updated", { detail: { mode: "manual", calories } }));
    window.dispatchEvent(new CustomEvent("levelup:calorie-target-applied", { detail: { calories, source: "manual-nutrition-mode" } }));
    window.setTimeout(queueSync, 80);
}

function sync() {
    ensureStyles();
    applyModeToDocument();
    renderGoalsModeCard();
    renderOnboardingMode();
}

function queueSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
        queued = false;
        sync();
    });
}

export function initializeNutritionModeUI() {
    if (started) return;
    started = true;
    ensureStyles();
    applyModeToDocument();

    document.addEventListener("click", event => {
        const primary = event.target.closest?.("[data-nutrition-mode-choice]");
        if (primary) {
            setPrimaryMode(primary.dataset.nutritionModeChoice);
            return;
        }
        const coachChoice = event.target.closest?.("[data-coach-update-choice]");
        if (coachChoice) {
            setCoachApplyMode(coachChoice.dataset.coachUpdateChoice);
            return;
        }
        const onboarding = event.target.closest?.("[data-onboarding-nutrition-mode]");
        if (onboarding) {
            setPrimaryMode(onboarding.dataset.onboardingNutritionMode);
            return;
        }
        const saveManual = event.target.closest?.("[data-save-manual-calorie-target]");
        if (saveManual) saveManualTarget(saveManual);
    });

    [
        "levelup:maintenance-mode-updated",
        "levelup:nutrition-updated",
        "levelup:nutrition-phase-updated",
        "levelup:calorie-target-applied",
        "levelup:appearance-change"
    ].forEach(name => window.addEventListener(name, queueSync));

    const observer = new MutationObserver(queueSync);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("pageshow", queueSync);
    queueSync();
}

if (typeof window !== "undefined" && typeof document !== "undefined") initializeNutritionModeUI();
