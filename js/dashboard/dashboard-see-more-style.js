const STYLE_ID = "dashboard-see-more-authoritative-styles";

function install() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .dashboard.dashboard-command-insights .dashboard-insights-see-more-row {
            grid-column: 1 / -1;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            min-height: 24px;
            margin: -2px 2px -2px;
        }
        .dashboard.dashboard-command-insights .dashboard-insights-see-more-row + .dashboard-weight-trend-card {
            margin-top: 0;
        }
        .dashboard-analytics-stack { display: grid; gap: 14px; }
        .dashboard-analytics-stack .dashboard-analytics-card { min-height: 0; }
        .dashboard-analytics-stack .dashboard-analytics-expenditure-card,
        .dashboard-analytics-stack .dashboard-analytics-balance-card { min-height: 360px; }
        .dashboard-expenditure-chart-shell,
        .dashboard-analytics-screen .calorie-expenditure-shell {
            position: relative;
            width: 100%;
            min-height: 250px;
            margin-top: 10px;
        }
        .dashboard-expenditure-chart-shell canvas,
        .dashboard-analytics-screen .calorie-expenditure-shell canvas {
            display: block;
            width: 100%;
            height: 250px;
            touch-action: pan-y;
        }
        .dashboard-analytics-screen .calorie-expenditure-tooltip {
            position: absolute;
            top: 12px;
            z-index: 3;
            width: 138px;
            padding: 8px 9px;
            border: 1px solid var(--card-border, var(--line));
            border-radius: 10px;
            background: var(--card);
            color: var(--text);
            box-shadow: var(--shadow);
            pointer-events: none;
        }
        .dashboard-analytics-screen .calorie-expenditure-tooltip strong,
        .dashboard-analytics-screen .calorie-expenditure-tooltip span,
        .dashboard-analytics-screen .calorie-expenditure-tooltip small { display: block; }
        .dashboard-analytics-screen .calorie-expenditure-tooltip strong { margin-bottom: 4px; font-size: 10px; }
        .dashboard-analytics-screen .calorie-expenditure-tooltip span { font-size: 9px; font-weight: 850; line-height: 1.45; }
        .dashboard-analytics-screen .calorie-expenditure-tooltip small { margin-top: 3px; color: var(--muted); font-size: 8px; line-height: 1.35; }
        .dashboard-analytics-screen .calorie-expenditure-legend {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 7px;
            color: var(--muted);
            font-size: 8px;
            font-weight: 850;
        }
        .dashboard-analytics-screen .calorie-expenditure-legend span { display: inline-flex; align-items: center; gap: 5px; }
        .dashboard-analytics-screen .calorie-expenditure-legend i { display: inline-block; box-sizing: border-box; }
        .dashboard-analytics-screen .calorie-expenditure-legend .is-calories {
            width: 8px; height: 10px; border: 1px solid var(--accent); border-radius: 2px;
            background: color-mix(in srgb,var(--accent) 28%,transparent);
        }
        .dashboard-analytics-screen .calorie-expenditure-legend .is-expenditure { width: 17px; height: 0; border-top: 2px solid var(--text); }
        .dashboard-analytics-screen .calorie-expenditure-hint { margin: 5px 0 0; color: var(--muted); font-size: 8px; font-weight: 650; text-align: center; }
        @media (max-width: 520px) {
            .dashboard-analytics-stack { gap: 10px; }
            .dashboard-analytics-stack .dashboard-analytics-card { padding: 14px; }
        }
    `;
    document.head.appendChild(style);
}

install();
