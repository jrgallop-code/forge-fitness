import {
    getActiveTargetSource,
    setActiveTargetSource,
    getAutoTarget,
    getManualTarget,
    syncSelectedTargetToPlan
}
from "./active-calorie-target.js?v=active-target-1";

const CALCULATION_MODE_KEY = "level_up_goal_calculation_mode";
const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";
const SAVED_MANUAL_MAINTENANCE_KEY = "level_up_saved_manual_maintenance_calories";
const SAVED_CUSTOM_WEEKLY_RATE_KEY = "level_up_saved_custom_weekly_rate";

export function initializeGoalsCalculationModeUI() {
    const goalsView = document.querySelector('[data-planner-view="goals"]');
    const manualPanel = document.getElementById("active-calorie-target-card");

    if (!goalsView || !manualPanel) {
        return;
    }

    const goalCards = Array.from(
        goalsView.querySelectorAll(":scope > .goal-box.nutrition-goal-card")
    );

    const autoPanel = goalCards.find(card => card !== manualPanel);

    if (!autoPanel) {
        return;
    }

    if (!document.getElementById("goal-calculation-mode-picker")) {
        autoPanel.insertAdjacentHTML(
            "beforebegin",
            `
                <div id="goal-calculation-mode-picker" class="goal-calculation-mode-picker">
                    <button
                        id="goal-mode-auto"
                        class="goal-calculation-mode-btn"
                        type="button"
                        data-goal-calculation-mode="auto"
                    >
                        <strong>Auto Calculate</strong>
                        <small>Use your profile, estimated TDEE and selected goal</small>
                    </button>

                    <button
                        id="goal-mode-manual"
                        class="goal-calculation-mode-btn"
                        type="button"
                        data-goal-calculation-mode="manual"
                    >
                        <strong>Manual Calculate</strong>
                        <small>Use your known maintenance and custom weekly target</small>
                    </button>
                </div>
            `
        );
    }

    autoPanel.classList.add("goal-calculation-panel");
    autoPanel.dataset.calculationPanel = "auto";

    if (!autoPanel.querySelector(".goal-mode-panel-heading")) {
        autoPanel.insertAdjacentHTML(
            "afterbegin",
            `
                <div class="goal-mode-panel-heading">
                    <span class="eyebrow">AUTO CALCULATE</span>
                    <p>Choose a goal and Level Up will calculate a starting calorie target automatically.</p>
                </div>
            `
        );
    }

    manualPanel.classList.add("goal-calculation-panel");
    manualPanel.dataset.calculationPanel = "manual";

    const manualEyebrow = manualPanel.querySelector(":scope > .eyebrow");
    const manualHeading = manualPanel.querySelector(":scope > h3");
    const manualIntro = manualPanel.querySelector(":scope > .nutrition-message");

    if (manualEyebrow) {
        manualEyebrow.textContent = "MANUAL CALCULATION";
    }

    if (manualHeading) {
        manualHeading.textContent = "Manual Calorie Calculation";
    }

    if (manualIntro) {
        manualIntro.textContent =
            "Enter the values you already know, then Level Up will calculate your target from those inputs.";
    }

    ensureActiveTargetPicker(goalsView, manualPanel);

    document
        .querySelectorAll("[data-goal-calculation-mode]")
        .forEach(button => {
            button.addEventListener("click", () => {
                setCalculationMode(button.dataset.goalCalculationMode);
                renderCalculationMode(autoPanel, manualPanel);
            });
        });

    document
        .querySelectorAll("[data-active-target-source]")
        .forEach(button => {
            button.addEventListener("click", () => {
                const source = button.dataset.activeTargetSource === "manual"
                    ? "manual"
                    : "auto";

                const target = source === "manual"
                    ? getManualTarget()
                    : getAutoTarget();

                if (!target) {
                    updateActiveTargetMessage(
                        source === "manual"
                            ? "Complete the manual calculation first."
                            : "Save your Body Profile and nutrition goal first."
                    );
                    return;
                }

                setActiveTargetSource(source);
                syncSelectedTargetToPlan();
                renderActiveTargetPicker();

                window.dispatchEvent(
                    new CustomEvent("levelup:nutrition-updated")
                );
            });
        });

    applyStoredMode();
    syncSelectedTargetToPlan();
    renderCalculationMode(autoPanel, manualPanel);
    renderActiveTargetPicker();

    window.addEventListener("levelup:nutrition-updated", () => {
        syncSelectedTargetToPlan();
        renderActiveTargetPicker();
    });
}

