let loading = false;
let loaded = false;
let settleTimer = null;
let observer = null;

function plannerReady() {
    return Boolean(
        document.querySelector(".nutrition-planner-grid") &&
        document.querySelector(".nutrition-planner-shell")
    );
}

function loadNutritionPhases() {
    if (loaded || loading || !plannerReady()) return;

    loading = true;
    import("./nutrition-phases.js?v=nutrition-phases-runtime-3")
        .then(() => {
            loaded = true;
            observer?.disconnect();
            observer = null;
        })
        .catch(error => {
            console.error("Nutrition phases failed to load:", error);
        })
        .finally(() => {
            loading = false;
        });
}

function scheduleStableLoad() {
    window.clearTimeout(settleTimer);

    if (!plannerReady()) return;

    settleTimer = window.setTimeout(() => {
        loadNutritionPhases();
    }, 120);
}

function watchForPlanner() {
    if (loaded || observer) return;

    observer = new MutationObserver(() => {
        scheduleStableLoad();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    scheduleStableLoad();
}

document.addEventListener("click", scheduleStableLoad, true);
window.addEventListener("load", watchForPlanner);
window.addEventListener("popstate", watchForPlanner);

watchForPlanner();
