const ACTIVE_WORKOUT_STORAGE_KEY = "level_up_active_workout";
const GUARD_FLAG = "__levelUpWarmupStorageGuardInstalled";

function cloneWarmupSets(sets) {
    return Array.isArray(sets)
        ? sets.map(set => ({ ...set }))
        : [];
}

function preserveWarmups(previous, next) {
    if (!previous || !next || previous.id !== next.id) return next;
    if (!Array.isArray(previous.exercises) || !Array.isArray(next.exercises)) return next;

    next.exercises.forEach((exercise, index) => {
        if (!exercise || Object.prototype.hasOwnProperty.call(exercise, "warmupSets")) return;
        const previousWarmups = previous.exercises[index]?.warmupSets;
        if (Array.isArray(previousWarmups)) {
            exercise.warmupSets = cloneWarmupSets(previousWarmups);
        }
    });

    return next;
}

function installWarmupStorageGuard() {
    if (globalThis[GUARD_FLAG]) return;
    globalThis[GUARD_FLAG] = true;

    const originalSetItem = Storage.prototype.setItem;

    Storage.prototype.setItem = function(key, value) {
        if (this === localStorage && key === ACTIVE_WORKOUT_STORAGE_KEY) {
            try {
                const previous = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || "null");
                const next = JSON.parse(String(value));
                if (previous?.status === "in_progress" && next?.status === "in_progress") {
                    value = JSON.stringify(preserveWarmups(previous, next));
                }
            } catch {
                // Keep the original storage write if either value is not valid JSON.
            }
        }

        return originalSetItem.call(this, key, value);
    };
}

function startRestAfterCompletedWarmup(event) {
    const button = event.target?.closest?.(".complete-warmup-btn");
    if (!button) return;

    // The warm-up row's own click handler runs before this document-level
    // bubble handler, so the completed class now reflects the saved state.
    const row = button.closest(".session-warmup-row");
    if (!row?.classList.contains("completed")) return;

    const logger = button.closest("#workout-session-logger");
    const startRest = logger?.querySelector("#start-rest-timer");
    if (startRest && !startRest.disabled) startRest.click();
}

installWarmupStorageGuard();
document.addEventListener("click", startRestAfterCompletedWarmup);
