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

test("maze directions respond on touch-down and turn before reaching a wall", () => {
  assert.match(game, /addEventListener\("pointerdown"/);
  assert.match(game, /if \(!isWall\(nextX, nextY\)\) game\.direction = game\.queued/);
});

test("Gym Chopper is a second rest-game option with hold controls and protein fire", () => {
  assert.match(game, /function createChopperState/);
  assert.match(game, /function drawGymChopper/);
  assert.match(game, /function shootChopper/);
  assert.match(game, /data-arcade-game="chopper"/);
  assert.match(game, /COUCH POTATO DOWN!/);
  assert.match(game, /data-chopper-fire/);
  assert.match(game, /function drawFlyingCouchDude/);
  assert.match(game, /function drawActionChopper/);
  assert.match(game, /fillText\("WHEY"/);
});

test("one Play Game button opens an illustrated arcade game selector", () => {
  assert.match(game, /launcher\.textContent = "🎮 Play Game"/);
  assert.match(game, /function openArcadeMenu/);
  assert.match(game, /LEVEL UP<br>ARCADE/);
  assert.match(game, /data-arcade-game="protein"/);
  assert.match(game, /data-arcade-game="chopper"/);
  assert.match(game, /class="rest-arcade-art"/);
  assert.doesNotMatch(game, /protein\.textContent = "💪 Protein Run"/);
  assert.doesNotMatch(game, /chopper\.textContent = "🚁 Gym Chopper"/);
});

test("arcade selector previews are rendered by the real game canvases", () => {
  assert.match(game, /data-arcade-preview="protein"/);
  assert.match(game, /data-arcade-preview="chopper"/);
  assert.match(game, /drawProteinRun\(now, preview\)/);
  assert.match(game, /drawGymChopper\(now, preview\)/);
  assert.doesNotMatch(game, /<svg class="rest-arcade-art"/);
});

test("arcade audio includes music, rotor, shooting, impacts and damage grunt synthesis", () => {
  assert.match(game, /function startMusic\(/);
  assert.match(game, /function startRotor\(/);
  assert.match(game, /playEffect\("shoot"\)/);
  assert.match(game, /playEffect\("impact"\)/);
  assert.match(game, /playEffect\("damage"\)/);
  assert.match(game, /Original synthesized action-hero grunt/);
  assert.match(game, /data-arcade-sound/);
});