function ensureActiveTargetPicker(goalsView, manualPanel) {
    if (document.getElementById("active-target-picker")) {
        return;
    }

    manualPanel.insertAdjacentHTML(
        "afterend",
        `
            <div id="active-target-picker" class="goal-box nutrition-goal-card active-target-picker">
                <span class="eyebrow">ACTIVE TARGET</span>
                <h3>Dashboard Target</h3>
                <p class="nutrition-message">
                    Choose which calculation Level Up should use as your active calorie target across the Dashboard, macros, Goal Projection and Adaptive Coach.
                </p>

                <div class="active-target-actions">
                    <button
                        class="goal-calculation-mode-btn"
                        type="button"
                        data-active-target-source="auto"
                    >
                        <strong>Use Auto Target</strong>
                        <small id="active-auto-target-value">--</small>
                    </button>

                    <button
                        class="goal-calculation-mode-btn"
                        type="button"
                        data-active-target-source="manual"
                    >
                        <strong>Use Manual Target</strong>
                        <small id="active-manual-target-value">--</small>
                    </button>
                </div>

                <p id="active-target-message" class="nutrition-status-message" aria-live="polite"></p>
            </div>
        `
    );
}

function renderActiveTargetPicker() {
    const source = getActiveTargetSource();
    const autoTarget = getAutoTarget();
    const manualTarget = getManualTarget();

    setText(
        "active-auto-target-value",
        autoTarget ? `${autoTarget.calories} kcal/day` : "Not available"
    );

    setText(
        "active-manual-target-value",
        manualTarget ? `${manualTarget.calories} kcal/day` : "Not available"
    );

    document
        .querySelectorAll("[data-active-target-source]")
        .forEach(button => {
            const active = button.dataset.activeTargetSource === source;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });

    const selected = source === "manual" ? manualTarget : autoTarget;

    updateActiveTargetMessage(
        selected
            ? `Currently using ${source === "manual" ? "Manual" : "Auto"} Target · ${selected.calories} kcal/day`
            : `Currently using ${source === "manual" ? "Manual" : "Auto"} Target`
    );
}

function updateActiveTargetMessage(message) {
    setText("active-target-message", message);
}

function getCalculationMode() {
    const stored = localStorage.getItem(CALCULATION_MODE_KEY);

    if (stored === "auto" || stored === "manual") {
        return stored;
    }

    const hasManualValues =
        localStorage.getItem(MANUAL_MAINTENANCE_KEY) !== null ||
        localStorage.getItem(CUSTOM_WEEKLY_RATE_KEY) !== null;

    return hasManualValues ? "manual" : "auto";
}

function setCalculationMode(mode) {
    const normalized = mode === "manual" ? "manual" : "auto";

    if (normalized === "auto") {
        stashManualValues();
    }
    else {
        restoreManualValues();
    }

    localStorage.setItem(
        CALCULATION_MODE_KEY,
        normalized
    );

    window.dispatchEvent(
        new CustomEvent("levelup:nutrition-updated")
    );
}

function applyStoredMode() {
    if (getCalculationMode() === "auto") {
        stashManualValues();
    }
    else {
        restoreManualValues();
    }
}

function stashManualValues() {
    stashValue(MANUAL_MAINTENANCE_KEY, SAVED_MANUAL_MAINTENANCE_KEY);
    stashValue(CUSTOM_WEEKLY_RATE_KEY, SAVED_CUSTOM_WEEKLY_RATE_KEY);
}

function restoreManualValues() {
    restoreValue(SAVED_MANUAL_MAINTENANCE_KEY, MANUAL_MAINTENANCE_KEY);
    restoreValue(SAVED_CUSTOM_WEEKLY_RATE_KEY, CUSTOM_WEEKLY_RATE_KEY);
}

function stashValue(activeKey, savedKey) {
    const activeValue = localStorage.getItem(activeKey);

    if (activeValue === null || activeValue === "") {
        return;
    }

    localStorage.setItem(savedKey, activeValue);
    localStorage.removeItem(activeKey);
}

function restoreValue(savedKey, activeKey) {
    const savedValue = localStorage.getItem(savedKey);

    if (savedValue !== null && savedValue !== "") {
        localStorage.setItem(activeKey, savedValue);
    }
}

function renderCalculationMode(autoPanel, manualPanel) {
    const mode = getCalculationMode();

    autoPanel.hidden = mode !== "auto";
    manualPanel.hidden = mode !== "manual";

    document
        .querySelectorAll("[data-goal-calculation-mode]")
        .forEach(button => {
            const active = button.dataset.goalCalculationMode === mode;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        });
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}
