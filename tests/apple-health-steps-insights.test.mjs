import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const insights=readFileSync("js/dashboard/dashboard-insights-analytics-v5.js","utf8");
const health=readFileSync("js/health/apple-health.js","utf8");
const native=readFileSync("ios/App/App/LevelUpBridgeViewController.swift","utf8");

test("steps card follows Goal Timeline and occupies the full insights row",()=>{
    assert.match(insights,/\$\{goalTimelinePreviewMarkup\(goal\)\}\$\{stepsPreviewCardMarkup\(\)\}/);
    assert.match(insights,/\.dashboard-preview-steps\{grid-column:1\/-1/);
    assert.match(insights,/data-insights-step-average/);
    assert.match(insights,/data-insights-step-total/);
    assert.match(insights,/hydrateStepsPreview\(screen\)/);
});
test("steps detail retains its source screen with a real back action",()=>{
    assert.match(insights,/openStepsDetail\(\)/);
    assert.match(health,/document\.body\.appendChild\(screen\)/);
    assert.match(health,/data-apple-steps-close/);
    assert.match(health,/closeStepsDetail\(\)/);
    assert.doesNotMatch(health,/function showSteps\(\)\{[\s\S]*?content\.innerHTML/);
});
test("range selector and source data support week through year",()=>{
    for(const option of ["1W","1M","3M","6M","1Y"]) assert.match(health,new RegExp('"' + option + '":'));
    assert.match(health,/readActivity\(\{days:365\}\)/);
    assert.match(native,/requestedDays = min\(max\(call\.getInt\("days"\) \?\? 14, 7\), 365\)/);
    assert.match(health,/Weekly average/);
    assert.match(health,/Daily average/);
});
test("dashboard steps shows large average with weekly total below",()=>{
    assert.match(health,/<strong data-apple-step-average>/);
    assert.match(health,/<small data-apple-step-total>/);
    assert.match(health,/Weekly total:/);
});
