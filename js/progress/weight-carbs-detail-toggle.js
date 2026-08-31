const TOGGLE_STYLE_ID = "level-up-weight-carbs-detail-toggle-styles";
const boundCards = new WeakSet();
let observer = null;

export function initializeWeightCarbsDetailToggle(root = document) {
    ensureStyles();
    bindCard(root);

    if (!observer) {
        const target = root.querySelector?.("#weight-progress") || document.querySelector("#weight-progress");
        if (target) {
            observer = new MutationObserver(() => bindCard(document));
            observer.observe(target, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["hidden"]
            });
        }
    }
}

function bindCard(root) {
    const card = root.querySelector?.("#weight-progress .weight-chart-card")
        || document.querySelector("#weight-progress .weight-chart-card");
    if (!card) return;

    decorate(card);
    if (boundCards.has(card)) return;
    boundCards.add(card);

    // Keep this listener scoped to the Weight + Carbs card. A document-level
    // capture listener can suppress primary navigation before the navbar sees it.
    card.addEventListener("pointerdown", event => {
        const tooltip = card.querySelector("[data-weight-carbs-tooltip-v2]");
        if (!tooltip || tooltip.hidden || !tooltip.contains(event.target)) return;

        event.preventDefault();
        event.stopPropagation();
        clearViaExistingRangeControl(card);
    }, true);
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

function decorate(card) {
    const tooltip = card.querySelector("[data-weight-carbs-tooltip-v2]");
    if (tooltip) {
        tooltip.setAttribute("role", "button");
        tooltip.setAttribute("aria-label", "Close selected day details");
        tooltip.setAttribute("title", "Tap to close details");
    }

    const note = card.querySelector(".weight-carbs-interaction-note-v2");
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
