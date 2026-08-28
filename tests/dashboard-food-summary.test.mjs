import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("dashboard combines today's calorie and macro progress into one full-width card", async () => {
    const [module, styles] = await Promise.all([
        read("../js/dashboard/nutrition-target-card.js"),
        read("../css/dashboard-food-summary.css")
    ]);

    assert.match(module, /entriesForDate\(localDateKey\(\)\)/);
    assert.match(module, /summarizeEntries/);
    assert.match(module, /Calories &amp; Macros/);
    assert.match(module, /macroMarkup\("Carbs"/);
    assert.match(module, /macroMarkup\("Fat"/);
    assert.match(module, /macroMarkup\("Protein"/);
    assert.match(styles, /grid-column:\s*1 \/ -1/);
    assert.match(styles, /dashboard-calorie-arc-value/);
    assert.match(styles, /#ff2638/);
    assert.match(styles, /#4bd184/);
    assert.match(module, /dashboard-macro-progress--/);
    assert.match(module, /label\.toLowerCase\(\)/);
    assert.match(styles, /--macro-color:\s*#4fa8ff/);
    assert.match(styles, /--macro-color:\s*#8b7cf6/);
    assert.match(styles, /--macro-color:\s*#39d7ae/);
    assert.match(module, /dashboard-calorie-overflow-hatch/);
    assert.match(module, /dashboard-calorie-arc-overflow/);
    assert.match(module, /overTarget \/ calories/);
    assert.match(styles, /dashboard-calorie-arc-overflow/);
});

test("calorie summary toggles between consumed and remaining and links to Food Log", async () => {
    const module = await read("../js/dashboard/nutrition-target-card.js");

    assert.match(module, /level_up_dashboard_calorie_display_v1/);
    assert.match(module, /mode === "consumed" \? "remaining" : "consumed"/);
    assert.match(module, /remaining ·/);
    assert.match(module, /over goal ·/);
    assert.match(module, /data-dashboard-open-food-log/);
    assert.match(module, /data-page="energy"/);
});

test("Food Log keeps the complete Goals and Plan experience discoverable", async () => {
    const [foodLog, router, html] = await Promise.all([
        read("../js/nutrition/food-log.js"),
        read("../js/core/router.js"),
        read("../index.html")
    ]);

    assert.match(foodLog, /data-calories-panel="log"/);
    assert.match(foodLog, /data-calories-panel="plan"/);
    assert.match(foodLog, /Goals &amp; Plan/);
    assert.match(foodLog, /Calorie goals, lean bulk &amp; planning/);
    assert.match(foodLog, /level_up_calories_tab_v1/);
    assert.match(router, /renderCaloriesHub\(renderEnergyProfile\(\)\)/);
    assert.match(html, /dashboard-command-center\.css\?v=food-log-meals-v2/);
    assert.match(html, /js\/app\.js\?v=food-history-priority-1/);
});

test("dashboard nutrition card uses the compact summary geometry", async () => {
    const [module, styles] = await Promise.all([
        read("../js/dashboard/nutrition-target-card.js"),
        read("../css/dashboard-food-summary.css")
    ]);
    assert.match(module, /viewBox="0 0 240 100"/);
    assert.match(styles, /width:\s*min\(100%, 276px\)/);
    assert.match(styles, /min-height:\s*116px/);
});
