import { renderDashboard }
from "../dashboard/dashboard-ui.js";

import { renderProgress }
from "../progress/progress-ui.js";

import { initializeWeightTracker }
from "../progress/weight-tracker.js";


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

            content.innerHTML = `

                <section class="section-card">

                    <h2>
                        Today's Workout
                    </h2>

                    <p>
                        No workout started yet.
                    </p>

                    <button class="primary-btn">
                        Start Workout
                    </button>

                </section>

            `;

            break;


        case "progress":

            content.innerHTML =
                renderProgress();

            initializeWeightTracker();

            break;


        case "goals":

            content.innerHTML = `

                <section class="section-card">

                    <h2>
                        🎯 Goals & Calories
                    </h2>

                    <p>
                        Goal phase system temporarily disconnected while debugging.
                    </p>

                </section>

            `;

            break;


        default:

            content.innerHTML =
                renderDashboard();

    }

}