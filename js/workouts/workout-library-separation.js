const PLAN_KEY = "forge_workout_plans";
const SCHEDULE_KEY = "level_up_workout_schedule_v1";
const STYLE_ID = "workout-library-separation-styles";

export function initializeWorkoutLibrarySeparation(landing) {
    if (!landing) return false;
    ensureStyles();

    const catalogueSection = landing.querySelector("[data-workout-live-all-plans]");
    const catalogueList = catalogueSection?.querySelector(".workout-live-plan-list");
    const filterStrip = landing.querySelector(".workout-live-filter-strip");
    if (!catalogueSection || !catalogueList || !filterStrip) return false;

    const savedRows = [...landing.querySelectorAll(".workout-live-plan-row.is-saved")];
    const savedPlans = readSavedPlans();
    const savedById = new Map(savedPlans.map(plan => [String(plan.id), plan]));
    const scheduledPlanId = String(readSchedule()?.planId || "");

    let yourTraining = landing.querySelector("[data-workout-live-your-training]");
    if (!savedRows.length) {
        yourTraining?.remove();
        updateCatalogueHeading(catalogueSection, 0);
        markCatalogueCopies(catalogueList, savedPlans, scheduledPlanId);
        return true;
    }

    if (!yourTraining) {
        yourTraining = document.createElement("section");
        yourTraining.className = "workout-live-section workout-live-your-training";
        yourTraining.dataset.workoutLiveYourTraining = "";
        filterStrip.parentElement?.insertBefore(yourTraining, filterStrip);
    }

    yourTraining.innerHTML = `
        <div class="workout-live-library-heading">
            <div>
                <span>YOUR TRAINING</span>
                <h2>Your Training</h2>
                <p>Plans you've saved and are actively using.</p>
            </div>
            <b>${savedRows.length}</b>
        </div>
        <div class="workout-live-plan-list workout-live-your-training-list" data-workout-live-your-training-list></div>
    `;

    const yourList = yourTraining.querySelector("[data-workout-live-your-training-list]");
    savedRows
        .sort((a, b) => Number(rowPlanId(b) === scheduledPlanId) - Number(rowPlanId(a) === scheduledPlanId))
        .forEach(row => {
            const planId = rowPlanId(row);
            const isCurrent = Boolean(scheduledPlanId && planId === scheduledPlanId);
            const plan = savedById.get(planId);

            row.classList.toggle("is-current-plan", isCurrent);
            row.dataset.trainingPlanState = isCurrent ? "current" : "saved";

            const label = row.querySelector(".workout-live-row-copy > small");
            if (label) label.textContent = isCurrent ? "CURRENT PLAN" : "SAVED PLAN";

            const description = row.querySelector(".workout-live-row-copy > em");
            if (description && (!plan?.description || /your saved workout plan/i.test(description.textContent || ""))) {
                description.textContent = isCurrent
                    ? "Scheduled in your current training week."
                    : "Saved to your training library.";
            }

            yourList?.appendChild(row);
        });

    updateCatalogueHeading(catalogueSection, savedRows.length);
    markCatalogueCopies(catalogueList, savedPlans, scheduledPlanId);
    return true;
}

function rowPlanId(row) {
    return String(
        row.querySelector("[data-workout-live-saved-plan]")?.dataset.workoutLiveSavedPlan ||
        row.querySelector("[data-workout-live-catalogue-plan]")?.dataset.workoutLiveCataloguePlan ||
        ""
    );
}

function updateCatalogueHeading(section) {
    const heading = section.querySelector(".workout-live-section-heading h2");
    const summary = section.querySelector(".workout-live-section-heading p");
    if (!heading) return;

    const showingAll = /all workout plans|all level up plans/i.test(heading.textContent || "");
    heading.textContent = showingAll ? "All Level Up Plans" : "Explore Level Up Plans";

    if (!summary) return;
    let text = String(summary.textContent || "");
    text = text
        .replace(/^\d+ saved plans? shown first\s*·\s*/i, "")
        .replace(/\s*·\s*\d+ saved plans? shown first$/i, "")
        .trim();

    if (showingAll) {
        summary.textContent = text || "Browse the complete Level Up workout library.";
    }
    else {
        summary.textContent = text
            ? `${text} · Find another plan`
            : "Find another Level Up plan.";
    }
}

