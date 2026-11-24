import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = path => readFileSync(path, "utf8");
const quick = read("js/core/ios-quick-log.js");
const quickCss = read("css/ios-quick-log.css");
const food = read("js/nutrition/food-log.js");
const maintenance = read("js/nutrition/maintenance-check-in.js");
const status = read("js/nutrition/weekly-check-in-status.js");
const calendar = read("js/nutrition/check-in-calendar.js");

test("nutrition icon and label stack within the five-tab glass navigation", () => {
    assert.match(quickCss, /\.bottom-nav\.ios-quick-log-nav-enabled > \.nav-btn\s*\{[\s\S]*?flex-direction:column!important/);
    assert.match(quickCss, /\.bottom-nav\.ios-quick-log-nav-enabled > \.nav-btn > span:not\(\.ios-tab-glass\)/);
    assert.match(quick, /nav\.insertBefore\(nutrition, progress\)/);
    assert.match(quick, /document\.body\.append\(button\)/);
});

test("Quick Log food entry retains visible glass bar and cleans up on exit", () => {
    assert.match(quick, /data-ql-action="food"/);
    assert.match(quick, /<strong>Log Food<\/strong>/);
    assert.match(quick, /document\.body\.classList\.add\("ios-quick-food-entry"\)/);
    assert.match(quick, /querySelector\("\[data-food-add\]"\)/);
    assert.match(food, /classList\.remove\("food-sheet-open", "ios-quick-food-entry"\)/);
    assert.match(quickCss, /body\.ios-quick-food-entry\.food-sheet-open \.bottom-nav\.ios-quick-log-nav-enabled/);
    assert.match(food, /data-barcode-open/);
});

test("weekly review dates cannot move backward from a Monday to an earlier Wednesday", () => {
    const begin = maintenance.indexOf("function wednesdayOnOrAfter(key) {");
    const end = maintenance.indexOf("function parseDate(value) {", begin);
    assert.ok(begin >= 0 && end > begin);
    const fn = maintenance.slice(begin, end);
    const localDateKey = date => [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
    const ctx = { localDateKey };
    const dates = vm.runInNewContext(fn + `({
        monday: wednesdayOnOrAfter("2026-11-23"),
        wednesday: wednesdayOnOrAfter("2026-11-25"),
        thursday: wednesdayOnOrAfter("2026-11-26")
    })`, ctx);
    assert.equal(dates.monday, "2026-11-25");
    assert.equal(dates.wednesday, "2026-11-25");
    assert.equal(dates.thursday, "2026-12-02");
    assert.match(maintenance, /now\.getDay\(\) === 3/);
    assert.match(status, /calendarReviewDue = new Date/);
    assert.match(calendar, /anchorWednesday \? wednesdayOnOrAfter/);
});
