import { presetPlans as detailPresetPlans } from "./workout-plans.js";
import { celebrityWorkoutPlans } from "./celebrity-workout-plans.js?v=celebrity-plans-2-women-heroes";
import { bodybuilderWorkoutPlans } from "./bodybuilder-workout-plans.js?v=bodybuilder-library-3";
import { celebrityExpansionPlans } from "./celebrity-expansion-plans.js?v=celebrity-expansion-2";

const STYLE_ID = "workout-landing-live-polish-styles";
const STYLE_HREF = "/css/workout-landing-live-polish.css?v=workout-landing-live-polish-1";

// workout-plan-details.js intentionally uses the unversioned workout-plans module.
// Keep that module instance populated with every catalogue family so a tap on any
// premade routine resolves to the standard plan-detail experience before the
// legacy builder click handler can run.
function syncPremadePlanDetailRegistry() {
    const existing = new Set(detailPresetPlans.map(plan => String(plan?.id || "")));
    [
        ...celebrityWorkoutPlans,
        ...bodybuilderWorkoutPlans,
        ...celebrityExpansionPlans
    ].forEach(plan => {
        const id = String(plan?.id || "");
        if (!id || existing.has(id)) return;
        detailPresetPlans.push(plan);
        existing.add(id);
    });
}

syncPremadePlanDetailRegistry();

export function initializeWorkoutLandingLivePolish(content = document) {
    syncPremadePlanDetailRegistry();
    ensureStylesheet();

    content.__workoutLandingPolishObserver?.disconnect?.();

    const landing = content.querySelector?.(".workout-live-landing");
    if (!landing) return false;

    const clean = () => {
        landing.querySelectorAll(".workout-live-plan-row > svg, .workout-live-row-main > svg").forEach(svg => svg.remove());
    };

    clean();

    const observer = new MutationObserver(clean);
    observer.observe(landing, { childList: true, subtree: true });
    content.__workoutLandingPolishObserver = observer;
    return true;
}

function ensureStylesheet() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = STYLE_HREF;
    document.head.appendChild(link);
}