function markCatalogueCopies(catalogueList, savedPlans, scheduledPlanId) {
    const savedNames = new Map(
        savedPlans
            .filter(plan => plan?.name)
            .map(plan => [normalizeName(plan.name), String(plan.id)])
    );

    catalogueList.querySelectorAll(".workout-live-plan-row:not(.is-saved)").forEach(row => {
        const nameElement = row.querySelector(".workout-live-row-copy > strong");
        const sourceElement = row.querySelector(".workout-live-row-copy > small");
        const savedId = savedNames.get(normalizeName(nameElement?.textContent));
        const isInTraining = Boolean(savedId);
        const isCurrentSource = Boolean(savedId && savedId === scheduledPlanId);

        row.classList.toggle("is-in-training-template", isInTraining);
        row.classList.toggle("is-current-template-source", isCurrentSource);
        if (sourceElement) {
            sourceElement.textContent = isCurrentSource
                ? "LEVEL UP · CURRENT"
                : isInTraining
                    ? "LEVEL UP · SAVED"
                    : "LEVEL UP";
        }
    });
}

function normalizeName(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
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
.workout-live-page .workout-live-your-training{
  margin:0 0 22px!important;
  padding:14px 12px 12px;
  border:1px solid var(--card-border);
  border-radius:20px;
  background:color-mix(in srgb,var(--accent) 4%,var(--card));
  box-shadow:0 10px 28px rgba(0,0,0,.08);
}
.workout-live-page .workout-live-library-heading{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin:0 2px 11px;
}
.workout-live-page .workout-live-library-heading>div{min-width:0}
.workout-live-page .workout-live-library-heading span{
  display:block;
  margin-bottom:3px;
  color:var(--accent-text);
  font-size:8px;
  font-weight:900;
  letter-spacing:.13em;
}
.workout-live-page .workout-live-library-heading h2{
  margin:0;
  color:var(--heading);
  font-size:21px;
  line-height:1.08;
  letter-spacing:-.03em;
}
.workout-live-page .workout-live-library-heading p{
  margin:4px 0 0;
  color:var(--muted);
  font-size:10.5px;
  line-height:1.3;
}
.workout-live-page .workout-live-library-heading>b{
  display:grid;
  place-items:center;
  flex:0 0 auto;
  width:30px;
  height:30px;
  border-radius:999px;
  background:var(--accent-soft);
  color:var(--accent-text);
  font-size:11px;
}
.workout-live-page .workout-live-your-training-list{gap:8px}
.workout-live-page .workout-live-your-training .workout-live-plan-row{
  background:var(--card)!important;
}
.workout-live-page .workout-live-your-training .workout-live-plan-row.is-current-plan{
  border-color:color-mix(in srgb,var(--accent) 64%,var(--card-border))!important;
  background:color-mix(in srgb,var(--accent) 8%,var(--card))!important;
  box-shadow:inset 3px 0 0 var(--accent),0 8px 22px rgba(0,0,0,.08)!important;
}
.workout-live-page .workout-live-your-training .workout-live-plan-row.is-current-plan .workout-live-row-copy>small{
  color:var(--accent-text)!important;
}
.workout-live-page .workout-live-your-training .workout-live-plan-row:not(.is-current-plan) .workout-live-row-copy>small{
  color:var(--text-secondary,var(--muted))!important;
}
.workout-live-page [data-workout-live-all-plans]{
  padding-top:2px;
}
.workout-live-page [data-workout-live-all-plans] .workout-live-section-heading h2{
  letter-spacing:-.035em;
}
.workout-live-page .workout-live-plan-row.is-in-training-template{
  border-color:color-mix(in srgb,var(--accent) 24%,var(--card-border))!important;
}
.workout-live-page .workout-live-plan-row.is-in-training-template .workout-live-row-copy>small{
  color:var(--accent-text)!important;
}
@media(max-width:430px){
  .workout-live-page .workout-live-your-training{padding:12px 9px 10px;border-radius:18px}
  .workout-live-page .workout-live-library-heading{margin-left:3px;margin-right:3px}
  .workout-live-page .workout-live-library-heading p{max-width:250px}
}
`;
    document.head.appendChild(style);
}
