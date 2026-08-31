const TOGGLE_STYLE_ID = "level-up-weight-carbs-detail-toggle-styles";
let bound = false;
let observer = null;

export function initializeWeightCarbsDetailToggle(root = document) {
    ensureStyles();
    decorate(root);

    if (!bound) {
        bound = true;
        document.addEventListener("pointerdown", event => {
            const card = document.querySelector("#weight-progress .weight-chart-card");
            const tooltip = card?.querySelector("[data-weight-carbs-tooltip-v2]");
            if (!card || !tooltip || tooltip.hidden) return;

            const shell = card.querySelector(".weight-carbs-chart-shell-v2");
            const tappedTooltip = tooltip.contains(event.target);
            const tappedGraph = shell?.contains(event.target);
            if (!tappedTooltip && !tappedGraph) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            clearViaExistingRangeControl(card);
        }, true);
    }

    if (!observer) {
        observer = new MutationObserver(() => decorate(document));
        const target = root.querySelector?.("#weight-progress") || document.querySelector("#weight-progress");
        if (target) observer.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    }
}

function clearViaExistingRangeControl(card) {
    const selectedRange = card.querySelector('button[data-weight-chart-range][aria-pressed="true"]')
        || card.querySelector("button[data-weight-chart-range]");
    if (selectedRange) {
        selectedRange.click();
        return;
    }

    const tooltip = card.querySelector("[data-weight-carbs-tooltip-v2]");
    if (tooltip) tooltip.hidden = true;
    window.dispatchEvent(new Event("resize"));
}

function decorate(root) {
    const tooltip = root.querySelector?.("[data-weight-carbs-tooltip-v2]") || document.querySelector("[data-weight-carbs-tooltip-v2]");
    if (tooltip) {
        tooltip.setAttribute("role", "button");
        tooltip.setAttribute("aria-label", "Close selected day details");
        tooltip.setAttribute("title", "Tap to close details");
    }

    const note = root.querySelector?.(".weight-carbs-interaction-note-v2") || document.querySelector(".weight-carbs-interaction-note-v2");
    if (note) note.textContent = "Tap or drag for day details. Tap the summary or graph again to close details.";
}

function ensureStyles() {
    if (document.getElementById(TOGGLE_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = TOGGLE_STYLE_ID;
    style.textContent = `
        #weight-progress .weight-carbs-tooltip-v2:not([hidden]){cursor:pointer;touch-action:manipulation}
    `;
    document.head.appendChild(style);
}
