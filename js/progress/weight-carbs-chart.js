import { initializeWeightCarbsChartV3 } from "./weight-chart-carousel-v3.js?v=smoothed-visible-trend-1";
import { initializeWeightCarbsInteractionEnhancements } from "./weight-carbs-interaction-enhancements.js?v=weight-carbs-interaction-2";
import { initializeWeightCalorieContextV2 } from "./weight-calorie-context-v2.js?v=smoothed-visible-trend-1";

export function initializeWeightCarbsChart(root = document) {
    initializeWeightCarbsChartV3(root);
    initializeWeightCarbsInteractionEnhancements(root);
    initializeWeightCalorieContextV2(root);
}
