import { initializeWeightCarbsChart as initializeBaseWeightCarbsChart } from "./weight-chart-carousel.js?v=weight-carousel-1";
import { initializeWeightCarbsTrendParityFix } from "./weight-carbs-trend-parity-fix.js?v=weight-trend-parity-1";

export function initializeWeightCarbsChart(root = document) {
    initializeBaseWeightCarbsChart(root);
    initializeWeightCarbsTrendParityFix(root);
}
