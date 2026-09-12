import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("restaurant macro menu prototype stays isolated from the released app", async () => {
  const [prototypeHtml, appHtml, router, worker] = await Promise.all([
    read("preview/restaurant-macro-menu/index.html"),
    read("index.html"),
    read("js/core/router.js"),
    read("service-worker.js")
  ]);

  assert.match(prototypeHtml, /noindex,nofollow,noarchive/);
  assert.match(prototypeHtml, /Separate from the live app/i);
  assert.match(prototypeHtml, /Mock menu data/);
  assert.doesNotMatch(appHtml, /restaurant-macro-menu/);
  assert.doesNotMatch(router, /restaurant-macro-menu/);
  assert.doesNotMatch(worker, /restaurant-macro-menu/);
});

test("prototype supports restaurant choice, search, nutrition filters and sorting", async () => {
  const [prototypeHtml, preview] = await Promise.all([
    read("preview/restaurant-macro-menu/index.html"),
    read("preview/restaurant-macro-menu/preview.js")
  ]);

  assert.match(prototypeHtml, /data-open-sheet="restaurants"/);
  assert.match(prototypeHtml, /id="menu-search"/);
  assert.match(prototypeHtml, /data-quick-filter="fits"/);
  assert.match(prototypeHtml, /data-quick-filter="under700"/);
  assert.match(prototypeHtml, /data-quick-filter="protein40"/);
  assert.match(preview, /Best protein per calorie/);
  assert.match(preview, /currentRestaurant\(\)\.items\.filter/);
  assert.match(preview, /protein \/ b\.calories/);
});

test("prototype keeps details and logging in a progressive-disclosure sheet", async () => {
  const preview = await read("preview/restaurant-macro-menu/preview.js");

  assert.match(preview, /function itemSheet\(\)/);
  assert.match(preview, /PROTEIN/);
  assert.match(preview, /CARBS/);
  assert.match(preview, /FAT/);
  assert.match(preview, /data-meal=/);
  assert.match(preview, /data-log-item=/);
  assert.match(preview, /added to/);
  assert.match(preview, /state\.logged\.push/);
  assert.match(preview, /remaining\.calories - loggedTotals\.calories/);
});

test("prototype makes the nutrition and licensing boundaries explicit", async () => {
  const [prototypeHtml, preview] = await Promise.all([
    read("preview/restaurant-macro-menu/index.html"),
    read("preview/restaurant-macro-menu/preview.js")
  ]);

  assert.match(prototypeHtml, /not current Boston Pizza nutrition/i);
  assert.match(preview, /approved API, licensed dataset, or restaurant-provided nutrition/);
  assert.match(preview, /no restaurant logos or photography/);
  assert.doesNotMatch(prototypeHtml + preview, /<img\b/i);
  assert.doesNotMatch(preview, /fetch\s*\(/);
});

test("replica uses the Level Up shell and a recognizable restaurant menu hierarchy", async () => {
  const [prototypeHtml, replicaStyles] = await Promise.all([
    read("preview/restaurant-macro-menu/index.html"),
    read("preview/restaurant-macro-menu/replica.css")
  ]);

  assert.match(prototypeHtml, /class="bottom-nav"/);
  assert.match(prototypeHtml, /class="nav-btn active"/);
  assert.match(prototypeHtml, /Restaurant Menu/);
  assert.match(prototypeHtml, /See what fits before you order/);
  assert.match(prototypeHtml, /id="category-nav"/);
  assert.match(prototypeHtml, /id="log-tray"/);
  assert.match(replicaStyles, /\.restaurant-hero-card/);
  assert.match(replicaStyles, /\.item-visual--pizza/);
  assert.match(replicaStyles, /\.category-nav/);
});
