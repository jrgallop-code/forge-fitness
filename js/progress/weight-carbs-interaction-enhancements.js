import { massUnit } from "../core/unit-system.js?v=granular-units-1";

const STYLE_ID = "level-up-weight-carbs-interaction-enhancements";
const boundCanvases = new WeakSet();
const DOUBLE_TAP_MS = 360;
const DOUBLE_TAP_DISTANCE = 28;
const MOVE_TOLERANCE = 12;

export function initializeWeightCarbsInteractionEnhancements(root = document) {
    ensureStyles();
    bindEnhancements(root);
}

function bindEnhancements(root) {
    const scope = root?.querySelector ? root : document;
    const shell = scope.querySelector?.("#weight-progress .weight-carbs-chart-shell-v2")
        || document.querySelector("#weight-progress .weight-carbs-chart-shell-v2");
    const canvas = shell?.querySelector?.("[data-weight-carbs-canvas-v2]");
    if (!shell || !canvas) {
        requestAnimationFrame(() => bindEnhancements(root));
        return;
    }

    updateAxisUnit(shell);
    if (boundCanvases.has(canvas)) return;
    boundCanvases.add(canvas);

    let lastTapAt = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    let pointerStartX = 0;
    let pointerStartY = 0;
    let moved = false;

    canvas.addEventListener("pointerdown", event => {
        if (event.pointerType === "mouse") return;
        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
        moved = false;
    }, { passive: true });

    canvas.addEventListener("pointermove", event => {
        if (event.pointerType === "mouse") return;
        if (Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY) > MOVE_TOLERANCE) moved = true;
    }, { passive: true });

    canvas.addEventListener("pointerup", event => {
        if (event.pointerType === "mouse" || moved) return;
        const now = performance.now();
        const closeEnough = Math.hypot(event.clientX - lastTapX, event.clientY - lastTapY) <= DOUBLE_TAP_DISTANCE;
        const isDoubleTap = lastTapAt > 0 && now - lastTapAt <= DOUBLE_TAP_MS && closeEnough;

        if (isDoubleTap) {
            lastTapAt = 0;
            clearSelectedDay(shell);
            return;
        }

        lastTapAt = now;
        lastTapX = event.clientX;
        lastTapY = event.clientY;
    }, { passive: true });

    canvas.addEventListener("dblclick", () => clearSelectedDay(shell));
    window.addEventListener("levelup:units-changed", () => updateAxisUnit(shell));
}

function updateAxisUnit(shell) {
    shell.dataset.weightAxisUnit = massUnit();
}

function clearSelectedDay(shell) {
    const card = shell.closest(".weight-chart-card");
    const selectedRange = card?.querySelector('button[data-weight-chart-range][aria-pressed="true"]')
        || card?.querySelector("button[data-weight-chart-range]");

    if (selectedRange) {
        selectedRange.click();
        return;
    }

    const tooltip = shell.querySelector("[data-weight-carbs-tooltip-v2]");
    if (tooltip) tooltip.hidden = true;
}

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        #weight-progress .weight-carbs-chart-shell-v2::before {
            content: attr(data-weight-axis-unit);
            position: absolute;
            z-index: 4;
            top: 1px;
            left: 3px;
            min-width: 34px;
            padding: 1px 4px 3px;
            background: #111113;
            color: #8f8f98;
            font: 800 10px/1 Arial, sans-serif;
            text-align: left;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
}
