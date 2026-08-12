import { initializeManualSupersetBuilder } from "./manual-superset-builder.js?v=manual-superset-builder-1";

// Smart Build v4 enforces its own superset safety rules during generation.
// This compatibility initializer now preserves only the manual-plan superset feature.
export function initializeSmartBuildSupersetGuard(root = document) {
    initializeManualSupersetBuilder(root);
}
