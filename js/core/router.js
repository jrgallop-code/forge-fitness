import { renderWorkoutBuilder }
from "../workouts/workout-ui.js";

import { initializeWorkoutBuilder }
from "../workouts/workouts.js";

import { renderDashboard }
from "../dashboard/dashboard-ui.js";

import { renderProgress }
from "../progress/progress-ui.js";

import { initializeWeightTracker }
from "../progress/weight-tracker.js";


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
from "../nutrition/nutrition-ui.js";


import {
    initializeBackupManager
}
from "./backup-manager.js";


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

            break;


    case "workout":

    content.innerHTML =
        renderWorkoutBuilder();

    initializeWorkoutBuilder();

    break;


        case "progress":

            content.innerHTML =
                renderProgress();

            initializeWeightTracker();

            initializePhotoJournal();

            initializeTrainingProgress();

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