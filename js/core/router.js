import { renderWorkoutBuilder } from "../workouts/workout-ui.js?v=plan-builder-library-refresh-1";
import { initializeWorkoutBuilder } from "../workouts/workouts.js?v=builder-library-refresh-1";
import { initializeOneOffWorkout } from "../workouts/one-off-workout.js?v=one-off-workout-1";
import { initializeWorkoutCatalogue } from "../workouts/workout-catalogue.js?v=workout-catalogue-form-coach-removed-1";
import { initializeSmartBuild } from "../workouts/smart-build.js?v=smart-build-exercise-range-1";
import { initializeSmartBuildSupersetGuard } from "../workouts/smart-build-superset-guard.js?v=superset-clean-1";
import { renderDashboard } from "../dashboard/dashboard-ui.js?v=dashboard-workout-flow-1";
import { initializeDashboardNutritionTargets } from "../dashboard/nutrition-target-card.js?v=single-calorie-target-2";
import { renderWorkoutPerformanceDashboard, initializeWorkoutPerformance } from "../dashboard/workout-performance.js?v=workout-performance-1";
import { renderDashboardSchedule, initializeWorkoutSchedule } from "../workouts/workout-schedule.js?v=workout-schedule-3";
import { renderProgress } from "../progress/progress-ui.js?v=progress-photo-tab-1";
import { initializeWeightTracker } from "../progress/weight-tracker.js?v=weight-tracker-photo-tab-1";
import { initializeWeightProgressCompact } from "../progress/weight-progress-compact.js?v=current-goal-1";
import { initializeTrainingProgress } from "../progress/training-progress.js?v=exercise-progress-reps-zero-nodata-2";
import { initializeOverallStrengthIndex } from "../progress/overall-strength-index.js?v=overall-strength-index-2";
import { initializeWeeklyMuscleVolume } from "../progress/weekly-muscle-volume.js?v=training-analytics-5";
import { initializeMuscleRecoveryMap } from "../progress/muscle-recovery-map.js?v=recovery-traced-1";
import { renderSleepTracker, initializeSleepTracker } from "../progress/sleep-tracker.js?v=sleep-tracker-2";
import { renderMeasurementsTracker, initializeMeasurementsTracker } from "../progress/measurements-tracker.js?v=measurements-image-1";
import { initializeMeasurementHistoryDetail } from "../progress/measurements-history-detail.js?v=measurement-history-1";
import { renderNutrition, renderWater, initializeNutrition, showNutritionView } from "../nutrition/nutrition-ui.js?v=water-only-1";
import { renderEnergyProfile, initializeEnergyProfile } from "../nutrition/energy-profile.js?v=calorie-planner-2";
import { initializeProteinTargetExplanation } from "../nutrition/protein-target-ui.js?v=protein-target-1";
import { initializeNutritionPlanUI } from "../nutrition/nutrition-plan-ui-v4.js?v=current-goal-1";
import { initializeUnifiedGoalsCalories } from "../nutrition/unified-goals-calories.js?v=current-goal-1";
import { renderMore, initializeMore } from "../more/more-ui-v2.js?v=more-bmi-2";
import { renderWorkoutHistory, initializeWorkoutHistory } from "../workouts/workout-history.js?v=workout-history-preview-2";
import { initializeWorkoutPrBadges } from "../workouts/workout-pr-badges.js?v=workout-pr-badges-2";
import { initializeBackupManager } from "./backup-manager.js?v=backup-complete-3";
import { initializeGoogleDriveSync } from "./google-drive-sync-v2.js?v=visible-drive-backup-1";
import { getCurrentGoal } from "./current-goal.js?v=current-goal-1";

getCurrentGoal();

