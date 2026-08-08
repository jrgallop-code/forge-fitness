import { renderWorkoutBuilder }
from "../workouts/workout-ui.js";

import { initializeWorkoutBuilder }
from "../workouts/workouts.js";

import { renderDashboard }
from "../dashboard/dashboard-ui.js";

import { renderProgress }
from "../progress/progress-ui.js";

import { initializeWeightTracker }
from "../progress/weight-tracker.js?v=weight-tracker-5";


import {
    initializePhotoJournal
}
from "../progress/photo-journal.js";

import { initializeTrainingProgress }
from "../progress/training-progress.js";

import {
    renderNutrition,
    initializeNutrition
}
from "../nutrition/nutrition-ui.js?v=nutrition-energy-2";


import {
    initializeBackupManager
}
from "./backup-manager.js";


import {
    initializeGoogleDriveSync
}
from "./google-drive-sync.js";


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
