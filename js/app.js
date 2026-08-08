import {
navigate
}
from "./core/router.js?v=router-exercise-progress-2";


import {
renderNavbar
}
from "./components/navbar.js?v=navbar-calorie-planner-2";

import {
initializeWorkoutRuntime
}
from "./workouts/workout-session.js?v=workout-session-4";

import {
initializeCaloriePlannerLabels
}
from "./nutrition/calorie-planner-labels.js?v=calorie-planner-2";

import {
initializeExerciseProgressZeroGuard
}
from "./progress/exercise-progress-zero-guard.js?v=zero-reps-no-data-1";


initializeWorkoutRuntime();
initializeCaloriePlannerLabels();
initializeExerciseProgressZeroGuard();

navigate("home");


if (
"serviceWorker" in navigator
) {
navigator.serviceWorker.register("./service-worker.js").catch(error =>
console.warn("Service worker registration failed:", error)
);
}



document.body.insertAdjacentHTML(

"beforeend",

renderNavbar()

);