export function navigate(page) {
    const content = document.getElementById("content");
    if (!content) return;
    try {
        switch (page) {
            case "home":
                content.innerHTML = renderDashboardWithPerformance();
                safeInitialize("Dashboard nutrition targets", initializeDashboardNutritionTargets);
                safeInitialize("Workout performance", initializeWorkoutPerformance);
                safeInitialize("Workout schedule", () => initializeWorkoutSchedule(content));
                safeInitialize("Backup manager", initializeBackupManager);
                safeInitialize("Google Drive sync", initializeGoogleDriveSync);
                break;
            case "workout":
                content.innerHTML = renderWorkoutBuilder(); decorateWorkoutTitle(content); safeInitialize("Workout builder", initializeWorkoutBuilder); safeInitialize("Smart Build", () => initializeSmartBuild(content)); safeInitialize("Smart Build superset guard", () => initializeSmartBuildSupersetGuard(content)); safeInitialize("One-off workout", initializeOneOffWorkout); bindManualBuildLauncher(content); safeInitialize("Workout schedule", () => initializeWorkoutSchedule(content)); safeInitialize("Workout catalogue", () => initializeWorkoutCatalogue(content)); break;
            case "progress":
                content.innerHTML = renderProgress(); safeInitialize("Weight tracker", initializeWeightTracker); safeInitialize("Compact weight progress", initializeWeightProgressCompact); safeInitialize("Training progress", initializeTrainingProgress); safeInitialize("Overall strength index", initializeOverallStrengthIndex); safeInitialize("Weekly muscle volume", initializeWeeklyMuscleVolume); safeInitialize("Muscle recovery map", initializeMuscleRecoveryMap); safeInitialize("Workout PR badges", initializeWorkoutPrBadges); break;
            case "sleep":
                content.innerHTML = `<section class="section-card"><div class="training-progress-header"><div><span class="eyebrow">RECOVERY</span><h2>Sleep</h2><p>Track sleep duration, quality and recovery notes.</p></div></div>${renderSleepTracker()}</section>`; safeInitialize("Sleep tracker", initializeSleepTracker); break;
            case "measurements":
                content.innerHTML = renderMeasurementsTracker(); safeInitialize("Measurements tracker", initializeMeasurementsTracker); safeInitialize("Measurement history detail", initializeMeasurementHistoryDetail); break;
            case "nutrition":
                content.innerHTML = renderNutrition(); safeInitialize("Nutrition", initializeNutrition); safeInitialize("Nutrition main view", () => showNutritionView("main")); break;
            case "water":
                content.innerHTML = renderWater(); safeInitialize("Water log", initializeNutrition); break;
            case "energy":
                content.innerHTML = renderEnergyProfile(); safeInitialize("Energy profile", initializeEnergyProfile); safeInitialize("Protein target explanation", initializeProteinTargetExplanation); safeInitialize("Nutrition plan UI", initializeNutritionPlanUI); safeInitialize("Unified goals and calories", initializeUnifiedGoalsCalories); break;
            case "more": content.innerHTML = renderMore(); safeInitialize("More", initializeMore); break;
            case "history": content.innerHTML = renderWorkoutHistory(); safeInitialize("Workout history", initializeWorkoutHistory); safeInitialize("Workout PR badges", initializeWorkoutPrBadges); break;
            default:
                content.innerHTML = renderDashboardWithPerformance(); safeInitialize("Dashboard nutrition targets", initializeDashboardNutritionTargets); safeInitialize("Workout performance", initializeWorkoutPerformance);
                safeInitialize("Workout schedule", () => initializeWorkoutSchedule(content));
        }
    } catch (error) {
        console.error(`Route ${page} failed while rendering:`, error);
        content.innerHTML = `<section class="section-card"><h2>Page could not load</h2><p class="section-description">The page hit an initialization error. Navigation is still available below.</p></section>`;
    }
}

function renderDashboardWithPerformance() {
    const dashboard = renderDashboard();
    const statsPoint = '<section class="dashboard">';
    const detailPoint = '<section class="dashboard-detail-grid">';
    const withSchedule = dashboard.includes(statsPoint)
        ? dashboard.replace(statsPoint, renderDashboardSchedule() + statsPoint)
        : renderDashboardSchedule() + dashboard;
    return withSchedule.includes(detailPoint)
        ? withSchedule.replace(detailPoint, renderWorkoutPerformanceDashboard() + detailPoint)
        : withSchedule + renderWorkoutPerformanceDashboard();
}

