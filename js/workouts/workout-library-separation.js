import "./workout-template-adoption.js?v=workout-template-adoption-1";

const PLAN_KEY = "forge_workout_plans";
const SCHEDULE_KEY = "level_up_workout_schedule_v1";
const OPEN_ROUTINES_KEY = "level_up_open_my_routines_v1";
const STYLE_ID = "workout-library-separation-styles";
const VIEW_KEY = "workoutLibraryView";

export function initializeWorkoutLibrarySeparation(landing) {
    if (!landing) return false;
    ensureStyles();

    const hero = landing.querySelector(".workout-live-hero");
    const filterStrip = landing.querySelector(".workout-live-filter-strip");
    const catalogueSection = landing.querySelector("[data-workout-live-all-plans]");
    const catalogueList = catalogueSection?.querySelector(".workout-live-plan-list");
    const recommendedSection = landing.querySelector(".workout-live-recommended")?.closest(".workout-live-section");
    if (!hero || !filterStrip || !catalogueSection || !catalogueList || !recommendedSection) return false;

    const savedRows = [...landing.querySelectorAll(".workout-live-plan-row.is-saved")];
    const savedPlans = readSavedPlans();
    const savedById = new Map(savedPlans.map(plan => [String(plan.id), plan]));
    const scheduledPlanId = String(readSchedule()?.planId || "");

    let switcher = landing.querySelector("[data-workout-library-switcher]");
    let panels = landing.querySelector("[data-workout-library-panels]");
    let explorePanel = landing.querySelector('[data-workout-library-panel="explore"]');
    let routinesPanel = landing.querySelector('[data-workout-library-panel="routines"]');

    if (!switcher) {
        switcher = document.createElement("div");
        switcher.className = "workout-live-library-switcher";
        switcher.dataset.workoutLibrarySwitcher = "";
        switcher.setAttribute("role", "tablist");
        hero.insertAdjacentElement("afterend", switcher);
    }

    switcher.innerHTML = `
        <button type="button" role="tab" data-workout-library-tab="explore">Explore</button>
        <button type="button" role="tab" data-workout-library-tab="routines">My Routines <span>${savedPlans.length}</span></button>
    `;

    if (!panels) {
        panels = document.createElement("div");
        panels.className = "workout-live-library-panels";
        panels.dataset.workoutLibraryPanels = "";
        switcher.insertAdjacentElement("afterend", panels);
    }

    if (!explorePanel) {
        explorePanel = document.createElement("section");
        explorePanel.className = "workout-live-library-panel workout-live-library-explore";
        explorePanel.dataset.workoutLibraryPanel = "explore";
        panels.appendChild(explorePanel);
    }

    if (!routinesPanel) {
        routinesPanel = document.createElement("section");
        routinesPanel.className = "workout-live-library-panel workout-live-library-routines";
        routinesPanel.dataset.workoutLibraryPanel = "routines";
        panels.appendChild(routinesPanel);
    }

    [filterStrip, recommendedSection, catalogueSection].forEach(element => {
        if (element.parentElement !== explorePanel) explorePanel.appendChild(element);
    });

    routinesPanel.innerHTML = renderRoutinesHeader(savedPlans.length);
    const routinesList = routinesPanel.querySelector("[data-workout-live-your-training-list]");

    savedRows
        .sort((a, b) => {
            const aId = rowPlanId(a);
            const bId = rowPlanId(b);
            const currentDifference = Number(bId === scheduledPlanId) - Number(aId === scheduledPlanId);
            if (currentDifference) return currentDifference;
            return planActivity(savedById.get(bId)) - planActivity(savedById.get(aId));
        })
        .forEach(row => {
            const planId = rowPlanId(row);
            const isCurrent = Boolean(scheduledPlanId && planId === scheduledPlanId);
            const plan = savedById.get(planId);

            row.classList.toggle("is-current-plan", isCurrent);
            row.dataset.trainingPlanState = isCurrent ? "current" : "saved";

            const label = row.querySelector(".workout-live-row-copy > small");
            if (label) label.textContent = isCurrent ? "CURRENT PLAN" : planSourceLabel(plan);

            const description = row.querySelector(".workout-live-row-copy > em");
            if (description && (!plan?.description || /your saved workout plan|saved to your training library/i.test(description.textContent || ""))) {
                description.textContent = isCurrent
                    ? "Scheduled in your current training week."
                    : plan?.sourceTemplateId
                        ? "Saved from the Level Up workout library."
                        : "Saved to My Routines.";
            }

            routinesList?.appendChild(row);
        });

    if (!savedRows.length && routinesList) {
        routinesList.innerHTML = `
            <div class="workout-live-routines-empty">
                <strong>No saved routines yet</strong>
                <span>Save a Level Up plan, build your own, or start a template to add it here.</span>
                <button type="button" data-workout-library-go-explore>Explore Plans</button>
            </div>
        `;
    }

    updateCatalogueHeading(catalogueSection);
    markCatalogueCopies(catalogueList, savedPlans, scheduledPlanId);

    let requestedView = landing.dataset[VIEW_KEY] === "routines" ? "routines" : "explore";
    try {
        if (sessionStorage.getItem(OPEN_ROUTINES_KEY) === "1") {
            requestedView = "routines";
            sessionStorage.removeItem(OPEN_ROUTINES_KEY);
        }
    }
    catch {}

    const applyView = view => {
        const next = view === "routines" ? "routines" : "explore";
        landing.dataset[VIEW_KEY] = next;
        switcher.querySelectorAll("[data-workout-library-tab]").forEach(button => {
            const active = button.dataset.workoutLibraryTab === next;
            button.classList.toggle("active", active);
            button.setAttribute("aria-selected", active ? "true" : "false");
        });
        explorePanel.hidden = next !== "explore";
        routinesPanel.hidden = next !== "routines";
    };

    switcher.querySelectorAll("[data-workout-library-tab]").forEach(button => {
        button.addEventListener("click", () => applyView(button.dataset.workoutLibraryTab));
    });
    routinesPanel.querySelector("[data-workout-library-go-explore]")?.addEventListener("click", () => applyView("explore"));

    bindSwipeNavigation({ panels, landing, applyView });
    applyView(requestedView);
    return true;
}

