let loading = false;

function ensureNutritionPhasesLoaded() {
    const planner = document.querySelector(".nutrition-planner-grid");
    if (!planner) return;

    if (planner.querySelector('[data-nutrition-view="phases"]')) return;
    if (loading) return;

    loading = true;
    import("./nutrition-phases.js?v=nutrition-phases-runtime-2")
        .catch(error => console.error("Nutrition phases failed to load:", error))
        .finally(() => { loading = false; });
}

function refreshAfterNavigation() {
    setTimeout(ensureNutritionPhasesLoaded, 50);
}

document.addEventListener("click", refreshAfterNavigation);
window.addEventListener("load", refreshAfterNavigation);
window.addEventListener("popstate", refreshAfterNavigation);

refreshAfterNavigation();
