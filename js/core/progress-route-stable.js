import { renderProgress } from "../progress/progress-ui.js?v=progress-route-stable-1";
import { initializeWeightTracker } from "../progress/weight-tracker.js?v=weight-history-trend-2";
import { initializeWeightProgressCompact } from "../progress/weight-progress-compact.js?v=current-goal-1";
import { initializeTrainingProgress } from "../progress/training-progress.js?v=analytics-bar-polish-1";
import { initializeExerciseProgressV2 } from "../progress/exercise-progress-v2.js?v=granular-units-1";
import { initializeOverallStrengthIndex } from "../progress/overall-strength-index.js?v=analytics-summary-polish-1";
import { initializeWeeklyMuscleVolume } from "../progress/weekly-muscle-volume.js?v=repair-generic-exercise-1";
import { initializeMuscleRecoveryMap } from "../progress/muscle-recovery-map.js?v=recovery-traced-1";
import { initializeCalorieStats } from "../nutrition/calorie-stats.js?v=weekly-review-modal-1";
import { initializeWeightCarbsChart } from "../progress/weight-carbs-chart.js?v=weight-carbs-stable-route-1";
import { initializeCardioAnalytics } from "../progress/cardio-analytics.js?v=cardio-distance-fix-1";
import { initializeWorkoutPrBadges } from "../workouts/workout-pr-badges.js?v=workout-pr-badges-2";

let routeGeneration = 0;

export function renderStableProgressRoute(content = document.getElementById("content")) {
    if (!content) return false;

    const generation = ++routeGeneration;

    // Render the Progress page synchronously and return control to the browser
    // before initializing the heavier analytics. This guarantees the route can
    // paint immediately instead of appearing to get stuck on the nav button.
    content.innerHTML = renderProgress();
    content.scrollTop = 0;
    if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const steps = [
        ["Weight tracker", initializeWeightTracker],
        ["Compact weight progress", initializeWeightProgressCompact],
        ["Training progress", initializeTrainingProgress],
        ["Exercise session volume", initializeExerciseProgressV2],
        ["Overall strength index", initializeOverallStrengthIndex],
        ["Weekly muscle volume", initializeWeeklyMuscleVolume],
        ["Muscle recovery map", initializeMuscleRecoveryMap],
        ["Nutrition stats", () => initializeCalorieStats(content)],
        ["Weight and carbs chart", () => initializeWeightCarbsChart(content)],
        ["Cardio analytics", () => initializeCardioAnalytics(content)],
        ["Workout PR badges", initializeWorkoutPrBadges]
    ];

    let index = 0;
    const runNext = () => {
        if (generation !== routeGeneration) return;
        if (!content.isConnected || !content.querySelector("#weight-progress")) return;
        if (index >= steps.length) return;

        const [name, initializer] = steps[index++];
        try {
            initializer();
        }
        catch (error) {
            console.error(`${name} failed to initialize:`, error);
        }

        if (index < steps.length) window.setTimeout(runNext, 0);
    };

    window.setTimeout(runNext, 0);
    return true;
}
