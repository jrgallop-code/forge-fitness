import { presetPlans as detailPresetPlans } from "./workout-plans.js";
import { celebrityWorkoutPlans } from "./celebrity-workout-plans.js?v=celebrity-plans-2-women-heroes";
import { bodybuilderWorkoutPlans } from "./bodybuilder-workout-plans.js?v=bodybuilder-library-3";
import { celebrityExpansionPlans } from "./celebrity-expansion-plans.js?v=celebrity-expansion-2";
import "./manual-form-guide-fix.js?v=catalogue-modify-form-guide-1";
import { initializeWorkoutLibrarySeparation } from "./workout-library-separation.js?v=workout-library-separation-1";

const STYLE_ID = "workout-landing-live-polish-styles";
const STYLE_HREF = "/css/workout-landing-live-polish.css?v=workout-landing-live-polish-7";

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
    decorateSavedPlanActions({ content, landing });
    initializeWorkoutLibrarySeparation(landing);
    requestAnimationFrame(() => {
        configureSchedulePresentation(landing);
        decorateSavedPlanActions({ content, landing });
        initializeWorkoutLibrarySeparation(landing);
    });

    document.addEventListener("click", event => {
        const target = event.target;

        const deleteButton = target.closest?.("[data-workout-live-delete-saved-plan]");
        if (deleteButton) {
            event.preventDefault();
            event.stopPropagation();
            deleteSavedPlanFromLiveCard({ content, landing, button: deleteButton });
            return;
        }

        // The landing can replace its plan rows when browsing/filtering. Reapply
        // the saved-plan action treatment and library separation on the next frame
        // without installing a second MutationObserver over the Workout page.
        if (target.closest?.("[data-workout-live-see-all], [data-workout-live-show-matches], [data-workout-live-all-control], [data-workout-live-filter-value], #save-plan-btn, #close-plan-builder-btn")) {
            queueSavedPlanDecoration({ content, landing });
        }

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
                    queueSavedPlanDecoration({ content, landing });
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
            window.setTimeout(() => {
                decorateSavedPlanActions({ content, landing });
                initializeWorkoutLibrarySeparation(landing);
            }, 140);
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

function queueSavedPlanDecoration({ content, landing }) {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            decorateSavedPlanActions({ content, landing });
            initializeWorkoutLibrarySeparation(landing);
        });
    });
}

function decorateSavedPlanActions({ landing }) {
    landing.querySelectorAll(".workout-live-plan-row.is-saved").forEach(row => {
        if (row.querySelector("[data-workout-live-delete-saved-plan]")) return;

        const openButton = row.querySelector(":scope > .workout-live-row-action[data-workout-live-saved-plan]");
        if (!openButton) return;

        let actions = row.querySelector(":scope > .workout-live-row-actions");
        if (!actions) {
            actions = document.createElement("span");
            actions.className = "workout-live-row-actions";
            row.insertBefore(actions, openButton);
            actions.appendChild(openButton);
        }

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "workout-live-row-delete";
        deleteButton.dataset.workoutLiveDeleteSavedPlan = openButton.dataset.workoutLiveSavedPlan || "";
        deleteButton.setAttribute("aria-label", "Delete saved workout plan");
        deleteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg><span>Delete</span>';
        actions.appendChild(deleteButton);
    });
}

function deleteSavedPlanFromLiveCard({ content, landing, button }) {
    const planId = button.dataset.workoutLiveDeleteSavedPlan;
    if (!planId) return;

    const sourceCard = content.querySelector(`[data-custom-plan-id="${cssEscape(planId)}"]`);
    const sourceDelete = [...(sourceCard?.querySelectorAll("button") || [])]
        .find(candidate => /delete plan/i.test(candidate.textContent || ""));

    if (!sourceDelete) return;

    sourceDelete.click();

    // The legacy delete handler owns confirmation and storage cleanup. If the
    // user confirmed, remove the corresponding live row immediately so the new
    // landing stays in sync without navigating away or rebuilding the page.
    window.setTimeout(() => {
        if (savedPlanExists(planId)) return;
        button.closest(".workout-live-plan-row")?.remove();
        updateSavedPlanSummary(landing);
        initializeWorkoutLibrarySeparation(landing);
    }, 0);
}

function savedPlanExists(planId) {
    try {
        const plans = JSON.parse(localStorage.getItem("forge_workout_plans") || "[]");
        return Array.isArray(plans) && plans.some(plan => String(plan?.id || "") === String(planId));
    }
    catch {
        return false;
    }
}

function updateSavedPlanSummary(landing) {
    const count = landing.querySelectorAll(".workout-live-plan-row.is-saved").length;
    const summary = landing.querySelector("[data-workout-live-all-plans] .workout-live-section-heading p");
    if (!summary) return;

    const label = `${count} saved plan${count === 1 ? "" : "s"} shown first`;
    let text = summary.textContent || "";

    if (/^\d+ saved plans? shown first · /i.test(text)) {
        summary.textContent = count
            ? text.replace(/^\d+ saved plans? shown first/i, label)
            : text.replace(/^\d+ saved plans? shown first ·\s*/i, "");
        return;
    }

    if (/ · \d+ saved plans? shown first$/i.test(text)) {
        summary.textContent = count
            ? text.replace(/\d+ saved plans? shown first$/i, label)
            : text.replace(/ · \d+ saved plans? shown first$/i, "");
    }
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

function cssEscape(value) {
    return globalThis.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&");
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
