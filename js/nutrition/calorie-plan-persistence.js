const SETTINGS_KEY = "level_up_calorie_plan_settings_v2";
const GOAL_KEY = "level_up_nutrition_goal";
const MANUAL_MAINTENANCE_KEY = "level_up_manual_maintenance_calories";
const CUSTOM_WEEKLY_RATE_KEY = "level_up_custom_weekly_rate";
const CUSTOM_WEEKLY_RATE_GOAL_KEY = "level_up_custom_weekly_rate_goal_id";

function readJson(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key) || "null");
        return value && typeof value === "object" ? value : null;
    }
    catch {
        return null;
    }
}

function getSavedGoalId() {
    return readJson(GOAL_KEY)?.goalId || "";
}

function readSettings() {
    return readJson(SETTINGS_KEY) || {};
}

function saveSettings(patch) {
    const current = readSettings();
    localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
            ...current,
            ...patch,
            updatedAt: new Date().toISOString()
        })
    );
}

function migrateOnce() {
    if (localStorage.getItem(SETTINGS_KEY)) return;

    const goalId = getSavedGoalId();
    const maintenanceRaw = localStorage.getItem(MANUAL_MAINTENANCE_KEY);
    const rateRaw = localStorage.getItem(CUSTOM_WEEKLY_RATE_KEY);
    const rateGoalId = localStorage.getItem(CUSTOM_WEEKLY_RATE_GOAL_KEY) || goalId;

    const maintenance = maintenanceRaw === null ? null : Number(maintenanceRaw);
    const rate = rateRaw === null ? null : Number(rateRaw);

    saveSettings({
        goalId,
        maintenanceMode: Number.isFinite(maintenance) && maintenance > 0 ? "manual" : "estimated",
        manualMaintenance: Number.isFinite(maintenance) && maintenance > 0 ? maintenance : null,
        rateMode: Number.isFinite(rate) && rateGoalId === goalId ? "custom" : "preset",
        customWeeklyRate: Number.isFinite(rate) && rateGoalId === goalId ? rate : null
    });
}

function syncLegacyKeysFromSettings() {
    const settings = readSettings();
    const goalId = getSavedGoalId() || settings.goalId || "";

    if (settings.maintenanceMode === "manual" && Number.isFinite(Number(settings.manualMaintenance))) {
        localStorage.setItem(MANUAL_MAINTENANCE_KEY, String(Number(settings.manualMaintenance)));
    }
    else if (settings.maintenanceMode === "estimated") {
        localStorage.removeItem(MANUAL_MAINTENANCE_KEY);
    }

    if (
        settings.rateMode === "custom" &&
        Number.isFinite(Number(settings.customWeeklyRate)) &&
        (!settings.goalId || settings.goalId === goalId)
    ) {
        localStorage.setItem(CUSTOM_WEEKLY_RATE_KEY, String(Number(settings.customWeeklyRate)));
        if (goalId) localStorage.setItem(CUSTOM_WEEKLY_RATE_GOAL_KEY, goalId);
    }
    else if (settings.rateMode === "preset") {
        localStorage.removeItem(CUSTOM_WEEKLY_RATE_KEY);
        localStorage.removeItem(CUSTOM_WEEKLY_RATE_GOAL_KEY);
    }
}

function hydrateGoalControls() {
    const goalsView = document.querySelector('[data-planner-view="goals"]');
    if (!goalsView) return;

    const settings = readSettings();
    const savedGoalId = getSavedGoalId();
    const activeGoalId = savedGoalId || settings.goalId || "";

    if (savedGoalId && settings.goalId !== savedGoalId) {
        saveSettings({
            goalId: savedGoalId,
            rateMode: "preset",
            customWeeklyRate: null
        });
    }

    syncLegacyKeysFromSettings();

    const goalSelect = document.getElementById("nutrition-goal-select");
    if (goalSelect && activeGoalId) goalSelect.value = activeGoalId;

    const maintenanceInput = document.getElementById("manual-maintenance-calories");
    if (maintenanceInput) {
        maintenanceInput.value =
            settings.maintenanceMode === "manual" && Number.isFinite(Number(settings.manualMaintenance))
                ? String(settings.manualMaintenance)
                : "";
    }

    const rateInput = document.getElementById("custom-weekly-rate");
    if (rateInput) {
        rateInput.value =
            settings.rateMode === "custom" &&
            Number.isFinite(Number(settings.customWeeklyRate)) &&
            (!settings.goalId || settings.goalId === activeGoalId)
                ? String(settings.customWeeklyRate)
                : "";
    }
}

function currentGoalIdFromUi() {
    return document.getElementById("nutrition-goal-select")?.value || getSavedGoalId() || "";
}

function captureAction(target) {
    if (!(target instanceof Element)) return;

    const goalId = currentGoalIdFromUi();

    if (target.closest("#save-nutrition-goal-btn")) {
        const previousGoalId = readSettings().goalId || getSavedGoalId();
        const changed = Boolean(goalId && previousGoalId && goalId !== previousGoalId);
        saveSettings({
            goalId,
            ...(changed ? { rateMode: "preset", customWeeklyRate: null } : {})
        });
        return;
    }

    if (target.closest("#save-manual-maintenance")) {
        const value = Number(document.getElementById("manual-maintenance-calories")?.value);
        if (Number.isFinite(value) && value > 0) {
            saveSettings({ maintenanceMode: "manual", manualMaintenance: value });
        }
        return;
    }

    if (target.closest("#reset-manual-maintenance")) {
        saveSettings({ maintenanceMode: "estimated", manualMaintenance: null });
        return;
    }

    if (target.closest("#save-custom-weekly-rate")) {
        const value = Number(document.getElementById("custom-weekly-rate")?.value);
        if (Number.isFinite(value)) {
            saveSettings({
                goalId,
                rateMode: "custom",
                customWeeklyRate: value
            });
            if (goalId) localStorage.setItem(CUSTOM_WEEKLY_RATE_GOAL_KEY, goalId);
        }
        return;
    }

    if (target.closest("#reset-custom-weekly-rate")) {
        saveSettings({
            goalId,
            rateMode: "preset",
            customWeeklyRate: null
        });
        return;
    }

    if (target.closest('[data-nutrition-view="goals"]')) {
        queueMicrotask(hydrateGoalControls);
    }
}

migrateOnce();
syncLegacyKeysFromSettings();

document.addEventListener("click", event => {
    captureAction(event.target);
    queueMicrotask(() => {
        if (document.querySelector('[data-planner-view="goals"]:not([hidden])')) {
            hydrateGoalControls();
        }
    });
});

window.addEventListener("levelup:nutrition-updated", () => {
    queueMicrotask(() => {
        const active = document.activeElement;
        if (active?.id === "manual-maintenance-calories" || active?.id === "custom-weekly-rate") return;
        hydrateGoalControls();
    });
});

window.addEventListener("pageshow", hydrateGoalControls);
