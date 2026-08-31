import { initializeWeightCarbsChartV2 } from "./weight-chart-carousel-v2.js?v=weight-carousel-authoritative-1";
import { initializeWeightCarbsDetailToggle } from "./weight-carbs-detail-toggle.js?v=weight-carbs-detail-toggle-1";

export function initializeWeightCarbsChart(root = document) {
    initializeWeightCarbsChartV2(root);
    initializeWeightCarbsDetailToggle(root);
}
