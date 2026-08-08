import {
navigate
}
from "./core/router.js?v=router-nutrition-dashboard-2";


import {
renderNavbar
}
from "./components/navbar.js?v=navbar-workout-flow-5";

import {
initializeWorkoutRuntime
}
from "./workouts/workout-session.js?v=workout-session-4";



initializeWorkoutRuntime();

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