function renderRoutinesHeader(count) {
    return `
        <div class="workout-live-library-heading">
            <div>
                <span>MY ROUTINES</span>
                <h2>My Routines</h2>
                <p>${count ? "Plans you've saved, built, imported or started." : "Your saved workout library."}</p>
            </div>
            <b>${count}</b>
        </div>
        <div class="workout-live-plan-list workout-live-your-training-list" data-workout-live-your-training-list></div>
    `;
}

function bindSwipeNavigation({ panels, landing, applyView }) {
    if (!panels || panels.dataset.workoutSwipeBound === "true") return;
    panels.dataset.workoutSwipeBound = "true";
    let startX = 0;
    let startY = 0;
    let ignoreSwipe = false;

    panels.addEventListener("touchstart", event => {
        const touch = event.changedTouches?.[0];
        if (!touch) return;
        ignoreSwipe = Boolean(event.target.closest?.(".workout-live-recommended,.workout-live-filter-strip,input,textarea,select"));
        startX = touch.clientX;
        startY = touch.clientY;
    }, { passive: true });

    panels.addEventListener("touchend", event => {
        if (ignoreSwipe) return;
        const touch = event.changedTouches?.[0];
        if (!touch) return;
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        if (Math.abs(deltaX) < 55 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

        const current = landing.dataset[VIEW_KEY] === "routines" ? "routines" : "explore";
        if (deltaX > 0 && current === "explore") applyView("routines");
        else if (deltaX < 0 && current === "routines") applyView("explore");
    }, { passive: true });
}

function rowPlanId(row) {
    return String(
        row.querySelector("[data-workout-live-saved-plan]")?.dataset.workoutLiveSavedPlan ||
        row.querySelector("[data-workout-live-catalogue-plan]")?.dataset.workoutLiveCataloguePlan ||
        ""
    );
}

function planSourceLabel(plan) {
    if (plan?.sourceTemplateId || plan?.sourceType === "level-up-template") return "SAVED FROM LEVEL UP";
    if (plan?.sourceType === "imported" || /^import-/i.test(String(plan?.id || ""))) return "IMPORTED ROUTINE";
    return "SAVED PLAN";
}

function planActivity(plan) {
    const value = Date.parse(plan?.lastUsedAt || plan?.savedAt || plan?.createdAt || "");
    return Number.isFinite(value) ? value : 0;
}

function updateCatalogueHeading(section) {
    const heading = section.querySelector(".workout-live-section-heading h2");
    const summary = section.querySelector(".workout-live-section-heading p");
    if (!heading) return;

    const showingAll = /all workout plans|all level up plans/i.test(heading.textContent || "");
    heading.textContent = showingAll ? "All Level Up Plans" : "Explore Level Up Plans";

    if (!summary) return;
    const text = String(summary.textContent || "")
        .replace(/^\d+ saved plans? shown first\s*·\s*/i, "")
        .replace(/\s*·\s*\d+ saved plans? shown first$/i, "")
        .trim();

    summary.textContent = showingAll
        ? (text || "Browse the complete Level Up workout library.")
        : (text ? `${text} · Find another plan` : "Find another Level Up plan.");
}

function markCatalogueCopies(catalogueList, savedPlans, scheduledPlanId) {
    const savedByTemplate = new Map();
    const savedByName = new Map();
    savedPlans.forEach(plan => {
        if (plan?.sourceTemplateId) savedByTemplate.set(String(plan.sourceTemplateId), String(plan.id));
        if (plan?.name) savedByName.set(normalizeName(plan.name), String(plan.id));
    });

    catalogueList.querySelectorAll(".workout-live-plan-row:not(.is-saved)").forEach(row => {
        const button = row.querySelector("[data-workout-live-catalogue-plan]");
        const templateId = String(button?.dataset.workoutLiveCataloguePlan || "");
        const nameElement = row.querySelector(".workout-live-row-copy > strong");
        const sourceElement = row.querySelector(".workout-live-row-copy > small");
        const savedId = savedByTemplate.get(templateId) || savedByName.get(normalizeName(nameElement?.textContent));
        const isInRoutines = Boolean(savedId);
        const isCurrentSource = Boolean(savedId && savedId === scheduledPlanId);

        row.classList.toggle("is-in-training-template", isInRoutines);
        row.classList.toggle("is-current-template-source", isCurrentSource);
        if (sourceElement) {
            sourceElement.textContent = isCurrentSource
                ? "LEVEL UP · CURRENT"
                : isInRoutines
                    ? "LEVEL UP · IN MY ROUTINES"
                    : "LEVEL UP";
        }
    });
}

function normalizeName(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function readSavedPlans() {
    try {
        const value = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]");
        return Array.isArray(value) ? value.filter(plan => plan?.id && Array.isArray(plan.days)) : [];
    }
    catch {
        return [];
    }
}

function readSchedule() {
    try {
        const value = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || "null");
        return value && typeof value === "object" ? value : null;
    }
    catch {
        return null;
    }
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.workout-live-page .workout-live-library-switcher{
  display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:0 2px 18px;padding:4px;
  border:1px solid var(--card-border);border-radius:14px;background:var(--surface-raised);
}
.workout-live-page .workout-live-library-switcher button{
  min-height:39px;padding:0 10px;border:0;border-radius:10px;background:transparent;color:var(--muted);
  font:inherit;font-size:11.5px;font-weight:800;
}
.workout-live-page .workout-live-library-switcher button.active{
  background:var(--card);color:var(--heading);box-shadow:0 2px 9px rgba(0,0,0,.1);
}
.workout-live-page .workout-live-library-switcher button span{
  display:inline-grid;place-items:center;min-width:19px;height:19px;margin-left:4px;padding:0 5px;border-radius:999px;
  background:var(--accent-soft);color:var(--accent-text);font-size:8px;
}
.workout-live-page .workout-live-library-panel[hidden]{display:none!important}
.workout-live-page .workout-live-library-routines{margin:0 0 24px;padding:2px 0 4px}
.workout-live-page .workout-live-library-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 2px 11px}
.workout-live-page .workout-live-library-heading>div{min-width:0}
.workout-live-page .workout-live-library-heading span{display:block;margin-bottom:3px;color:var(--accent-text);font-size:8px;font-weight:900;letter-spacing:.13em}
.workout-live-page .workout-live-library-heading h2{margin:0;color:var(--heading);font-size:21px;line-height:1.08;letter-spacing:-.03em}
.workout-live-page .workout-live-library-heading p{margin:4px 0 0;color:var(--muted);font-size:10.5px;line-height:1.3}
.workout-live-page .workout-live-library-heading>b{display:grid;place-items:center;flex:0 0 auto;width:30px;height:30px;border-radius:999px;background:var(--accent-soft);color:var(--accent-text);font-size:11px}
.workout-live-page .workout-live-your-training-list{gap:8px}
.workout-live-page .workout-live-library-routines .workout-live-plan-row{background:var(--card)!important}
.workout-live-page .workout-live-library-routines .workout-live-plan-row.is-current-plan{
  border-color:color-mix(in srgb,var(--accent) 64%,var(--card-border))!important;
  background:color-mix(in srgb,var(--accent) 8%,var(--card))!important;
  box-shadow:inset 3px 0 0 var(--accent),0 8px 22px rgba(0,0,0,.08)!important;
}
.workout-live-page .workout-live-library-routines .workout-live-plan-row.is-current-plan .workout-live-row-copy>small{color:var(--accent-text)!important}
.workout-live-page .workout-live-library-routines .workout-live-plan-row:not(.is-current-plan) .workout-live-row-copy>small{color:var(--text-secondary,var(--muted))!important}
.workout-live-page .workout-live-routines-empty{display:grid;justify-items:center;gap:6px;padding:28px 18px;border:1px dashed var(--line);border-radius:18px;background:var(--card);text-align:center}
.workout-live-page .workout-live-routines-empty strong{color:var(--heading);font-size:15px}
.workout-live-page .workout-live-routines-empty span{max-width:320px;color:var(--muted);font-size:10.5px;line-height:1.4}
.workout-live-page .workout-live-routines-empty button{min-height:38px;margin-top:5px;padding:0 13px;border:1px solid var(--accent);border-radius:11px;background:var(--accent-soft);color:var(--accent-text);font:inherit;font-size:10px;font-weight:800}
.workout-live-page [data-workout-live-all-plans]{padding-top:2px}
.workout-live-page .workout-live-plan-row.is-in-training-template{border-color:color-mix(in srgb,var(--accent) 24%,var(--card-border))!important}
.workout-live-page .workout-live-plan-row.is-in-training-template .workout-live-row-copy>small{color:var(--accent-text)!important}
@media(max-width:430px){
  .workout-live-page .workout-live-library-switcher{margin-left:0;margin-right:0}
  .workout-live-page .workout-live-library-heading p{max-width:250px}
}
`;
    document.head.appendChild(style);
}
