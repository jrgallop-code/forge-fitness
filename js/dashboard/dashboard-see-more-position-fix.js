const STYLE_ID = "dashboard-see-more-position-fix-4";

if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        /* Keep See More in its own clear gap between the calorie check-in and
         * the analytics row without changing either card's dimensions. */
        .dashboard-weight-see-more-wrap,
        .dashboard.dashboard-command-insights .metric-card.dashboard-seven-day-sets-card {
            margin-top: 24px !important;
        }

        /* Nutrition removes the See More wrapper. Apply its geometry to both
         * direct grid cards so removing it cannot leave a one-sided offset. */
        html[data-nutrition-enabled="false"] .dashboard.dashboard-command-insights > .metric-card.dashboard-seven-day-sets-card,
        html[data-nutrition-enabled="false"] .dashboard.dashboard-command-insights > .metric-card.dashboard-weight-trend-card {
            margin-top: 24px !important;
            height: 148px !important;
            min-height: 148px !important;
            max-height: 148px !important;
            align-self: start !important;
            box-sizing: border-box;
        }

        .dashboard-weight-see-more-action {
            top: -27px !important;
        }
    `;
    document.head.appendChild(style);
}
