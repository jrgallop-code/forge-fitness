import "./weight-visible-trend-sync.js?v=smoothed-visible-trend-4";
import "../nutrition/tdee-tutorial-controller.js?v=tdee-tutorial-controller-1";
import { initializeWeightCarbsChartV3 } from "./weight-chart-carousel-v3.js?v=smoothed-visible-trend-1";
import { initializeWeightCarbsInteractionEnhancements } from "./weight-carbs-interaction-enhancements.js?v=weight-carbs-interaction-2";
import { initializeWeightCalorieContextV2 } from "./weight-calorie-context-v2.js?v=smoothed-visible-trend-1";

export function initializeWeightCarbsChart(root = document) {
    initializeWeightCarbsChartV3(root);
    initializeWeightCarbsInteractionEnhancements(root);
    initializeWeightCalorieContextV2(root);
    bindPagerFallback();
}

function bindPagerFallback() {
    if (document.documentElement.dataset.weightPagerFallback === "1") return;
    document.documentElement.dataset.weightPagerFallback = "1";

    document.addEventListener("click", event => {
        const button = event.target.closest?.("#weight-progress [data-weight-graph-page-v2]");
        if (!button) return;
        const card = button.closest(".weight-chart-card");
        const track = card?.querySelector("[data-weight-graph-carousel-track-v2]");
        if (!track) return;
        const index = Math.max(0, Number(button.dataset.weightGraphPageV2) || 0);
        track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
        card.querySelectorAll("[data-weight-graph-page-v2]").forEach(item => {
            item.setAttribute("aria-pressed", String(item === button));
        });
    });
}