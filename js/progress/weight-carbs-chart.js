import { initializeWeightCarbsChartV2 } from "./weight-chart-carousel-v2.js?v=weight-carousel-authoritative-1";
import { initializeWeightCarbsInteractionEnhancements } from "./weight-carbs-interaction-enhancements.js?v=weight-carbs-interaction-2";
import { initializeWeightSecondaryContext } from "./weight-secondary-context.js?v=weight-secondary-context-1";

export function initializeWeightCarbsChart(root = document) {
    initializeWeightCarbsChartV2(root);
    initializeWeightCarbsInteractionEnhancements(root);
    initializeWeightSecondaryContext(root);
}
