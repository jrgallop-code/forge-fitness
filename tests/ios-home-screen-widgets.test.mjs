import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("iOS ships theme-aware small and medium dashboard widgets", async () => {
  const [bundle, widget, plugin, project] = await Promise.all([
    read("ios/App/LevelUpTimerWidget/LevelUpTimerWidget.swift"),
    read("ios/App/LevelUpTimerWidget/LevelUpDashboardWidget.swift"),
    read("ios/App/App/LevelUpDashboardWidgetPlugin.swift"),
    read("ios/App/App.xcodeproj/project.pbxproj")
  ]);
  assert.match(bundle, /LevelUpDashboardWidget\(\)/);
  assert.match(widget, /TimerPalette\.forTheme\(entry\.snapshot\.theme\)/);
  assert.match(widget, /\.supportedFamilies\(\[\.systemSmall, \.systemMedium\]\)/);
  assert.match(widget, /caloriesConsumed/);
  assert.match(widget, /nextWorkout/);
  assert.match(plugin, /group\.com\.leveluphypertrophy\.app\.widgets/);
  assert.match(plugin, /reloadTimelines\(ofKind: "LevelUpDashboardWidget"\)/);
  assert.match(project, /LevelUpDashboardWidget\.swift in Sources/);
  assert.match(project, /LevelUpDashboardWidgetPlugin\.swift in Sources/);
});

test("the native app shares live dashboard data and explains how to add the widget", async () => {
  const [sync, more, guide, appEntitlements, widgetEntitlements] = await Promise.all([
    read("js/core/home-screen-widgets.js"),
    read("js/more/more-ui-v2.js"),
    read("js/more/home-screen-widgets.js"),
    read("ios/App/App/App.entitlements"),
    read("ios/App/LevelUpTimerWidget/LevelUpTimerWidget.entitlements")
  ]);
  assert.match(sync, /getPlatform\?\.\(\) === "ios"/);
  assert.match(sync, /level_up_appearance_settings/);
  assert.match(sync, /summarizeEntries\(entriesForDate\(localDateKey\(\)\)\)/);
  assert.match(sync, /forge_workout_sessions/);
  assert.match(more, /Home Screen Widgets/);
  assert.match(guide, /Add Widget/);
  assert.match(guide, /Search for <b>Level Up<\/b>/);
  for (const value of [appEntitlements, widgetEntitlements]) assert.match(value, /group\.com\.leveluphypertrophy\.app\.widgets/);
});
