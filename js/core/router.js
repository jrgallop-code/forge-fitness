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
from "../progress/training-progress.js?v=training-duration-1";

import { initializeSleepTracker }
from "../progress/sleep-tracker.js?v=sleep-tracker-2";

import {
    renderNutrition,
    initializeNutrition,
    showNutritionView
}
from "../nutrition/nutrition-ui.js?v=nutrition-more-1";

import {
    renderEnergyProfile,
    initializeEnergyProfile
}
from "../nutrition/energy-profile.js?v=nutrition-protein-1";

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
from "../nutrition/goal-projection.js?v=active-target-2";

import {
    renderMore,
    initializeMore
}
from "../more/more-ui-v2.js?v=more-menu-live-1";

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

    switch (page) {
        case "home":
            content.innerHTML =
                renderDashboard();

            initializeDashboardNutritionTargets();
            initializeBackupManager();
            initializeGoogleDriveSync();
            break;

        case "workout":
            content.innerHTML =
                renderWorkoutBuilder();

            initializeWorkoutBuilder();
            break;

        case "progress":
            content.innerHTML =
                renderProgress();

            initializeProgressFeature(
                "Weight tracker",
                initializeWeightTracker
            );

            initializeManualGoalSync();

            initializeProgressFeature(
                "Photo journal",
                initializePhotoJournal
            );

            initializeProgressFeature(
                "Training progress",
                initializeTrainingProgress
            );

            initializeProgressFeature(
                "Sleep tracker",
                initializeSleepTracker
            );
            break;

        case "nutrition":
            content.innerHTML =
                renderNutrition();

            initializeNutrition();
            showNutritionView("main");
            break;

        case "water":
            content.innerHTML =
                renderNutrition();

            initializeNutrition();
            showNutritionView("water");
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
                            ← Nutrition Planner
                        </button>

                        ${renderGoalProjection()}
                    </div>
                `;

            initializeEnergyProfile();
            initializeProteinTargetExplanation();
            initializeGoalProjection();
            initializeNutritionPlanUI();
            initializeGoalsCalculationModeUI();
            initializeActiveTargetSyncHooks();
            initializeNutritionPlanHooks();
            initializeAdaptiveCoachDemo();
            initializeManualGoalSync();
            break;

        case "more":
            content.innerHTML =
                renderMore();

            initializeMore();
            break;

        case "history":
            content.innerHTML =
                renderWorkoutHistory();

            initializeWorkoutHistory();
            break;

        default:
            content.innerHTML =
                renderDashboard();
            initializeDashboardNutritionTargets();
    }
}

function initializeProgressFeature(
    name,
    initializer
) {
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
