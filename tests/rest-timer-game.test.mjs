import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const game = readFileSync(new URL("../js/workouts/rest-timer-game.js", import.meta.url), "utf8");
const timerDisplay = readFileSync(new URL("../js/workouts/rest-timer-display-fix.js", import.meta.url), "utf8");
const more = readFileSync(new URL("../js/more/more-ui-v2.js", import.meta.url), "utf8");

test("Level Up Arcade is loaded with the PWA rest timer", () => {
  assert.match(timerDisplay, /rest-timer-game\.js\?v=level-up-arcade-pwa-1/);
  assert.match(game, /initialize\(\);/);
  assert.doesNotMatch(game, /if \(isNativeIOS\(\)\) initialize\(\)/);
});

test("the bottom navigation is hidden only while the rest arcade is open", () => {
  assert.match(game, /body\.level-up-rest-game-open \.bottom-nav \{ display: none !important; \}/);
  assert.match(game, /document\.body\.classList\.add\("level-up-rest-game-open"\)/);
  assert.match(game, /document\.body\.classList\.remove\("level-up-rest-game-open"\)/);
});

test("Protein Run reads but never writes the rest timer state", () => {
  assert.match(game, /const ACTIVE_KEY = "level_up_active_workout"/);
  assert.doesNotMatch(game, /localStorage\.setItem\(ACTIVE_KEY/);
  assert.match(game, /Closing the game never stops your rest timer/);
});

test("Protein Run remains optional from More settings", () => {
  assert.match(more, /data-more-page="rest-game"/);
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

test("arcade audio includes music and bundled CC0 gameplay samples", () => {
  assert.match(game, /function startMusic\(/);
  assert.match(game, /function startRotor\(/);
  assert.match(game, /const SAMPLE_FILES =/);
  assert.match(game, /helicopter-rotor\.wav/);
  assert.match(game, /playEffect\("shoot"\)/);
  assert.match(game, /playEffect\("impact"\)/);
  assert.match(game, /"game-over" : "damage"/);
  assert.match(game, /playSample\("damageImpact"/);
  assert.match(game, /data-arcade-sound/);
  assert.match(game, /data-arcade-test-sound/);
  assert.match(game, /function testArcadeSound\(button\)/);
  assert.match(game, /PLAYING HIT \+ GRUNT/);
  assert.match(game, /LevelUpArcadeAudio/);
  assert.match(game, /native\.play\(\{ name: soundName, volume, playbackRate, loop \}\)/);
});

test("Gym Chopper still launches when iOS cannot decode the rotor clip", () => {
  assert.match(game, /let rotorRetryPending = false/);
  assert.match(game, /game must remain playable even without rotor audio/);
  assert.match(game, /rotorSource = playSample\("rotor", \{ volume: \.32, loop: true \}\)/);
  assert.doesNotMatch(game, /preloadArcadeSamples\(\)\.then\(\(\) => \{[\s\S]{0,220}startRotor\(\)/);
});

test("arcade music stays synthesized while damage rotates non-repeating recorded grunts", () => {
  assert.match(game, /const bpm = 178/);
  assert.match(game, /rapid repeated notes, pulsing bass and sharp arcade percussion/);
  assert.match(game, /function playComicalGrunt\(/);
  assert.match(game, /const DAMAGE_GRUNTS =/);
  assert.match(game, /if \(nextIndex === lastGruntIndex\)/);
  assert.match(game, /game-over-scream\.wav/);
  assert.doesNotMatch(game, /SpeechSynthesisUtterance/);
  assert.doesNotMatch(game, /My gains/);
});

test("Gym Chopper rotates all four detailed couch-potato sprites", () => {
  assert.match(game, /couch-potato-a\.png/);
  assert.match(game, /couch-potato-b\.png/);
  assert.match(game, /couch-potato-c\.png/);
  assert.match(game, /couch-potato-d\.png/);
  assert.match(game, /variant: Math\.floor\(Math\.random\(\) \* COUCH_POTATO_SPRITE_URLS\.length\)/);
  assert.match(game, /ctx\.drawImage\(sprite/);
  assert.match(game, /ctx\.imageSmoothingEnabled = false/);
  assert.match(game, /const size = Math\.max\(36, w \* \.115\)/);
});

test("Gym Chopper uses the approved olive helicopter and muscular door gunner sprite", () => {
  assert.match(game, /assets\/games\/gym-chopper\/helicopter-a\.png/);
  assert.match(game, /function ensureActionChopperSprite/);
  assert.match(game, /const width = unit \* 20\.5/);
  assert.match(game, /ctx\.drawImage\(sprite, px - width \/ 2/);
});
