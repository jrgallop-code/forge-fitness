import { presetPlans as detailPresetPlans } from "./workout-plans.js";
import { celebrityWorkoutPlans } from "./celebrity-workout-plans.js?v=celebrity-plans-2-women-heroes";
import { bodybuilderWorkoutPlans } from "./bodybuilder-workout-plans.js?v=bodybuilder-library-3";
import { celebrityExpansionPlans } from "./celebrity-expansion-plans.js?v=celebrity-expansion-2";

const STYLE_ID = "workout-landing-live-polish-styles";
const STYLE_HREF = "/css/workout-landing-live-polish.css?v=workout-landing-live-polish-3";

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

    // The main Workout landing already owns schedule DOM movement through its
    // observer. Do not install a second observer here: two observers reshaping
    // the same schedule can make Safari appear to ignore the Workout tab.
    content.__workoutLandingPolishObserver?.disconnect?.();
    delete content.__workoutLandingPolishObserver;
    content.__workoutLandingPolishAbort?.abort?.();

    const landing = content.querySelector?.(".workout-live-landing");
    if (!landing) return false;

    const controller = new AbortController();
    content.__workoutLandingPolishAbort = controller;

    removeLegacyRowIcons(landing);
    configureSchedulePresentation(landing);
    requestAnimationFrame(() => configureSchedulePresentation(landing));

    document.addEventListener("click", event => {
        const target = event.target;

        // "All Plans" is intentionally a temporary browse mode. If the user taps
        // any existing filter while that mode is active, immediately restore the
        // current filtered result set first, then reopen the requested filter sheet.
        // This means Goal=Hypertrophy works even when the user chooses the same
        // value they already had instead of forcing them to change it twice.
        const filterButton = target.closest?.("[data-workout-live-filter]");
        const showMatches = landing.querySelector("[data-workout-live-show-matches]");
        if (filterButton && showMatches) {
            const key = filterButton.dataset.workoutLiveFilter;
            if (key) {
                event.preventDefault();
                event.stopImmediatePropagation();
                showMatches.click();
                requestAnimationFrame(() => {
                    landing.querySelector(`[data-workout-live-filter="${key}"]`)?.click();
                });
                return;
            }
        }

        if (target.closest?.('[data-workout-live-create-action="manual"]')) {
            content.dataset.workoutLiveManualEntry = "true";
            return;
        }
        if (target.closest?.('[data-workout-live-create-action="smart"], [data-workout-live-create-action="import"], .nav-btn')) {
            delete content.dataset.workoutLiveManualEntry;
        }
    }, { capture: true, signal: controller.signal });

    content.addEventListener("click", event => {
        const target = event.target;

        if (target.closest?.("#close-plan-builder-btn, #save-plan-btn")) {
            delete content.dataset.workoutLiveManualEntry;
            return;
        }

        if (!target.closest?.("[data-manual-back]")) return;
        if (content.dataset.workoutLiveManualEntry !== "true") return;

        // Let the exercise picker clean itself up, then close the real builder so
        // Back returns directly to the Workout landing instead of exposing the
        // older intermediate builder surface.
        queueMicrotask(() => {
            delete content.dataset.workoutLiveManualEntry;
            content.querySelector("#close-plan-builder-btn")?.click();
        });
    }, { signal: controller.signal });

    return true;
}

function removeLegacyRowIcons(landing) {
    landing.querySelectorAll(".workout-live-plan-row > svg, .workout-live-row-main > svg").forEach(svg => svg.remove());
}

function configureSchedulePresentation(landing) {
    const shell = landing.querySelector(".workout-schedule-shell");
    const heading = landing.querySelector(".workout-live-schedule-heading");
    if (!shell || !heading) return;

    // Keep the native schedule structure intact. The original Workout landing is
    // the only owner of that DOM; this layer only hides the duplicate Today card
    // and exposes its existing Edit action beside the weekly strip.
    shell.querySelector(".schedule-banner-top")?.classList.add("workout-live-schedule-context-hidden");
    shell.querySelector(".schedule-banner-actions")?.classList.add("workout-live-schedule-context-hidden");

    const nativeEdit = shell.querySelector("[data-schedule-edit]");
    const setupButton = shell.querySelector(".schedule-set-btn[data-schedule-edit]");
    if (setupButton) setupButton.classList.add("workout-live-schedule-context-hidden");

    let editButton = heading.querySelector("[data-workout-live-schedule-edit]");
    if (!editButton) {
        editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "workout-live-schedule-edit";
        editButton.dataset.workoutLiveScheduleEdit = "";
        heading.appendChild(editButton);
    }

    if (!nativeEdit) {
        editButton.hidden = true;
        return;
    }

    editButton.hidden = false;
    editButton.textContent = shell.classList.contains("schedule-setup-shell") ? "Set Schedule" : "Edit";

    if (editButton.dataset.boundScheduleEdit === "true") return;
    editButton.dataset.boundScheduleEdit = "true";
    editButton.addEventListener("click", () => {
        const currentShell = landing.querySelector(".workout-schedule-shell");
        currentShell?.querySelector("[data-schedule-edit]")?.click();
        requestAnimationFrame(() => {
            const editor = currentShell?.querySelector("[data-schedule-editor]");
            if (editor && !editor.hidden) editor.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
    });
}

function ensureStylesheet() {
    const existing = document.getElementById(STYLE_ID);
    if (existing) {
        if (existing.getAttribute("href") !== STYLE_HREF) existing.setAttribute("href", STYLE_HREF);
        return;
    }
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = STYLE_HREF;
    document.head.appendChild(link);
}
