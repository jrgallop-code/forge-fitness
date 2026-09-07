import "./appearance-volume-goals-fix.js?v=appearance-volume-goals-4";
import "./weight-viewport-summary-authority.js?v=weight-viewport-summary-2";
import "./weight-history-goal-colors.js?v=weight-history-neutral-1";
import "./progress-initial-tab-stability.js?v=progress-initial-tab-stability-1";
import "../workouts/workout-delete-message-cleanup.js?v=workout-delete-message-cleanup-1";
import "../workouts/repeat-workout-day.js?v=repeat-workout-day-1";
import "../workouts/custom-plan-label-authority.js?v=custom-plan-label-1";

const PREPAINT_STYLE_ID = "training-progress-collapse-prepaint";

function ensurePrepaintStyle() {
    if (document.getElementById(PREPAINT_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = PREPAINT_STYLE_ID;
    style.textContent = `
        /* Progress renders a legacy training header before this module reshapes it
           into Workout Snapshot. Hide only those transient pieces until the final
           structure is ready so Safari never paints the demo controls for a frame. */
        #lifting-progress:not(.training-progress-collapse-ready) > .training-progress-header,
        #lifting-progress:not(.training-progress-collapse-ready) > #training-demo-message,
        #lifting-progress:not(.training-progress-collapse-ready) > .training-summary-grid {
            visibility: hidden !important;
        }
    `;
    document.head.appendChild(style);
}

function unwrapLegacyDisclosure(liftingProgress) {
    const existing = liftingProgress.querySelector(":scope > .training-progress-disclosure");
    if (!existing) return false;

    const containsAnalytics = Boolean(
        existing.querySelector(".training-progress-tabs, .training-progress-view")
    );
    if (!containsAnalytics) return false;

    const panel = existing.querySelector(":scope > .training-progress-disclosure-panel");
    if (!panel) return false;

    while (panel.firstChild) {
        liftingProgress.insertBefore(panel.firstChild, existing);
    }

    existing.remove();
    return true;
}

export function initializeTrainingProgressCollapse() {
    ensurePrepaintStyle();

    const liftingProgress = document.getElementById("lifting-progress");
    if (!liftingProgress) return false;

    unwrapLegacyDisclosure(liftingProgress);

    const existing = liftingProgress.querySelector(":scope > .training-progress-disclosure");
    if (existing) {
        liftingProgress.classList.add("training-progress-collapse-ready");
        return true;
    }

    const header = liftingProgress.querySelector(":scope > .training-progress-header");
    const demoMessage = liftingProgress.querySelector(":scope > #training-demo-message");
    const summaryGrid = liftingProgress.querySelector(":scope > .training-summary-grid");

    // Never leave the page hidden if a future Progress layout intentionally
    // removes one of the legacy elements this compatibility layer expects.
    if (!header || !summaryGrid) {
        liftingProgress.classList.add("training-progress-collapse-ready");
        return false;
    }

    const actions = header.querySelector(".training-header-actions");

    const details = document.createElement("details");
    details.className = "training-progress-disclosure";

    const summary = document.createElement("summary");
    summary.innerHTML = `
        <span class="training-summary-title-wrap">
            <strong>Workout Snapshot</strong>
        </span>
        <span class="training-summary-toggle" aria-hidden="true">
            <svg class="training-summary-chevron" viewBox="0 0 24 24">
                <path d="m6 9 6 6 6-6"></path>
            </svg>
        </span>
    `;

    const panel = document.createElement("div");
    panel.className = "training-progress-disclosure-panel";

    if (actions) panel.appendChild(actions);
    if (demoMessage) panel.appendChild(demoMessage);
    panel.appendChild(summaryGrid);

    details.append(summary, panel);
    header.replaceWith(details);
    liftingProgress.classList.add("training-progress-collapse-ready");
    return true;
}

function addedProgressSurface(records) {
    return records.some(record => [...record.addedNodes].some(node =>
        node?.nodeType === 1 &&
        (node.id === "lifting-progress" || node.querySelector?.("#lifting-progress"))
    ));
}

ensurePrepaintStyle();

// The router replaces #content synchronously. MutationObserver callbacks run at
// the end of that same DOM mutation turn, before the browser's next paint, so
// convert the temporary demo/header markup here instead of one frame later.
const progressMountObserver = new MutationObserver(records => {
    if (!addedProgressSurface(records)) return;
    initializeTrainingProgressCollapse();
});
progressMountObserver.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", event => {
    if (!event.target.closest?.("#lifting-tab")) return;
    initializeTrainingProgressCollapse();
});

initializeTrainingProgressCollapse();