function decorateWorkoutTitle(content) {
    const heading = content.querySelector(".workout-page-title h2"); if (!heading) return;
    heading.classList.add("icon-title-heading");
    heading.innerHTML = `<svg class="title-bicep-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3.1c.8-.5 1.8-.2 2.3.5l.8 1.2 1.1-.8c.7-.5 1.7-.3 2.2.4.4.6.3 1.5-.2 2l-2.1 1.8v3.2l1.1-1c1.2-1.1 2.8-1.7 4.4-1.7 2.9 0 5.3 2.1 5.7 4.9.5 3.6-2.3 6.9-6 6.9H8.1c-3.1 0-5.6-2.5-5.6-5.6 0-1.7.8-3.4 2.1-4.4l2.3-1.8V5.1c0-.8.1-1.5.3-2Z"/><path d="M7.1 2.8 9 2.1l1.2 2-2.1.9-1-2.2Zm3.3 2 1.8-1.3 1.2 1.7-2 1.5-1-1.9Z"/></svg><span>Workout</span>`;
}

function bindManualBuildLauncher(content) {
    const createButton = content.querySelector("#new-plan-btn");
    const oneOffButton = content.querySelector("#one-off-workout-btn");
    if (createButton) createButton.hidden = true;
    if (oneOffButton) oneOffButton.hidden = true;

    const original = content.querySelector("[data-manual-build]");
    if (!original) return;

    const manualButton = original.cloneNode(true);
    original.replaceWith(manualButton);

    manualButton.addEventListener("click", event => {
        event.stopPropagation();
        openManualBuildMenu(content);
    });
}

function openManualBuildMenu(content) {
    content.querySelector("[data-manual-build-menu]")?.remove();

    const home = content.querySelector("[data-workout-home]");
    const menu = document.createElement("section");
    menu.className = "smart-build-wizard";
    menu.dataset.manualBuildMenu = "";
    menu.innerHTML = `
        <div class="smart-build-topbar">
            <div>
                <span class="eyebrow">MANUAL BUILD</span>
                <h3>What would you like to do?</h3>
            </div>
            <button class="secondary-btn smart-build-close" type="button" data-manual-close>Close</button>
        </div>
        <div class="smart-question-card manual-build-menu-card">
            <p>Build a reusable workout plan, or log a workout that you only want saved to history.</p>
            <div class="smart-question-body">
                <button class="smart-option" type="button" data-manual-create-plan>
                    <strong>Create Your Own Plan</strong>
                    <small>Manually choose training days, exercises, sets and target reps. The plan will be saved to My Workouts.</small>
                </button>
                <button class="smart-option" type="button" data-manual-one-off>
                    <strong>Log One-Off Workout</strong>
                    <small>Choose exercises for today and log the session without saving a reusable workout plan.</small>
                </button>
            </div>
        </div>
    `;

    home?.insertAdjacentElement("afterend", menu);
    if (home) home.hidden = true;

    const restoreHome = () => {
        menu.remove();
        if (home) {
            home.hidden = false;
            home.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    menu.querySelector("[data-manual-close]")?.addEventListener("click", restoreHome);
    menu.querySelector("[data-manual-create-plan]")?.addEventListener("click", () => {
        menu.remove();
        content.querySelector("#new-plan-btn")?.click();
    });
    menu.querySelector("[data-manual-one-off]")?.addEventListener("click", () => {
        menu.remove();
        content.querySelector("#one-off-workout-btn")?.click();
    });

    menu.scrollIntoView({ behavior: "smooth", block: "start" });
}

function safeInitialize(name, initializer) { try { initializer(); } catch (error) { console.error(`${name} failed to initialize:`, error); } }