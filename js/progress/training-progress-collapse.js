export function initializeTrainingProgressCollapse() {
    const liftingProgress = document.getElementById("lifting-progress");
    if (!liftingProgress || liftingProgress.querySelector(".training-progress-disclosure")) return;

    const header = liftingProgress.querySelector(".training-progress-header");
    const demoMessage = liftingProgress.querySelector("#training-demo-message");
    const summaryGrid = liftingProgress.querySelector(".training-summary-grid");

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

initializeTrainingProgressCollapse();
