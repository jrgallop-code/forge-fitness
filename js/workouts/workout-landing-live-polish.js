import { presetPlans as detailPresetPlans } from "./workout-plans.js";
import { celebrityWorkoutPlans } from "./celebrity-workout-plans.js?v=celebrity-plans-2-women-heroes";
import { bodybuilderWorkoutPlans } from "./bodybuilder-workout-plans.js?v=bodybuilder-library-3";
import { celebrityExpansionPlans } from "./celebrity-expansion-plans.js?v=celebrity-expansion-2";

const STYLE_ID = "workout-landing-live-polish-styles";
const STYLE_HREF = "/css/workout-landing-live-polish.css?v=workout-landing-live-polish-2";

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
    content.__workoutLandingPolishAbort?.abort?.();

    const landing = content.querySelector?.(".workout-live-landing");
    if (!landing) return false;

    const controller = new AbortController();
    content.__workoutLandingPolishAbort = controller;

    const refine = () => {
        removeLegacyRowIcons(landing);
        simplifyWorkoutSchedule(landing);
    };

    refine();

    const observer = new MutationObserver(refine);
    observer.observe(landing, { childList: true, subtree: true });
    content.__workoutLandingPolishObserver = observer;

    document.addEventListener("click", event => {
        const target = event.target;
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

        // Let the manual catalogue clean up its picker first, then close the builder
        // in the same event turn so Back returns directly to the Workout landing.
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

function simplifyWorkoutSchedule(landing) {
    const shell = landing.querySelector(".workout-schedule-shell");
    const heading = landing.querySelector(".workout-live-schedule-heading");
    if (!shell || !heading) return;

    // Undo the earlier prototype treatment if it is still present in an already-open tab.
    const todayCard = shell.querySelector(".workout-live-today-card");
    if (todayCard) {
        const top = todayCard.querySelector(".schedule-banner-top");
        const actions = todayCard.querySelector(".schedule-banner-actions");
        const weekStrip = shell.querySelector(".schedule-week-strip");
        const editor = shell.querySelector(".schedule-editor");
        if (top) shell.insertBefore(top, weekStrip || shell.firstChild);
        if (actions) shell.insertBefore(actions, editor || null);
        todayCard.remove();
    }

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
