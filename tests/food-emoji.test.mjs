import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getFoodEmoji } from "../js/nutrition/food-emoji.js";

test("food emojis classify common foods using names and provider categories", () => {
    assert.equal(getFoodEmoji({ name: "Carrots Baby Raw" }), "🥕");
    assert.equal(getFoodEmoji({ name: "Baby Lima Beans Frozen" }), "🫘");
    assert.equal(getFoodEmoji({ name: "Apple Carrot Juice, For Baby" }), "🥕");
    assert.equal(getFoodEmoji({ name: "Vanilla ice cream" }), "🍨");
    assert.equal(getFoodEmoji({ name: "Unspecified item", foodCategory: "Poultry Products" }), "🍗");
    assert.equal(getFoodEmoji({ name: "Atlantic salmon" }), "🐟");
    assert.equal(getFoodEmoji({ name: "Mystery product" }), "🍽️");
});

test("food result emojis are local presentation and do not alter provider requests", () => {
    const foodLog = readFileSync(new URL("../js/nutrition/food-log.js", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../css/food-log.css", import.meta.url), "utf8");
    const emojiSource = readFileSync(new URL("../js/nutrition/food-emoji.js", import.meta.url), "utf8");

    assert.match(foodLog, /getFoodEmoji\(food\)/);
    assert.match(foodLog, /class="food-result-emoji" aria-hidden="true"/);
    assert.match(styles, /grid-template-columns:42px minmax\(0,1fr\) auto/);
    assert.doesNotMatch(emojiSource, /fetch\s*\(/);
});
