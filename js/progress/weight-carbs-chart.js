import { initializeWeightCarbsChartV2 } from "./weight-chart-carousel-v2.js?v=weight-carousel-authoritative-1";
import { initializeWeightCarbsInteractionEnhancements } from "./weight-carbs-interaction-enhancements.js?v=weight-carbs-interaction-2";
import { initializeWeightCalorieContext } from "./weight-calorie-context.js?v=weight-calorie-context-1";

export function initializeWeightCarbsChart(root = document) {
    initializeWeightCarbsChartV2(root);
    initializeWeightCarbsInteractionEnhancements(root);
    initializeWeightCalorieContext(root);
}
