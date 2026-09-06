const STYLE_ID = "workout-landing-live-polish-styles";
const STYLE_HREF = "/css/workout-landing-live-polish.css?v=workout-landing-live-polish-1";

export function initializeWorkoutLandingLivePolish(content = document) {
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
