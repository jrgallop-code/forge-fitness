import {
    navigate
}
from "./core/router.js?v=router-icons-stage-2";

import {
    renderNavbar,
    initializeNavbar
}
from "./components/navbar.js?v=navbar-icons-3";

import {
    initializeWorkoutRuntime
}
from "./workouts/workout-session.js?v=workout-session-4";

initializeWorkoutRuntime();
navigate("home");

if ("serviceWorker" in navigator) {
    navigator.serviceWorker
        .register("./service-worker.js")
        .catch(error => console.warn("Service worker registration failed:", error));
}

document.body.insertAdjacentHTML("beforeend", renderNavbar());
initializeNavbar();
