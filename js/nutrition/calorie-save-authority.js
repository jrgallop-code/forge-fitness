(() => {
    const PHASES_KEY = "level_up_nutrition_phases";
    const PLAN_KEY = "level_up_nutrition_plan";

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

    function setMessage(message) {
        const node = document.getElementById("unified-calorie-message");
        if (node) node.textContent = message;
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

    function handleSamePhaseCalorieSave(event) {
        const button = event.target?.closest?.("#unified-save-plan");
        if (!button) return;

        const input = document.getElementById("unified-direct-calorie-target") || document.getElementById("unified-target-calories");
        if (!input) return;

        const goalId = document.getElementById("unified-goal-select")?.value || "";
        const phases = readPhases();
        const index = activePhaseIndex(phases);
        const active = index >= 0 ? phases[index] : null;

        // Only own calorie adjustments inside an existing phase. Starting a new
        // phase continues through the existing phase creation flow.
        if (!active || !goalId || active.goalId !== goalId) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        const calories = positive(input.value);
        if (!calories) {
            setMessage("Enter a valid planned daily calorie target.");
            return;
        }

        const previousCalories = positive(active.currentCalories ?? active.startCalories);
        const maintenance = positive(active.maintenanceCalories ?? document.getElementById("unified-maintenance")?.value);
        const now = new Date().toISOString();
        const changed = previousCalories !== calories;

        const next = {
            ...active,
            currentCalories: calories,
            updatedAt: now
        };

        if (maintenance) {
            next.maintenanceCalories = maintenance;
            next.dailyCalorieAdjustment = calories - maintenance;
        }

        if (changed) {
            next.adjustments = [
                ...(Array.isArray(active.adjustments) ? active.adjustments : []),
                {
                    date: now,
                    previousCalories,
                    newCalories: calories,
                    ...(maintenance ? { maintenanceCalories: maintenance } : {}),
                    source: "manual"
                }
            ];
        }

        phases[index] = next;
        localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
        syncPlanCalories(calories);

        if (!verifySavedCalories(active.id, goalId, calories)) {
            setMessage("The calorie target did not save correctly. Please try again.");
            return;
        }

        input.value = String(calories);
        input.dataset.dirty = "0";

        const message = changed
            ? `Updated calories${previousCalories ? ` from ${previousCalories}` : ""} to ${calories} kcal/day inside the current phase. The phase still starts ${formatDate(active.startDate)}.`
            : `Your current phase remains at ${calories} kcal/day.`;
        setMessage(message);

        window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated", { detail: { source: "same-phase-calorie-save", calories } }));
        window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", { detail: { source: "same-phase-calorie-save", calories } }));
    }

    // This file is loaded as a classic script before the app's module scripts,
    // so this capture listener is the first authority for the shared Save button.
    document.addEventListener("click", handleSamePhaseCalorieSave, true);
})();
