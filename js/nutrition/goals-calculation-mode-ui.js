const CALCULATION_MODE_KEY = "level_up_goal_calculation_mode";
const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";

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
                        <strong>Manual Calculation</strong>
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
            "Enter the values you already know, then Level Up will calculate your calorie target from those inputs.";
    }

    document
        .querySelectorAll("[data-goal-calculation-mode]")
        .forEach(button => {
            button.addEventListener("click", () => {
                setCalculationMode(button.dataset.goalCalculationMode);
                renderCalculationMode(autoPanel, manualPanel);
            });
        });

    renderCalculationMode(autoPanel, manualPanel);
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

    localStorage.setItem(
        CALCULATION_MODE_KEY,
        normalized
    );

    window.dispatchEvent(
        new CustomEvent("levelup:nutrition-updated")
    );
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
