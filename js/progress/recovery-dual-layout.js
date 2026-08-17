function createFigure(root, label) {
    const figure = document.createElement("figure");
    figure.className = "recovery-dual-figure";
    figure.dataset.recoveryDualFigure = label.toLowerCase();

    const caption = document.createElement("figcaption");
    caption.textContent = label;

    figure.appendChild(root);
    figure.appendChild(caption);
    return figure;
}

function ensureBreakdownHeading(detailsPanel) {
    let heading = detailsPanel.querySelector(":scope > .recovery-breakdown-heading");
    if (heading) return heading;

    heading = document.createElement("div");
    heading.className = "recovery-breakdown-heading";
    heading.innerHTML = `
        <span class="eyebrow">RECOVERY BREAKDOWN</span>
        <h4>Muscle Readiness</h4>
        <p>Current recovery by muscle group from your completed training.</p>
    `;

    const list = detailsPanel.querySelector("[data-recovery-detail-list]");
    if (list) detailsPanel.insertBefore(heading, list);
    else detailsPanel.appendChild(heading);
    return heading;
}

function buildDualMap(shell) {
    const mapPanel = shell.querySelector("[data-recovery-map-panel]");
    const detailsPanel = shell.querySelector("[data-recovery-details-panel]");
    const front = shell.querySelector("[data-recovery-body-front]");
    const back = shell.querySelector("[data-recovery-body-back]");
    if (!mapPanel || !detailsPanel || !front || !back) return false;

    shell.classList.add("recovery-dual-layout");
    mapPanel.removeAttribute("hidden");
    detailsPanel.removeAttribute("hidden");

    shell.querySelector(".recovery-mode-switch")?.setAttribute("hidden", "");
    shell.querySelector(".recovery-facing-toggle")?.setAttribute("hidden", "");

    let mapCard = mapPanel.querySelector(":scope > .recovery-dual-map-card");
    if (!mapCard) {
        mapCard = document.createElement("div");
        mapCard.className = "recovery-dual-map-card";

        const scale = mapPanel.querySelector(":scope > .recovery-scale");
        const note = mapPanel.querySelector(":scope > .recovery-map-note");
        const anchor = scale || front;
        mapPanel.insertBefore(mapCard, anchor);
        if (scale) mapCard.appendChild(scale);

        const bodyGrid = document.createElement("div");
        bodyGrid.className = "recovery-dual-body-grid";
        bodyGrid.appendChild(createFigure(front, "Front"));
        bodyGrid.appendChild(createFigure(back, "Back"));
        mapCard.appendChild(bodyGrid);

        if (note) mapCard.appendChild(note);
    }

    front.hidden = false;
    back.hidden = false;
    front.style.display = "grid";
    back.style.display = "grid";

    detailsPanel.classList.add("recovery-breakdown-card");
    ensureBreakdownHeading(detailsPanel);
    return true;
}

function enhanceRecoveryLayout() {
    document.querySelectorAll(".muscle-recovery-map-view .recovery-map-shell").forEach(shell => {
        buildDualMap(shell);
    });
}

function queueRecoveryLayout() {
    requestAnimationFrame(enhanceRecoveryLayout);
    window.setTimeout(enhanceRecoveryLayout, 80);
    window.setTimeout(enhanceRecoveryLayout, 220);
}

document.addEventListener("click", event => {
    if (event.target.closest?.('[data-muscle-overview-mode="recovery"], #lifting-tab, .training-progress-tab[data-view="training"]')) {
        window.setTimeout(enhanceRecoveryLayout, 0);
        window.setTimeout(enhanceRecoveryLayout, 120);
    }
}, true);

const content = document.getElementById("content");
if (content) {
    // Route changes replace the Progress page at this level. Avoid observing the
    // recovery map itself so layout changes cannot trigger a self-refresh loop.
    new MutationObserver(queueRecoveryLayout).observe(content, { childList: true });
}

window.addEventListener("focus", enhanceRecoveryLayout);
queueRecoveryLayout();
