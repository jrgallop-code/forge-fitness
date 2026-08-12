let loading = false;
let settleTimer = null;
let observer = null;
let loadGeneration = 0;

function plannerReady() {
    return Boolean(
        document.querySelector(".nutrition-planner-grid") &&
        document.querySelector(".nutrition-planner-shell")
    );
}

function phaseButtonExists() {
    return Boolean(
        document.querySelector(
            '.nutrition-planner-grid [data-nutrition-view="phases"]'
        )
    );
}

function loadNutritionPhases() {
    if (loading || !plannerReady() || phaseButtonExists()) return;

    loading = true;
    const generation = loadGeneration++;

    import(`./nutrition-phases.js?v=nutrition-phases-runtime-4-${generation}`)
        .catch(error => {
            console.error("Nutrition phases failed to load:", error);
        })
        .finally(() => {
            loading = false;
            scheduleStableLoad();
        });
}

function scheduleStableLoad() {
    window.clearTimeout(settleTimer);

    if (!plannerReady()) return;

    settleTimer = window.setTimeout(() => {
        loadNutritionPhases();
    }, 80);
}

function watchForPlanner() {
    if (observer) return;

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
window.addEventListener("load", scheduleStableLoad);
window.addEventListener("popstate", scheduleStableLoad);

watchForPlanner();
