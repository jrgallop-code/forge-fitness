export function initializeTrainingProgressCollapse() {
    const liftingProgress = document.getElementById("lifting-progress");
    if (!liftingProgress || liftingProgress.querySelector(".training-progress-disclosure")) return;

    const details = document.createElement("details");
    details.className = "training-progress-disclosure";

    const summary = document.createElement("summary");
    summary.innerHTML = `
        <span class="training-summary-title-wrap">
            <strong>Training Progress</strong>
            <small>Strength, volume, exercise trends and workout history</small>
        </span>
        <span class="training-summary-toggle" aria-hidden="true">
            <svg class="training-summary-chevron" viewBox="0 0 24 24">
                <path d="m6 9 6 6 6-6"></path>
            </svg>
        </span>
    `;

    const panel = document.createElement("div");
    panel.className = "training-progress-disclosure-panel";

    while (liftingProgress.firstChild) {
        panel.appendChild(liftingProgress.firstChild);
    }

    details.append(summary, panel);
    liftingProgress.appendChild(details);

    details.addEventListener("toggle", () => {
        if (!details.open) return;

        requestAnimationFrame(() => {
            const range = document.getElementById("progress-range");
            range?.dispatchEvent(new Event("change", { bubbles: true }));
            window.dispatchEvent(new Event("resize"));
        });
    });
}
