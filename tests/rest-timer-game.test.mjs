import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const game = readFileSync(new URL("../js/workouts/rest-timer-game.js", import.meta.url), "utf8");
const timerDisplay = readFileSync(new URL("../js/workouts/rest-timer-display-fix.js", import.meta.url), "utf8");
const more = readFileSync(new URL("../js/more/more-ui-v2.js", import.meta.url), "utf8");

test("Protein Run is loaded with the rest timer and gated to native iOS", () => {
  assert.match(timerDisplay, /rest-timer-game\.js\?v=protein-run-1/);
  assert.match(game, /if \(isNativeIOS\(\)\) initialize\(\)/);
});

test("Protein Run reads but never writes the rest timer state", () => {
  assert.match(game, /const ACTIVE_KEY = "level_up_active_workout"/);
  assert.doesNotMatch(game, /localStorage\.setItem\(ACTIVE_KEY/);
  assert.match(game, /Closing the game never stops your rest timer/);
});

test("Protein Run remains optional from More settings", () => {
  assert.match(more, /isNativeIOS\(\).*data-more-page="rest-game"/);
  assert.match(more, /renderRestTimerGameSettings/);
  assert.match(game, /level_up_rest_timer_game_enabled/);
});

test("protein grows the lifter and unlocks a flashing ghost crush mode", () => {
  assert.match(game, /function drawLifter/);
  assert.match(game, /PROTEIN_PER_GROWTH_STAGE/);
  assert.match(game, /MAX_GROWTH_STAGE/);
  assert.match(game, /CRUSH MODE!/);
  assert.match(game, /function drawGhost/);
  assert.match(game, /Math\.floor\(now \/ 150\) % 2/);
  assert.match(game, /BICEP CRUSH!/);
  assert.match(game, /fillText\(large \? "PRO" : "P"/);
});
