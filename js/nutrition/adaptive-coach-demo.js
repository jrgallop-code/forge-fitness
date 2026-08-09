export function initializeAdaptiveCoachDemo() {
    // Demo controls are intentionally disabled in the production UI.
    // Remove any stale demo panel that may still exist in a cached render.
    document.getElementById("adaptive-coach-demo-controls")?.remove();
}
