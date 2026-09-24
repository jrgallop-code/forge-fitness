import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");

test("PWA wires monthly reports into Progress, Dashboard, and More", async () => {
    const [router, more, app] = await Promise.all([
        read("js/core/router.js"),
        read("js/more/more-ui-v2.js"),
        read("js/app.js")
    ]);
    assert.match(router, /initializeMonthlyReports/);
    assert.match(router, /initializeMonthlyReportDashboardPrompt/);
    assert.match(more, /data-more-page="monthly-reports"/);
    assert.match(more, /level_up_monthly_report_open_hub_v1/);
    assert.match(app, /router\.js\?v=pwa-monthly-reports-2/);
});

test("PWA monthly reports use browser-native share and printable PDF output", async () => {
    const report = await read("js/progress/monthly-report.js");
    assert.match(report, /navigator\.share/);
    assert.match(report, /navigator\.canShare/);
    assert.match(report, /downloadBlob/);
    assert.match(report, /printWindow\.print\(\)/);
    assert.doesNotMatch(report, /shareNative(?:Pdf|Image)File/);
    assert.doesNotMatch(report, /available in the iOS app/);
    assert.match(report, /weight-trend-chart\.js\?v=pwa-monthly-report-chart-1/);
    assert.match(report, /tdee-calorie-expenditure-carousel\.js\?v=pwa-monthly-report-chart-1/);
});

test("PWA cache includes monthly report styling", async () => {
    const worker = await read("service-worker.js");
    assert.match(worker, /2026-09-24-pwa-monthly-reports-348/);
    assert.match(worker, /monthly-report\.css\?v=pwa-monthly-reports-1/);
});

test("monthly report chart dependencies expose the shared renderers", async () => {
    const [weightChart, energyChart] = await Promise.all([
        read("js/progress/weight-trend-chart.js"),
        read("js/nutrition/tdee-calorie-expenditure-carousel.js")
    ]);
    assert.match(weightChart, /export function drawSharedWeightTrendChart/);
    assert.match(energyChart, /export function drawSharedCalorieExpenditureChart/);
});
