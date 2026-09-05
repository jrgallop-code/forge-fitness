const STYLE_ID = "dashboard-see-more-position-fix-2";

if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        /* Give See More its own breathing room between the calorie check-in and
         * the analytics row without changing the card dimensions. */
        .dashboard-weight-see-more-wrap,
        .dashboard.dashboard-command-insights .metric-card.dashboard-seven-day-sets-card {
            margin-top: 10px !important;
        }

        .dashboard-weight-see-more-action {
            top: -20px !important;
        }
    `;
    document.head.appendChild(style);
}
