(() => {
    const PHASES_KEY = "level_up_nutrition_phases";
    const PLAN_KEY = "level_up_nutrition_plan";
    let uiRefreshQueued = false;

    function readJson(key, fallback) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "null");
            return value ?? fallback;
        } catch {
            return fallback;
        }
    }

    function readPhases() {
        const value = readJson(PHASES_KEY, []);
        return Array.isArray(value) ? value : [];
    }

    function activePhaseIndex(phases) {
        for (let index = phases.length - 1; index >= 0; index -= 1) {
            if (phases[index] && !phases[index].endDate && phases[index].goalId) return index;
        }
        return -1;
    }

    function positive(value) {
        const number = Math.round(Number(value));
        return Number.isFinite(number) && number > 0 ? number : null;
    }

    function calorieIncrease(value) {
        const number = Math.round(Number(value));
        return Number.isFinite(number) && number > 0 ? number : null;
    }

    function selectedGoalId() {
        return document.getElementById("unified-goal-select")?.value || "";
    }

    function activePhaseState() {
        const phases = readPhases();
        const index = activePhaseIndex(phases);
        return {
            phases,
            index,
            phase: index >= 0 ? phases[index] : null
        };
    }

    function setText(node, value) {
        if (!node || node.textContent === value) return;
        if (node.childNodes.length === 1 && node.firstChild?.nodeType === Node.TEXT_NODE) {
            node.firstChild.nodeValue = value;
        } else {
            node.textContent = value;
        }
    }

    function setMessage(message) {
        setText(document.getElementById("unified-calorie-message"), message);
    }

    function formatNumber(value) {
        return Number(value).toLocaleString();
    }

    function formatDate(value) {
        if (!value) return "its existing date";
        const date = new Date(`${value}T12:00:00`);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    }

    function syncPlanCalories(calories) {
        const existing = readJson(PLAN_KEY, {});
        const plan = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
        localStorage.setItem(PLAN_KEY, JSON.stringify({
            ...plan,
            calculatedCalories: calories,
            currentCalories: calories,
            adjustmentHistory: Array.isArray(plan.adjustmentHistory) ? plan.adjustmentHistory : []
        }));
    }

    function verifySavedCalories(phaseId, goalId, calories) {
        const phases = readPhases();
        const phase = [...phases].reverse().find(item => item && !item.endDate && item.goalId === goalId && (phaseId == null || String(item.id) === String(phaseId)));
        const savedPhaseCalories = positive(phase?.currentCalories ?? phase?.startCalories);
        const plan = readJson(PLAN_KEY, {});
        const savedPlanCalories = positive(plan?.calculatedCalories ?? plan?.currentCalories);
        return savedPhaseCalories === calories && savedPlanCalories === calories;
    }

    function applyActivePhaseInputUi() {
        const container = document.querySelector(".unified-active-target");
        const input = document.getElementById("unified-direct-calorie-target") || document.getElementById("unified-target-calories");
        if (!container || !input) return;

        const label = container.querySelector(":scope > span");
        const unit = container.querySelector(".unified-direct-calorie-unit");
        const note = document.getElementById("unified-direct-calorie-note");
        const { phase } = activePhaseState();
        const samePhase = Boolean(phase && selectedGoalId() && phase.goalId === selectedGoalId());

        if (!samePhase) {
            input.dataset.calorieEntryMode = "target";
            delete input.dataset.clearForPhaseChange;
            setText(label, "Starting Daily Target");
            input.min = "1";
            input.step = "10";
            input.removeAttribute("placeholder");
            input.setAttribute("aria-label", "Starting daily calorie target");
            setText(unit, "kcal/day");
            if (note) {
                setText(note, "This is the daily calorie target that will be used when the new phase starts.");
            }
            return;
        }

        if (input.dataset.calorieEntryMode !== "increase" || input.dataset.clearForPhaseChange === "1") {
            input.dataset.calorieEntryMode = "increase";
            input.dataset.dirty = "0";
            input.value = "";
            delete input.dataset.clearForPhaseChange;
        }

        const currentCalories = positive(phase.currentCalories ?? phase.startCalories);
        const increase = calorieIncrease(input.value);
        const newTarget = Number.isFinite(currentCalories) && Number.isFinite(increase)
            ? currentCalories + increase
            : null;

        setText(label, "Calorie Increase");
        input.min = "0";
        input.step = "10";
        input.placeholder = "e.g. 100";
        input.setAttribute("aria-label", "Calories to add to current daily target");
        setText(unit, "kcal to add");

        if (note && Number.isFinite(currentCalories)) {
            const explanation = Number.isFinite(newTarget)
                ? `Current target: ${formatNumber(currentCalories)} kcal/day. Add ${formatNumber(increase)} → new target: ${formatNumber(newTarget)} kcal/day. Saving keeps this phase and its original start date.`
                : `Current target: ${formatNumber(currentCalories)} kcal/day. Enter the calories you want to add. Example: enter 100 to increase the target by 100 kcal/day. Saving keeps this phase and its original start date.`;
            setText(note, explanation);
        }

        const maintenance = positive(phase.maintenanceCalories ?? document.getElementById("unified-maintenance")?.value);
        const adjustmentNode = document.getElementById("unified-daily-adjustment");
        const projectedCalories = newTarget ?? currentCalories;
        if (adjustmentNode && Number.isFinite(projectedCalories) && Number.isFinite(maintenance)) {
            const adjustment = projectedCalories - maintenance;
            setText(adjustmentNode, `${adjustment > 0 ? "+" : ""}${adjustment} kcal/day`);
        }
    }

    function queueInputUiRefresh(delay = 0) {
        if (uiRefreshQueued && delay === 0) return;
        if (delay > 0) {
            window.setTimeout(applyActivePhaseInputUi, delay);
            return;
        }
        uiRefreshQueued = true;
        requestAnimationFrame(() => {
            uiRefreshQueued = false;
            applyActivePhaseInputUi();
        });
    }

    function handleSamePhaseCalorieSave(event) {
        const button = event.target?.closest?.("#unified-save-plan");
        if (!button) return;

        const input = document.getElementById("unified-direct-calorie-target") || document.getElementById("unified-target-calories");
        if (!input) return;

        const goalId = selectedGoalId();
        const { phases, index, phase: active } = activePhaseState();

        if (!active || !goalId || active.goalId !== goalId) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        const previousCalories = positive(active.currentCalories ?? active.startCalories);
        const increase = calorieIncrease(input.value);
        if (!previousCalories) {
            setMessage("The current phase does not have a valid calorie target yet.");
            return;
        }
        if (!increase) {
            setMessage("Enter the calories you want to add, for example 100.");
            return;
        }

        const calories = previousCalories + increase;
        const maintenance = positive(active.maintenanceCalories ?? document.getElementById("unified-maintenance")?.value);
        const now = new Date().toISOString();

        const next = {
            ...active,
            currentCalories: calories,
            updatedAt: now,
            adjustments: [
                ...(Array.isArray(active.adjustments) ? active.adjustments : []),
                {
                    date: now,
                    previousCalories,
                    newCalories: calories,
                    calorieIncrease: increase,
                    ...(maintenance ? { maintenanceCalories: maintenance } : {}),
                    source: "manual-increase"
                }
            ]
        };

        if (maintenance) {
            next.maintenanceCalories = maintenance;
            next.dailyCalorieAdjustment = calories - maintenance;
        }

        phases[index] = next;
        localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
        syncPlanCalories(calories);

        if (!verifySavedCalories(active.id, goalId, calories)) {
            setMessage("The calorie increase did not save correctly. Please try again.");
            return;
        }

        input.value = "";
        input.dataset.dirty = "0";
        input.dataset.calorieEntryMode = "increase";

        setMessage(`Added ${formatNumber(increase)} kcal/day: ${formatNumber(previousCalories)} → ${formatNumber(calories)} kcal/day. The current phase still starts ${formatDate(active.startDate)}.`);

        window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated", { detail: { source: "same-phase-calorie-increase", calories, increase } }));
        window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", { detail: { source: "same-phase-calorie-increase", calories, increase } }));
        queueInputUiRefresh(0);
    }

    document.addEventListener("click", handleSamePhaseCalorieSave, true);

    document.addEventListener("input", event => {
        if (event.target?.id !== "unified-direct-calorie-target" && event.target?.id !== "unified-target-calories") return;
        const { phase } = activePhaseState();
        if (phase && phase.goalId === selectedGoalId()) {
            event.stopImmediatePropagation();
        }
        queueInputUiRefresh(0);
        queueInputUiRefresh(20);
    }, true);

    document.addEventListener("change", event => {
        if (event.target?.id === "unified-goal-select") {
            const input = document.getElementById("unified-direct-calorie-target") || document.getElementById("unified-target-calories");
            if (input) input.dataset.clearForPhaseChange = "1";
            queueInputUiRefresh(40);
        }
    }, true);

    const content = document.getElementById("content");
    if (content) {
        new MutationObserver(() => queueInputUiRefresh(0)).observe(content, { childList: true, subtree: true });
    }

    window.addEventListener("levelup:nutrition-updated", () => queueInputUiRefresh(20));
    window.addEventListener("levelup:nutrition-phase-updated", () => queueInputUiRefresh(20));
    window.addEventListener("load", () => queueInputUiRefresh(20));
    queueInputUiRefresh(0);
})();