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
    const liftingProgress = document.getElementById("lifting-progress");
    if (!liftingProgress) return;

    unwrapLegacyDisclosure(liftingProgress);

    const existing = liftingProgress.querySelector(":scope > .training-progress-disclosure");
    if (existing) return;

    const header = liftingProgress.querySelector(":scope > .training-progress-header");
    const demoMessage = liftingProgress.querySelector(":scope > #training-demo-message");
    const summaryGrid = liftingProgress.querySelector(":scope > .training-summary-grid");

    if (!header || !summaryGrid) return;

    const titleBlock = header.querySelector(":scope > div:first-child");
    const actions = header.querySelector(".training-header-actions");

    const details = document.createElement("details");
    details.className = "training-progress-disclosure";

    const summary = document.createElement("summary");
    summary.innerHTML = `
        <span class="training-summary-title-wrap">
            <strong>${titleBlock?.querySelector("h3")?.textContent || "Training Progress"}</strong>
            <small>${titleBlock?.querySelector("p")?.textContent || "Review strength, training volume and completed sessions."}</small>
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
}

document.addEventListener("click", event => {
    if (!event.target.closest?.("#lifting-tab")) return;
    requestAnimationFrame(initializeTrainingProgressCollapse);
});

requestAnimationFrame(initializeTrainingProgressCollapse);
