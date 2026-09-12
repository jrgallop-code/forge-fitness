import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");

test("Food Log exposes a clear Eating Out entry point", async () => {
    const foodLog = await read("js/nutrition/food-log.js");
    assert.match(foodLog, /restaurant-menu\.js\?v=eating-out-1/);
    assert.match(foodLog, /data-food-eating-out/);
    assert.match(foodLog, />Eating Out</);
    assert.match(foodLog, /Browse restaurant menus by calories and protein/);
    assert.match(foodLog, /onChooseFood:\s*food\s*=>\s*\{\s*void chooseFood\(food\)/);
});

test("Restaurant Menus searches real food data and supports restaurant discovery", async () => {
    const menu = await read("js/nutrition/restaurant-menu.js");
    assert.match(menu, /Restaurant Menus/);
    assert.match(menu, /Search restaurants/);
    assert.match(menu, /Boston Pizza/);
    assert.match(menu, /Swiss Chalet/);
    assert.match(menu, /Subway/);
    assert.match(menu, /\/v1\/foods\/search\?q=/);
    assert.match(menu, /data-restaurant-menu-search/);
    assert.match(menu, /data-restaurant-quick="fits"/);
    assert.match(menu, /data-restaurant-quick="under700"/);
    assert.match(menu, /data-restaurant-quick="protein40"/);
    assert.match(menu, /data-restaurant-max-calories/);
    assert.match(menu, /data-restaurant-min-protein/);
    assert.match(menu, /Coverage varies/);
    assert.doesNotMatch(menu, /Prototype dataset|mock menu data/i);
});

test("Eating Out inherits the active appearance instead of hard-coding one theme", async () => {
    const styles = await read("css/restaurant-menu.css");
    for (const variable of ["--bg", "--surface", "--surface-raised", "--card", "--text", "--heading", "--muted", "--line", "--accent", "--accent-text", "--accent-soft", "--accent-contrast"]) {
        assert.match(styles, new RegExp(`var\\(${variable.replace("--", "--")}\\)`));
    }
    assert.match(styles, /body\.restaurant-menu-open/);
    assert.match(styles, /env\(safe-area-inset-top\)/);
    assert.match(styles, /env\(safe-area-inset-bottom\)/);
    assert.doesNotMatch(styles, /html\[data-theme=/);
});

test("PWA routing and caching include the restaurant menu source", async () => {
    const router = await read("js/core/router.js");
    const worker = await read("service-worker.js");
    assert.match(router, /food-log\.js\?v=eating-out-1/);
    assert.match(worker, /2026-09-12-299/);
    assert.match(worker, /restaurant-menu\.js\?v=eating-out-1/);
    assert.match(worker, /restaurant-menu\.css\?v=eating-out-1/);
});
