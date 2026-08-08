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

import { initializeTrainingProgress }
from "../progress/training-progress.js";


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

            initializeTrainingProgress();

            break;


        case "nutrition":

            content.innerHTML = `

                <section class="section-card">

                    <h2>
                        🌿 Nutrition
                    </h2>

                    <p>
                        Build balanced nutrition habits that support training, recovery, and everyday health.
                    </p>

                </section>

            `;

            break;


        default:

            content.innerHTML =
                renderDashboard();

    }

}