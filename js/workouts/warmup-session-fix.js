import { cancelActiveRestTimer, startRestForWarmupButton } from "./rest-timer-authority.js?v=warmup-toggle-cancel-1";
import "./warmup-timer-stability.js?v=warmup-timer-stability-1";
import "./warmup-plate-calculator.js?v=warmup-plate-calculator-3";
import "../core/workout-theme-guardrail.js?v=workout-theme-guardrail-4";

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

    // The warm-up row handler saves completion first. The shared timer authority
    // then reads the same per-exercise Rest Timer toggle/duration used by working
    // sets, so warm-ups and working sets cannot drift onto separate timer logic.
    const row = button.closest(".session-warmup-row");
    if (!row) return;
    if (row.classList.contains("completed")) {
        startRestForWarmupButton(button);
        return;
    }

    const card = row.closest(".session-exercise-card[data-exercise-index]");
    if (!card) return;
    cancelActiveRestTimer({
        exerciseIndex: Number(card.dataset.exerciseIndex),
        sourceType: "warmup",
        warmupIndex: Number(row.dataset.warmupIndex)
    });
}

installWarmupStorageGuard();
document.addEventListener("click", startRestAfterCompletedWarmup);
