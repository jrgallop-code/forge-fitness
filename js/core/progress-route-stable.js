import { renderProgress } from "../progress/progress-ui.js?v=progress-route-stable-2";
import { initializeWeightTracker } from "../progress/weight-tracker.js?v=weight-history-trend-2";
import { initializeWeightProgressCompact } from "../progress/weight-progress-compact.js?v=current-goal-1";
import { initializeTrainingProgress } from "../progress/training-progress.js?v=analytics-bar-polish-1";
import { initializeExerciseProgressV2 } from "../progress/exercise-progress-v2.js?v=granular-units-1";
import { initializeOverallStrengthIndex } from "../progress/overall-strength-index.js?v=analytics-summary-polish-1";
import { initializeWeeklyMuscleVolume } from "../progress/weekly-muscle-volume.js?v=repair-generic-exercise-1";
import { initializeMuscleRecoveryMap } from "../progress/muscle-recovery-map.js?v=recovery-traced-1";
import { initializeCalorieStats } from "../nutrition/calorie-stats.js?v=weekly-review-modal-1";
import { initializeWeightCarbsChart } from "../progress/weight-carbs-chart.js?v=weight-carbs-stable-route-2";
import { initializeCardioAnalytics } from "../progress/cardio-analytics.js?v=cardio-distance-fix-1";
import { initializeWorkoutPrBadges } from "../workouts/workout-pr-badges.js?v=workout-pr-badges-2";

let routeGeneration = 0;

function runInitializer(name, initializer) {
    try {
        initializer();
    }
    catch (error) {
        console.error(`${name} failed to initialize:`, error);
    }
}

export function renderStableProgressRoute(content = document.getElementById("content")) {
    if (!content) return false;

    const generation = ++routeGeneration;

    // Paint the complete Progress markup immediately so navigation feels instant.
    content.innerHTML = renderProgress();
    content.scrollTop = 0;
    if (typeof window.scrollTo === "function") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }

    // On the very next frame, finish the entire Weight experience together.
    // These initializers create the internal Progress tabs, compact Weight cards,
    // Weight + Carbs carousel/pager and the Nutrition Progress content. They must
    // not sit behind the heavier training analytics queue or the page appears cut off.
    window.requestAnimationFrame(() => {
        if (generation !== routeGeneration) return;
        if (!content.isConnected || !content.querySelector("#weight-progress")) return;

        runInitializer("Weight tracker", initializeWeightTracker);
        runInitializer("Compact weight progress", initializeWeightProgressCompact);
        runInitializer("Nutrition stats", () => initializeCalorieStats(content));
        runInitializer("Weight and carbs chart", () => initializeWeightCarbsChart(content));

        // Defer only the unrelated heavier analytics until after Weight is fully usable.
        window.requestAnimationFrame(() => {
            if (generation !== routeGeneration) return;
            if (!content.isConnected || !content.querySelector("#weight-progress")) return;

            runInitializer("Training progress", initializeTrainingProgress);
            runInitializer("Exercise session volume", initializeExerciseProgressV2);
            runInitializer("Overall strength index", initializeOverallStrengthIndex);
            runInitializer("Weekly muscle volume", initializeWeeklyMuscleVolume);
            runInitializer("Muscle recovery map", initializeMuscleRecoveryMap);
            runInitializer("Cardio analytics", () => initializeCardioAnalytics(content));
            runInitializer("Workout PR badges", initializeWorkoutPrBadges);
        });
    });

    return true;
}
