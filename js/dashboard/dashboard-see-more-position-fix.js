const STYLE_ID = "dashboard-see-more-position-fix-3";

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

        .dashboard-weight-see-more-action {
            top: -27px !important;
        }
    `;
    document.head.appendChild(style);
}
