import { renderWorkoutBuilder }
from "../workouts/workout-ui.js";

import { initializeWorkoutBuilder }
from "../workouts/workouts.js";

import { renderDashboard }
from "../dashboard/dashboard-ui.js?v=dashboard-recovery-1";

import { renderProgress }
from "../progress/progress-ui.js?v=progress-sleep-2";

import { initializeWeightTracker }
from "../progress/weight-tracker.js?v=weight-tracker-7";


import {
    initializePhotoJournal
}
from "../progress/photo-journal.js";

import { initializeTrainingProgress }
from "../progress/training-progress.js";

import { initializeSleepTracker }
from "../progress/sleep-tracker.js?v=sleep-tracker-2";

import {
    renderNutrition,
    initializeNutrition
}
from "../nutrition/nutrition-ui.js?v=nutrition-water-1";


import {
    initializeBackupManager
}
from "./backup-manager.js?v=recovery-backup-1";


import {
    initializeGoogleDriveSync
}
from "./google-drive-sync.js?v=recovery-backup-1";


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

            break;


        default:

            content.innerHTML =
                renderDashboard();

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
