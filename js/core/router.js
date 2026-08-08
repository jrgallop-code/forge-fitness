import { renderWorkoutBuilder }
from "../workouts/workout-ui.js?v=workout-flow-3";

import { initializeWorkoutBuilder }
from "../workouts/workouts.js?v=workout-flow-4";

import { renderDashboard }
from "../dashboard/dashboard-ui.js?v=dashboard-workout-flow-1";

import {
    initializeDashboardNutritionTargets
}
from "../dashboard/nutrition-target-card.js?v=active-target-2";

import { renderProgress }
from "../progress/progress-ui.js?v=progress-sleep-2";

import { initializeWeightTracker }
from "../progress/weight-tracker.js?v=weight-tracker-8";

import {
    initializePhotoJournal
}
from "../progress/photo-journal.js";

import { initializeTrainingProgress }
from "../progress/training-progress.js?v=exercise-progress-reps-zero-nodata-2";

import { initializeSleepTracker }
from "../progress/sleep-tracker.js?v=sleep-tracker-2";

import {
    renderNutrition,
    initializeNutrition,
    showNutritionView
}
from "../nutrition/nutrition-ui.js?v=nutrition-more-2";

import {
    renderEnergyProfile,
    initializeEnergyProfile
}
from "../nutrition/energy-profile.js?v=calorie-planner-2";

import {
    initializeProteinTargetExplanation
}
from "../nutrition/protein-target-ui.js?v=protein-target-1";

import {
    initializeNutritionPlanUI
}
from "../nutrition/nutrition-plan-ui-v4.js?v=goals-flow-2";

import {
    initializeGoalsCalculationModeUI
}
from "../nutrition/goals-calculation-mode-ui.js?v=active-target-2";

import {
    initializeActiveTargetSyncHooks
}
from "../nutrition/active-target-sync-hooks.js?v=active-target-2";

import {
    initializeNutritionPlanHooks
}
from "../nutrition/nutrition-plan-hooks.js?v=adaptive-plan-1";

import {
    initializeAdaptiveCoachDemo
}
from "../nutrition/adaptive-coach-demo.js?v=coach-demo-1";

import {
    initializeManualGoalSync
}
from "../nutrition/manual-goal-sync.js?v=manual-goals-1";

import {
    renderGoalProjection,
    initializeGoalProjection
}
from "../nutrition/goal-projection.js?v=selected-target-projection-3";

import {
    renderMore,
    initializeMore
}
from "../more/more-ui-v2.js?v=more-nutrition-2";

import {
    renderWorkoutHistory,
    initializeWorkoutHistory
}
from "../workouts/workout-history.js?v=workout-history-3";

import {
    initializeBackupManager
}
from "./backup-manager.js?v=active-workout-backup-1";

import {
    initializeGoogleDriveSync
}
from "./google-drive-sync-v2.js?v=visible-drive-backup-1";


export function navigate(page) {
    const content =
        document.getElementById("content");

    if (!content) {
        return;
    }

    try {
        switch (page) {
            case "home":
                content.innerHTML =
                    renderDashboard();

                safeInitialize("Dashboard nutrition targets", initializeDashboardNutritionTargets);
                safeInitialize("Backup manager", initializeBackupManager);
                safeInitialize("Google Drive sync", initializeGoogleDriveSync);
                break;

            case "workout":
                content.innerHTML =
                    renderWorkoutBuilder();

                safeInitialize("Workout builder", initializeWorkoutBuilder);
                break;

            case "progress":
                content.innerHTML =
                    renderProgress();

                safeInitialize("Weight tracker", initializeWeightTracker);
                safeInitialize("Manual goal sync", initializeManualGoalSync);
                safeInitialize("Photo journal", initializePhotoJournal);
                safeInitialize("Training progress", initializeTrainingProgress);
                safeInitialize("Sleep tracker", initializeSleepTracker);
                break;

            case "nutrition":
                content.innerHTML =
                    renderNutrition();

                safeInitialize("Nutrition", initializeNutrition);
                safeInitialize(
                    "Nutrition main view",
                    () => showNutritionView("main")
                );
                break;

            case "water":
                content.innerHTML =
                    renderNutrition();

                safeInitialize("Nutrition", initializeNutrition);
                safeInitialize(
                    "Water view",
                    () => showNutritionView("water")
                );
                break;

            case "energy":
                content.innerHTML =
                    renderEnergyProfile() + `
                        <div
                            class="nutrition-planner-view nutrition-projection-view"
                            data-planner-view="projection"
                            hidden
                        >
                            <button
                                class="nutrition-planner-back"
                                type="button"
                                data-nutrition-back
                            >
                                ← Calorie Planner
                            </button>

                            ${renderGoalProjection()}
                        </div>
                    `;

                safeInitialize("Energy profile", initializeEnergyProfile);
                safeInitialize("Protein target explanation", initializeProteinTargetExplanation);
                safeInitialize("Goal projection", initializeGoalProjection);
                safeInitialize("Nutrition plan UI", initializeNutritionPlanUI);
                safeInitialize("Goals calculation mode", initializeGoalsCalculationModeUI);
                safeInitialize("Active target sync", initializeActiveTargetSyncHooks);
                safeInitialize("Nutrition plan hooks", initializeNutritionPlanHooks);
                safeInitialize("Adaptive coach demo", initializeAdaptiveCoachDemo);
                safeInitialize("Manual goal sync", initializeManualGoalSync);
                break;

            case "more":
                content.innerHTML =
                    renderMore();

                safeInitialize("More", initializeMore);
                break;

            case "history":
                content.innerHTML =
                    renderWorkoutHistory();

                safeInitialize("Workout history", initializeWorkoutHistory);
                break;

            default:
                content.innerHTML =
                    renderDashboard();
                safeInitialize("Dashboard nutrition targets", initializeDashboardNutritionTargets);
        }
    }
    catch (error) {
        console.error(
            `Route ${page} failed while rendering:`,
            error
        );

        content.innerHTML = `
            <section class="section-card">
                <h2>Page could not load</h2>
                <p class="section-description">
                    The page hit an initialization error. Navigation is still available below.
                </p>
            </section>
        `;
    }
}


function safeInitialize(name, initializer) {
    try {
        initializer();
    }
    catch (error) {
        console.error(
            `${name} failed to initialize:`,
            error
        );
    }
}
