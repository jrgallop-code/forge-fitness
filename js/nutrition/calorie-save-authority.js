(() => {
    const PHASES_KEY = "level_up_nutrition_phases";
    const PLAN_KEY = "level_up_nutrition_plan";
    const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
    let maintenanceEditing = false;
    let previousInlineEditing = false;
    let refreshQueued = false;

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

    function selectedGoalId() {
        return document.getElementById("unified-goal-select")?.value || "";
    }

    function displayedPlannedTarget() {
        const text = document.getElementById("unified-active-target")?.textContent || "";
        const match = text.replace(/,/g, "").match(/\d+/);
        return match ? positive(match[0]) : null;
    }

    function setText(node, value) {
        if (node && node.textContent !== value) node.textContent = value;
    }

    function setMessage(message) {
        setText(document.getElementById("unified-calorie-message"), message);
    }

    function applyGuidance() {
        const maintenance = document.getElementById("unified-maintenance");
        const useEstimate = document.getElementById("unified-use-estimate");
        const help = maintenance?.closest(".unified-maintenance-block")?.querySelector(".unified-help");
        const target = document.querySelector(".unified-active-target");
        const targetNote = target?.querySelector("small");

        if (help) {
            setText(
                help,
                "Enter the maintenance value Level Up should plan from. Planned Daily Target updates below; press Save Calorie Adjustment to apply it. Use TDEE Estimate copies the maintenance estimate calculated from your Body Profile."
            );
        }

        if (useEstimate) {
            setText(useEstimate, "Use TDEE Estimate");
            useEstimate.title = "Copy the TDEE maintenance estimate from your Body Profile into the planning field";
            useEstimate.setAttribute("aria-label", "Use TDEE maintenance estimate for planning");
        }

        if (targetNote) {
            setText(targetNote, "This exact calorie target will be saved when you press the button below.");
        }
    }

    function queueGuidance() {
        if (refreshQueued) return;
        refreshQueued = true;
        requestAnimationFrame(() => {
            refreshQueued = false;
            applyGuidance();
        });
    }

    function saveDisplayedSamePhaseTarget(event) {
        const button = event.target?.closest?.("#unified-save-plan");
        if (!button) return;

        const phases = readPhases();
        const index = activePhaseIndex(phases);
        const active = index >= 0 ? phases[index] : null;
        const goalId = selectedGoalId();
        if (!active || !goalId || active.goalId !== goalId) return;

        const maintenance = positive(document.getElementById("unified-maintenance")?.value);
        const targetCalories = displayedPlannedTarget();
        const previousCalories = positive(active.currentCalories ?? active.startCalories);
        const previousMaintenance = positive(active.maintenanceCalories);

        if (!maintenance || !targetCalories) return;

        const planningChanged = maintenance !== previousMaintenance || targetCalories !== previousCalories;
        if (!planningChanged) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        const now = new Date().toISOString();
        const next = {
            ...active,
            maintenanceCalories: maintenance,
            currentCalories: targetCalories,
            dailyCalorieAdjustment: targetCalories - maintenance,
            updatedAt: now
        };

        if (targetCalories !== previousCalories) {
            next.adjustments = [
                ...(Array.isArray(active.adjustments) ? active.adjustments : []),
                {
                    date: now,
                    previousCalories,
                    newCalories: targetCalories,
                    maintenanceCalories: maintenance,
                    source: "maintenance-planning"
                }
            ];
        }

        phases[index] = next;
        localStorage.setItem(PHASES_KEY, JSON.stringify(phases));
        localStorage.setItem(MANUAL_MAINTENANCE_KEY, String(maintenance));

        const existingPlan = readJson(PLAN_KEY, {});
        const adjustmentHistory = Array.isArray(existingPlan?.adjustmentHistory)
            ? existingPlan.adjustmentHistory
            : [];
        const nextHistory = targetCalories !== previousCalories
            ? [
                ...adjustmentHistory,
                {
                    date: now,
                    previousCalories,
                    newCalories: targetCalories,
                    reason: "Maintenance planning adjustment"
                }
            ]
            : adjustmentHistory;

        localStorage.setItem(PLAN_KEY, JSON.stringify({
            ...(existingPlan && typeof existingPlan === "object" && !Array.isArray(existingPlan) ? existingPlan : {}),
            calculatedCalories: targetCalories,
            currentCalories: targetCalories,
            adjustmentHistory: nextHistory
        }));

        const savedPhases = readPhases();
        const savedIndex = activePhaseIndex(savedPhases);
        const savedPhase = savedIndex >= 0 ? savedPhases[savedIndex] : null;
        const savedPlan = readJson(PLAN_KEY, {});
        const verified = savedPhase?.goalId === goalId
            && positive(savedPhase.currentCalories ?? savedPhase.startCalories) === targetCalories
            && positive(savedPhase.maintenanceCalories) === maintenance
            && positive(savedPlan.calculatedCalories ?? savedPlan.currentCalories) === targetCalories;

        if (!verified) {
            setMessage("The calorie target did not save correctly. Please try again.");
            return;
        }

        setMessage(`Saved ${targetCalories.toLocaleString()} kcal/day as the active target. Your current phase start date is unchanged.`);
        window.dispatchEvent(new CustomEvent("levelup:nutrition-phase-updated", { detail: { source: "maintenance-target-save", calories: targetCalories } }));
        window.dispatchEvent(new CustomEvent("levelup:nutrition-updated", { detail: { source: "maintenance-target-save", calories: targetCalories } }));
        window.setTimeout(queueGuidance, 0);
    }

    document.addEventListener("focusin", event => {
        if (event.target?.id !== "unified-maintenance" || maintenanceEditing) return;
        maintenanceEditing = true;
        previousInlineEditing = window.__levelUpPhaseInlineEditing === true;
        window.__levelUpPhaseInlineEditing = true;
    }, true);

    document.addEventListener("focusout", event => {
        if (event.target?.id !== "unified-maintenance" || !maintenanceEditing) return;
        window.setTimeout(() => {
            maintenanceEditing = false;
            window.__levelUpPhaseInlineEditing = previousInlineEditing;
            queueGuidance();
        }, 0);
    }, true);

    document.addEventListener("input", event => {
        if (event.target?.id === "unified-maintenance") queueGuidance();
    }, true);

    document.addEventListener("click", saveDisplayedSamePhaseTarget, true);

    document.addEventListener("click", event => {
        if (event.target?.closest?.("#unified-use-estimate, #unified-save-plan")) {
            window.setTimeout(queueGuidance, 0);
        }
    }, true);

    const content = document.getElementById("content");
    if (content) {
        new MutationObserver(queueGuidance).observe(content, { childList: true, subtree: true });
    }

    window.addEventListener("levelup:nutrition-updated", queueGuidance);
    window.addEventListener("levelup:nutrition-phase-updated", queueGuidance);
    window.addEventListener("load", queueGuidance);
    queueGuidance();
})();
