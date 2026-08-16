(() => {
    const PHASES_KEY = "level_up_nutrition_phases";
    let refreshQueued = false;

    function readPhases() {
        try {
            const value = JSON.parse(localStorage.getItem(PHASES_KEY) || "[]");
            return Array.isArray(value) ? value : [];
        } catch {
            return [];
        }
    }

    function activePhase() {
        const phases = readPhases();
        for (let index = phases.length - 1; index >= 0; index -= 1) {
            const phase = phases[index];
            if (phase && !phase.endDate && phase.goalId) return phase;
        }
        return null;
    }

    function selectedGoalId() {
        return document.getElementById("unified-goal-select")?.value || "";
    }

    function positive(value) {
        const number = Math.round(Number(value));
        return Number.isFinite(number) && number > 0 ? number : null;
    }

    function setText(node, value) {
        if (node && node.textContent !== value) node.textContent = value;
    }

    function ensureReadonlyValue(container) {
        let value = container.querySelector(".levelup-readonly-calorie-target");
        if (value) return value;
        value = document.createElement("strong");
        value.className = "levelup-readonly-calorie-target";
        const row = container.querySelector(".unified-direct-calorie-row");
        if (row) row.insertAdjacentElement("beforebegin", value);
        else container.appendChild(value);
        return value;
    }

    function applyState() {
        const container = document.querySelector(".unified-active-target");
        const button = document.getElementById("unified-save-plan");
        if (!container) return;

        const phase = activePhase();
        const samePhase = Boolean(phase && selectedGoalId() && phase.goalId === selectedGoalId());
        const input = document.getElementById("unified-direct-calorie-target") || document.getElementById("unified-target-calories");
        const row = container.querySelector(".unified-direct-calorie-row");
        const note = document.getElementById("unified-direct-calorie-note") || container.querySelector("small");
        const readonlyValue = container.querySelector(".levelup-readonly-calorie-target");

        if (!samePhase) {
            if (row) row.hidden = false;
            if (input) input.disabled = false;
            if (readonlyValue) readonlyValue.remove();
            if (button) button.hidden = false;
            return;
        }

        const calories = positive(phase.currentCalories ?? phase.startCalories);
        const maintenance = positive(phase.maintenanceCalories ?? document.getElementById("unified-maintenance")?.value);
        const label = container.querySelector(":scope > span");
        const value = ensureReadonlyValue(container);

        setText(label, "Current Daily Target");
        setText(value, calories ? `${calories} kcal/day` : "--");
        setText(
            note,
            "Calorie adjustments are temporarily unavailable. Your current phase and original start date are unchanged."
        );

        if (row) row.hidden = true;
        if (input) {
            input.disabled = true;
            input.value = "";
            input.dataset.dirty = "0";
        }
        if (button) button.hidden = true;

        const adjustmentNode = document.getElementById("unified-daily-adjustment");
        if (adjustmentNode && calories && maintenance) {
            const adjustment = calories - maintenance;
            setText(adjustmentNode, `${adjustment > 0 ? "+" : ""}${adjustment} kcal/day`);
        }
    }

    function queueState(delay = 0) {
        if (delay > 0) {
            window.setTimeout(applyState, delay);
            return;
        }
        if (refreshQueued) return;
        refreshQueued = true;
        requestAnimationFrame(() => {
            refreshQueued = false;
            applyState();
        });
    }

    document.addEventListener("click", event => {
        const button = event.target?.closest?.("#unified-save-plan");
        if (!button) return;
        const phase = activePhase();
        if (phase && phase.goalId === selectedGoalId()) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }, true);

    document.addEventListener("change", event => {
        if (event.target?.id === "unified-goal-select") queueState(40);
    }, true);

    document.addEventListener("input", event => {
        if (event.target?.id === "unified-maintenance") queueState(30);
    }, true);

    const content = document.getElementById("content");
    if (content) new MutationObserver(() => queueState()).observe(content, { childList: true, subtree: true });

    window.addEventListener("levelup:nutrition-updated", () => queueState(20));
    window.addEventListener("levelup:nutrition-phase-updated", () => queueState(20));
    window.addEventListener("load", () => queueState(20));
    queueState();
})();
