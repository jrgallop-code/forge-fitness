let loading = false;
let observer = null;
let loadGeneration = 0;

function getPlannerGrid() {
    return document.querySelector(".nutrition-planner-grid");
}

function plannerReady() {
    return Boolean(
        getPlannerGrid() &&
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

function ensurePhaseButton() {
    const grid = getPlannerGrid();
    if (!grid || phaseButtonExists()) return;

    grid.insertAdjacentHTML(
        "afterbegin",
        `<button class="nutrition-planner-card nutrition-phase-launcher" type="button" data-nutrition-view="phases">
            <span class="nutrition-planner-icon">↗</span>
            <strong>Nutrition Phases</strong>
            <small>Track cuts, maintenance & gaining phases</small>
        </button>`
    );
}

function loadNutritionPhases() {
    if (loading || !plannerReady()) return;

    ensurePhaseButton();

    const phaseViewExists = Boolean(
        document.querySelector('[data-planner-view="phases"]')
    );

    if (phaseViewExists) return;

    loading = true;
    const generation = loadGeneration++;

    import(`./nutrition-phases.js?v=nutrition-phases-runtime-5-${generation}`)
        .catch(error => {
            console.error("Nutrition phases failed to load:", error);
        })
        .finally(() => {
            loading = false;
            ensureNutritionPhases();
        });
}

function ensureNutritionPhases() {
    if (!plannerReady()) return;

    // Keep the launcher part of the first visible Nutrition render. The
    // heavier phase view can initialize immediately afterward without making
    // the dashboard card visibly pop in late.
    ensurePhaseButton();
    loadNutritionPhases();
}

function watchForPlanner() {
    if (observer) return;

    observer = new MutationObserver(() => {
        ensureNutritionPhases();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    ensureNutritionPhases();
}

document.addEventListener("click", ensureNutritionPhases, true);
window.addEventListener("load", ensureNutritionPhases);
window.addEventListener("popstate", ensureNutritionPhases);

watchForPlanner();
