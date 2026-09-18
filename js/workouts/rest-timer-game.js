import { isNativeIOS } from "../core/home-screen-widgets.js?v=home-widget-live-3";

const ACTIVE_KEY = "level_up_active_workout";
const ENABLED_KEY = "level_up_rest_timer_game_enabled";
const HIGH_SCORE_KEY = "level_up_protein_run_high_score";
const CHOPPER_HIGH_SCORE_KEY = "level_up_gym_chopper_high_score";
const SOUND_KEY = "level_up_rest_arcade_sound";
const OVERLAY_ID = "level-up-protein-run";
const STYLE_ID = "level-up-protein-run-style";
const PROTEIN_PER_GROWTH_STAGE = 6;
const MAX_GROWTH_STAGE = 3;
const CRUSH_MODE_MS = 7000;

const MAZE = [
  "#################",
  "#.......#.......#",
  "#.###.#.#.#.###.#",
  "#P#...#...#...#P#",
  "#.#.###.#.###.#.#",
  "#...............#",
  "###.#.#####.#.###",
  "#...#...#...#...#",
  "#.#.###.#.###.#.#",
  "#.#.....S.....#.#",
  "#.#.###.#.###.#.#",
  "#...#...#...#...#",
  "###.#.#####.#.###",
  "#...............#",
  "#.#.###.#.###.#.#",
  "#P#...#...#...#P#",
  "#.###.#.#.#.###.#",
  "#.......#.......#",
  "#################"
];

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

let game = null;
let frameId = null;
let touchStart = null;
let audioContext = null;
let audioMaster = null;
let musicTimer = null;
let musicStep = 0;
let rotorTimer = null;
let lastGruntAt = 0;

export function isRestTimerGameEnabled() {
  return localStorage.getItem(ENABLED_KEY) !== "false";
}

export function setRestTimerGameEnabled(enabled) {
  localStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");
  document.dispatchEvent(new CustomEvent("levelup:rest-game-setting-changed"));
  if (!enabled) closeGame();
  return enabled;
}

function readActive() {
  try {
    const active = JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null");
    return active?.status === "in_progress" ? active : null;
  } catch {
    return null;
  }
}

function remainingMs(timer) {
  if (!timer) return 0;
  if (timer.status === "running" && timer.endAt) {
    return Math.max(0, new Date(timer.endAt).getTime() - Date.now());
  }
  return Math.max(0, Number(timer.remainingMs) || 0);
}

function formatTime(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function soundEnabled() {
  return localStorage.getItem(SOUND_KEY) !== "false";
}

function ensureAudio() {
  if (!soundEnabled()) return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioContext) {
    audioContext = new AudioContext();
    audioMaster = audioContext.createGain();
    audioMaster.gain.value = .16;
    audioMaster.connect(audioContext.destination);
  }
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

function tone(frequency, duration = .08, { type = "square", volume = .14, endFrequency = null, delay = 0 } = {}) {
  const context = ensureAudio();
  if (!context || !audioMaster) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .008);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(gain).connect(audioMaster);
  oscillator.start(start);
  oscillator.stop(start + duration + .02);
}

function noise(duration = .08, volume = .1) {
  const context = ensureAudio();
  if (!context || !audioMaster) return;
  const length = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration);
  source.connect(gain).connect(audioMaster);
  source.start();
}

function playComicalGrunt() {
  const now = performance.now();
  if (now - lastGruntAt < 550) return;
  lastGruntAt = now;

  // Add a formant-like low growl under the spoken reaction so it lands over
  // music and rotor noise. The device voice remains generic and unselected.
  tone(142, .34, { type: "sawtooth", volume: .2, endFrequency: 62 });
  tone(96, .38, { type: "triangle", volume: .15, endFrequency: 43, delay: .025 });
  noise(.15, .085);
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
  const reactions = ["OOF!", "UGH!", "MY GAINS!"];
  const utterance = new SpeechSynthesisUtterance(reactions[Math.floor(Math.random() * reactions.length)]);
  utterance.rate = .82;
  utterance.pitch = .55;
  utterance.volume = .72;
  window.speechSynthesis.speak(utterance);
}

function playEffect(name) {
  if (!soundEnabled()) return;
  if (name === "pickup") tone(660, .045, { volume: .08, endFrequency: 880 });
  if (name === "power") [440, 660, 880].forEach((note, index) => tone(note, .11, { volume: .1, delay: index * .055 }));
  if (name === "shoot") { noise(.045, .12); tone(150, .07, { type: "sawtooth", volume: .09, endFrequency: 70 }); }
  if (name === "impact") { noise(.1, .15); tone(90, .14, { type: "square", volume: .12, endFrequency: 42 }); }
  if (name === "crush") { noise(.13, .16); tone(75, .18, { type: "sawtooth", volume: .14, endFrequency: 38 }); }
  if (name === "damage") {
    // Original comic action-hero reaction; no sampled or imitated celebrity voice.
    playComicalGrunt();
  }
  if (name === "rest-over") [784, 659, 523].forEach((note, index) => tone(note, .18, { volume: .12, delay: index * .12 }));
}

function startMusic() {
  if (!soundEnabled() || musicTimer) return;
  ensureAudio();
  // Original 178 BPM minor-key action riff, shaped after the reference's
  // rapid repeated notes, pulsing bass and sharp arcade percussion.
  const bpm = 178;
  const sixteenthMs = 60000 / bpm / 4;
  const melody = [
    392, null, 466, 523, 587, null, 523, 466,
    392, 349, 392, 466, 587, 698, 587, 523,
    392, null, 466, 523, 622, null, 587, 523,
    466, 392, 349, 392, 466, 523, 466, 349
  ];
  const bass = [98, 98, 87, 87, 78, 78, 87, 73];
  const tick = () => {
    const step = musicStep++;
    const lead = melody[step % melody.length];
    if (lead) tone(lead, .07, { type: "square", volume: .055, endFrequency: lead * .985 });
    if (step % 4 === 0) {
      tone(bass[Math.floor(step / 4) % bass.length], .16, { type: "sawtooth", volume: .065, endFrequency: 48 });
      tone(64, .08, { type: "triangle", volume: .08, endFrequency: 34 });
    }
    if (step % 4 === 2) noise(.055, .05);
    else if (step % 2 === 1) noise(.018, .018);
  };
  tick();
  musicTimer = window.setInterval(tick, sixteenthMs);
}

function stopMusic() {
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = null;
}

function startRotor() {
  if (!soundEnabled() || rotorTimer) return;
  const thump = () => {
    tone(48, .09, { type: "triangle", volume: .06, endFrequency: 38 });
    noise(.025, .018);
  };
  thump();
  rotorTimer = window.setInterval(thump, 115);
}

function stopRotor() {
  if (rotorTimer) window.clearInterval(rotorTimer);
  rotorTimer = null;
}

function updateSoundButtons() {
  document.querySelectorAll("[data-arcade-sound]").forEach(button => {
    button.textContent = soundEnabled() ? "🔊" : "🔇";
    button.setAttribute("aria-label", soundEnabled() ? "Mute arcade sound" : "Turn on arcade sound");
  });
}

function toggleArcadeSound() {
  const enabled = !soundEnabled();
  localStorage.setItem(SOUND_KEY, enabled ? "true" : "false");
  updateSoundButtons();
  if (enabled) {
    startMusic();
    if (game?.mode === "chopper") startRotor();
  } else {
    stopMusic();
    stopRotor();
  }
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .rest-game-launch { grid-column: 1 / -1; min-height: 38px; border-color: color-mix(in srgb, var(--accent, #2d8cff) 70%, white 18%) !important; background: color-mix(in srgb, var(--accent, #2d8cff) 28%, #07111f) !important; color: #fff !important; font-size: 11px !important; font-weight: 900 !important; letter-spacing: .05em; }
    #${OVERLAY_ID} { position: fixed; inset: 0; z-index: 20000; display: grid; align-items: end; background: rgba(1, 5, 12, .76); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
    #${OVERLAY_ID}[hidden] { display: none !important; }
    .protein-run-shell { width: 100%; max-height: 94svh; overflow: auto; border-radius: 24px 24px 0 0; padding: 14px 14px calc(16px + env(safe-area-inset-bottom)); background: #050912; border: 2px solid var(--protein-run-accent, #2d8cff); box-shadow: 0 -22px 65px rgba(0,0,0,.58); color: #f7fbff; font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; image-rendering: pixelated; }
    .rest-arcade-select { position: relative; min-height: min(650px, 82svh); overflow: hidden; padding: 8px 2px 18px; }
    .rest-arcade-select::before { content: ""; pointer-events: none; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,.035) 3px 4px); }
    .rest-arcade-marquee { position: relative; margin: 0 48px 9px; border: 3px solid #fff36b; padding: 12px 8px 9px; background: #25104a; box-shadow: 0 0 0 4px #ff4fa3, 6px 6px 0 #000; text-align: center; }
    .rest-arcade-marquee strong { display: block; color: #fff36b; font-size: clamp(25px, 8vw, 38px); line-height: .95; letter-spacing: -.07em; text-shadow: 3px 3px 0 #ff326d; }
    .rest-arcade-marquee span { display: block; margin-top: 7px; color: #d7e5f6; font-size: 10px; letter-spacing: .18em; }
    .rest-arcade-close { position: absolute; z-index: 2; top: 7px; right: 2px; min-width: 42px; min-height: 42px; border: 2px solid #6f86a1; border-radius: 7px; background: #172234; color: #fff; font-size: 22px; }
    .rest-arcade-sound { min-width: 42px; min-height: 42px; border: 2px solid #6f86a1; border-radius: 7px; background: #172234; color: #fff; font-size: 18px; }
    .rest-arcade-select > .rest-arcade-sound { position: absolute; z-index: 2; top: 7px; left: 2px; }
    .rest-arcade-clock { position: relative; width: max-content; margin: 14px auto 16px; border: 2px solid var(--protein-run-accent, #2d8cff); padding: 6px 14px; color: #fff; background: #07111f; box-shadow: 3px 3px 0 var(--protein-run-shadow, #16365b); font-size: 18px; font-weight: 900; }
    .rest-arcade-grid { position: relative; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
    .rest-arcade-card { min-width: 0; overflow: hidden; border: 3px solid #586f8f; border-radius: 8px; padding: 0 0 12px; background: #0d1728; color: #fff; box-shadow: 5px 5px 0 #000; text-align: left; touch-action: manipulation; }
    .rest-arcade-card:active { transform: translate(3px,3px); box-shadow: 2px 2px 0 #000; }
    .rest-arcade-card:first-child { border-color: #39d5ff; }
    .rest-arcade-card:last-child { border-color: #ff6b49; }
    .rest-arcade-art { display: block; width: 100%; aspect-ratio: 4 / 3; border-bottom: 3px solid currentColor; background: #02040a; image-rendering: pixelated; }
    canvas.rest-arcade-art[data-arcade-preview="protein"] { aspect-ratio: 17 / 19; }
    canvas.rest-arcade-art[data-arcade-preview="chopper"] { aspect-ratio: 4 / 5; }
    .rest-arcade-card-copy { display: block; padding: 10px 10px 0; }
    .rest-arcade-card-title { display: block; min-height: 38px; color: #fff; font-size: clamp(15px, 4.6vw, 21px); font-weight: 900; line-height: 1; text-transform: uppercase; }
    .rest-arcade-card-desc { display: block; min-height: 43px; margin-top: 7px; color: #aebfd3; font-size: 10px; line-height: 1.35; }
    .rest-arcade-card-play { display: block; margin-top: 9px; border: 2px solid #fff; padding: 7px 4px; background: var(--protein-run-accent, #2d8cff); color: #06101d; font-size: 11px; font-weight: 900; text-align: center; box-shadow: 2px 2px 0 #000; }
    .rest-arcade-insert { position: relative; margin: 18px 0 0; color: #fff36b; font-size: 11px; text-align: center; letter-spacing: .12em; animation: rest-arcade-blink 1s steps(2,end) infinite; }
    @keyframes rest-arcade-blink { 50% { opacity: .35; } }
    @media (max-width: 350px) { .rest-arcade-grid { grid-template-columns: 1fr; } .rest-arcade-card { display: grid; grid-template-columns: 42% 58%; padding: 0; } .rest-arcade-art { aspect-ratio: 1; border: 0; border-right: 3px solid currentColor; } .rest-arcade-card-copy { padding-bottom: 9px; } }
    .protein-run-header { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: start; margin-bottom: 10px; }
    .protein-run-kicker { display: block; color: var(--protein-run-accent, #2d8cff); font-size: 11px; font-weight: 900; letter-spacing: .14em; }
    .protein-run-header h2 { margin: 3px 0 0; font: 900 24px/1 ui-monospace, "SFMono-Regular", Menlo, monospace; letter-spacing: -.05em; text-transform: uppercase; }
    .protein-run-clock { min-width: 74px; border: 2px solid var(--protein-run-accent, #2d8cff); padding: 7px 8px; text-align: center; color: #fff; font-size: 18px; font-weight: 900; box-shadow: 3px 3px 0 var(--protein-run-shadow, #16365b); }
    .protein-run-close { min-width: 44px; min-height: 44px; border: 0; border-radius: 8px; background: #172234; color: white; font-size: 21px; }
    .protein-run-scorebar { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 8px; color: #c5d8ef; font-size: 12px; font-weight: 800; }
    .protein-run-stage { position: relative; width: min(100%, 420px); margin: 0 auto; border: 3px solid var(--protein-run-accent, #2d8cff); background: #02040a; box-shadow: 5px 5px 0 var(--protein-run-shadow, #16365b); }
    .protein-run-stage canvas { display: block; width: 100%; aspect-ratio: 17 / 19; touch-action: none; image-rendering: pixelated; }
    .protein-run-finish { position: absolute; inset: 0; display: none; place-items: center; padding: 22px; background: rgba(2,4,10,.88); text-align: center; }
    .protein-run-finish.is-visible { display: grid; }
    .protein-run-finish strong { display: block; color: #72e89a; font-size: 27px; line-height: 1.05; text-transform: uppercase; text-shadow: 3px 3px 0 #174326; }
    .protein-run-finish span { display: block; margin-top: 9px; color: #d7e5f6; font-size: 13px; }
    .protein-run-controls { display: grid; grid-template-columns: repeat(3, 56px); grid-template-rows: repeat(2, 48px); justify-content: center; gap: 7px; margin-top: 14px; }
    .protein-run-controls button { min-width: 0; min-height: 0; border: 2px solid #6f86a1; border-radius: 5px; background: #142033; color: white; font: 900 22px/1 ui-monospace, monospace; box-shadow: 3px 3px 0 #000; touch-action: manipulation; }
    .protein-run-controls button:active { transform: translate(2px,2px); box-shadow: 1px 1px 0 #000; }
    .protein-run-controls [data-game-direction="up"] { grid-column: 2; grid-row: 1; }
    .protein-run-controls [data-game-direction="left"] { grid-column: 1; grid-row: 2; }
    .protein-run-controls [data-game-direction="down"] { grid-column: 2; grid-row: 2; }
    .protein-run-controls [data-game-direction="right"] { grid-column: 3; grid-row: 2; }
    .protein-run-controls .gym-chopper-fire { display: none; grid-column: 3; grid-row: 1; background: #a52525; border-color: #ff7474; font-size: 13px; }
    #${OVERLAY_ID}[data-game-mode="chopper"] .protein-run-controls .gym-chopper-fire { display: block; }
    #${OVERLAY_ID}[data-game-mode="chopper"] .protein-run-stage canvas { aspect-ratio: 4 / 5; }
    .protein-run-help { margin: 11px 0 0; text-align: center; color: #8fa6c0; font-size: 11px; line-height: 1.35; }
    html[data-theme="pulse"] #${OVERLAY_ID} { --protein-run-accent: #ff4fa3; --protein-run-shadow: #6d1641; }
    html[data-theme="arctic"] #${OVERLAY_ID}, html[data-theme="pure"] #${OVERLAY_ID}, html[data-theme="ocean"] #${OVERLAY_ID} { --protein-run-accent: #3296ff; --protein-run-shadow: #174a79; }
    html[data-theme="level-up"] #${OVERLAY_ID}, html[data-theme="midnight"] #${OVERLAY_ID}, html[data-theme="slate"] #${OVERLAY_ID} { --protein-run-accent: #76f36f; --protein-run-shadow: #21551e; }
  `;
  document.head.appendChild(style);
}

function isWall(x, y) {
  return y < 0 || y >= MAZE.length || x < 0 || x >= MAZE[0].length || MAZE[y][x] === "#";
}

function openCells() {
  const cells = [];
  MAZE.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell !== "#") cells.push({ x, y });
  }));
  return cells;
}

function createGameState(canvas) {
  const pellets = new Set();
  const powers = new Set();
  MAZE.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === ".") pellets.add(`${x},${y}`);
    if (cell === "P") powers.add(`${x},${y}`);
  }));
  return {
    mode: "protein",
    canvas,
    ctx: canvas.getContext("2d", { alpha: false }),
    player: { x: 8, y: 9 },
    direction: DIRECTIONS.left,
    queued: DIRECTIONS.left,
    pellets,
    powers,
    enemies: [
      { x: 7, y: 9, direction: DIRECTIONS.up, color: "#ff5964" },
      { x: 9, y: 9, direction: DIRECTIONS.down, color: "#39d5ff" }
    ],
    score: 0,
    lives: 3,
    proteinCollected: 0,
    poweredUntil: 0,
    message: "",
    messageUntil: 0,
    lastPlayerMove: 0,
    lastEnemyMove: 0,
    timerId: readActive()?.restTimer?.timerId || "",
    finished: false,
    finishedSoundPlayed: false
  };
}

function createChopperState(canvas) {
  return {
    mode: "chopper",
    canvas,
    ctx: canvas.getContext("2d", { alpha: false }),
    player: { x: .2, y: .5 },
    motion: { x: 0, y: 0 },
    bullets: [],
    enemies: [],
    score: 0,
    lives: 3,
    lastFrame: 0,
    lastSpawn: 0,
    rotorAngle: 0,
    timerId: readActive()?.restTimer?.timerId || "",
    finished: false,
    finishedSoundPlayed: false,
    message: "FIRE THE GAINS!",
    messageUntil: performance.now() + 1200
  };
}

function resetBoard(state) {
  const next = createGameState(state.canvas);
  next.score = state.score;
  next.lives = state.lives;
  next.proteinCollected = state.proteinCollected;
  next.poweredUntil = state.poweredUntil;
  next.timerId = state.timerId;
  return next;
}

function chooseEnemyDirection(enemy) {
  const options = Object.values(DIRECTIONS).filter(direction => !isWall(enemy.x + direction.x, enemy.y + direction.y));
  if (!options.length) return enemy.direction;
  const reverse = { x: -enemy.direction.x, y: -enemy.direction.y };
  const forwardOptions = options.filter(direction => direction.x !== reverse.x || direction.y !== reverse.y);
  const pool = forwardOptions.length ? forwardOptions : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

function setDirection(name) {
  if (!game || !DIRECTIONS[name]) return;
  if (game.mode === "chopper") {
    game.motion = { ...DIRECTIONS[name] };
    return;
  }
  game.queued = DIRECTIONS[name];
  const nextX = game.player.x + game.queued.x;
  const nextY = game.player.y + game.queued.y;
  if (!isWall(nextX, nextY)) game.direction = game.queued;
}

function stopChopperDirection(name) {
  if (!game || game.mode !== "chopper" || !DIRECTIONS[name]) return;
  const direction = DIRECTIONS[name];
  if (game.motion.x === direction.x && game.motion.y === direction.y) game.motion = { x: 0, y: 0 };
}

function growthStage(state = game) {
  return Math.min(MAX_GROWTH_STAGE, Math.floor((state?.proteinCollected || 0) / PROTEIN_PER_GROWTH_STAGE));
}

function isCrushMode(now, state = game) {
  return Boolean(state && growthStage(state) >= MAX_GROWTH_STAGE && now < state.poweredUntil);
}

function collectProtein(amount, now) {
  if (!game) return;
  const previousStage = growthStage(game);
  game.proteinCollected += amount;
  const nextStage = growthStage(game);
  if (nextStage > previousStage) {
    playEffect("power");
    game.message = nextStage >= MAX_GROWTH_STAGE ? "MAX FLEX!" : "BIGGER!";
    game.messageUntil = now + 900;
  }
  if (nextStage >= MAX_GROWTH_STAGE && now >= game.poweredUntil) {
    game.poweredUntil = now + CRUSH_MODE_MS;
    game.message = "CRUSH MODE!";
    game.messageUntil = now + 1300;
  }
}

function movePlayer(now) {
  if (!game || now - game.lastPlayerMove < 92) return;
  game.lastPlayerMove = now;
  const queuedX = game.player.x + game.queued.x;
  const queuedY = game.player.y + game.queued.y;
  if (!isWall(queuedX, queuedY)) game.direction = game.queued;
  const nextX = game.player.x + game.direction.x;
  const nextY = game.player.y + game.direction.y;
  if (!isWall(nextX, nextY)) {
    game.player.x = nextX;
    game.player.y = nextY;
  }
  const key = `${game.player.x},${game.player.y}`;
  if (game.pellets.delete(key)) {
    game.score += 10;
    playEffect("pickup");
    collectProtein(1, now);
  }
  if (game.powers.delete(key)) {
    game.score += 75;
    playEffect("power");
    collectProtein(4, now);
  }
  if (!game.pellets.size && !game.powers.size) game = resetBoard(game);
}

function moveEnemies(now) {
  if (!game || now - game.lastEnemyMove < 185) return;
  game.lastEnemyMove = now;
  game.enemies.forEach(enemy => {
    if (isWall(enemy.x + enemy.direction.x, enemy.y + enemy.direction.y) || Math.random() < .22) {
      enemy.direction = chooseEnemyDirection(enemy);
    }
    if (!isWall(enemy.x + enemy.direction.x, enemy.y + enemy.direction.y)) {
      enemy.x += enemy.direction.x;
      enemy.y += enemy.direction.y;
    }
  });
}

function resolveCollisions(now) {
  if (!game) return;
  const hit = game.enemies.find(enemy => enemy.x === game.player.x && enemy.y === game.player.y);
  if (!hit) return;
  if (isCrushMode(now)) {
    playEffect("crush");
    game.score += 250;
    game.message = "BICEP CRUSH!";
    game.messageUntil = now + 850;
    hit.x = 8;
    hit.y = 9;
    hit.direction = DIRECTIONS.up;
  } else {
    playEffect("damage");
    game.lives = Math.max(0, game.lives - 1);
    game.player = { x: 8, y: 9 };
    game.enemies[0].x = 7;
    game.enemies[0].y = 9;
    game.enemies[1].x = 9;
    game.enemies[1].y = 9;
    if (!game.lives) game.lives = 3;
  }
}

function drawLifter(ctx, cellX, cellY, cellW, cellH, stage, powered) {
  const scale = .7 + stage * .16;
  const unit = Math.max(1.3, Math.min(cellW, cellH) * .115 * scale);
  const cx = cellX * cellW + cellW / 2;
  const cy = cellY * cellH + cellH / 2;
  const x = cx - unit * 4;
  const y = cy - unit * 4.8;
  const skin = powered ? "#fff36b" : stage >= 2 ? "#f59f34" : "#f4b45f";
  const suit = powered ? "#ffffff" : "#1678e5";

  if (powered) {
    ctx.fillStyle = Math.floor(performance.now() / 110) % 2 ? "#fff" : "#ffe74f";
    ctx.fillRect(x - unit, y - unit, unit * 10, unit * 11);
    ctx.fillStyle = "#02040a";
    ctx.fillRect(x, y, unit * 8, unit * 9);
  }

  // Head and hair.
  ctx.fillStyle = "#3b2418";
  ctx.fillRect(x + unit * 3, y, unit * 3, unit);
  ctx.fillStyle = skin;
  ctx.fillRect(x + unit * 3, y + unit, unit * 3, unit * 2);
  // Flexed arms and oversized biceps.
  ctx.fillRect(x + unit, y + unit * 2, unit * 2, unit * 2);
  ctx.fillRect(x, y + unit, unit * 2, unit * 2);
  ctx.fillRect(x + unit * 6, y + unit * 2, unit * 2, unit * 2);
  ctx.fillRect(x + unit * 7, y + unit, unit * 2, unit * 2);
  ctx.fillRect(x + unit, y + unit * 4, unit * 2, unit);
  ctx.fillRect(x + unit * 6, y + unit * 4, unit * 2, unit);
  // Torso and lifting belt.
  ctx.fillStyle = suit;
  ctx.fillRect(x + unit * 2, y + unit * 3, unit * 5, unit * 4);
  ctx.fillStyle = "#101722";
  ctx.fillRect(x + unit * 2, y + unit * 6, unit * 5, unit);
  ctx.fillStyle = "#f4c542";
  ctx.fillRect(x + unit * 4, y + unit * 6, unit, unit);
  // Legs.
  ctx.fillStyle = suit;
  ctx.fillRect(x + unit * 2, y + unit * 7, unit * 2, unit * 2);
  ctx.fillRect(x + unit * 5, y + unit * 7, unit * 2, unit * 2);
}

function drawGhost(ctx, enemy, cellW, cellH, crushable, now) {
  const pad = Math.max(2, Math.floor(cellW * .2));
  const x = enemy.x * cellW + pad;
  const y = enemy.y * cellH + pad;
  const w = cellW - pad * 2;
  const h = cellH - pad * 2;
  const flash = crushable && Math.floor(now / 150) % 2 === 0;
  ctx.fillStyle = crushable ? (flash ? "#ffffff" : "#514dff") : enemy.color;
  ctx.fillRect(x + w * .12, y + h * .12, w * .76, h * .22);
  ctx.fillRect(x, y + h * .3, w, h * .52);
  ctx.fillRect(x, y + h * .78, w * .25, h * .16);
  ctx.fillRect(x + w * .38, y + h * .78, w * .24, h * .16);
  ctx.fillRect(x + w * .75, y + h * .78, w * .25, h * .16);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + w * .2, y + h * .46, w * .16, h * .16);
  ctx.fillRect(x + w * .64, y + h * .46, w * .16, h * .16);
}

function drawProteinTub(ctx, x, y, cellW, cellH, large = false) {
  const w = cellW * (large ? .72 : .48);
  const h = cellH * (large ? .76 : .52);
  const left = x * cellW + (cellW - w) / 2;
  const top = y * cellH + (cellH - h) / 2;
  ctx.fillStyle = "#dce8f5";
  ctx.fillRect(left + w * .08, top, w * .84, h * .18);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(left, top + h * .18, w, h * .78);
  ctx.fillStyle = large ? "#ff4567" : "#2d8cff";
  ctx.fillRect(left + w * .08, top + h * .39, w * .84, h * .36);
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${Math.max(5, h * (large ? .22 : .3))}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(large ? "PRO" : "P", left + w / 2, top + h * .57);
}

function shootChopper() {
  if (!game || game.mode !== "chopper" || game.finished) return;
  game.bullets.push({ x: game.player.x + .145, y: game.player.y + .015 });
  playEffect("shoot");
  game.message = "PROTEIN CANNON!";
  game.messageUntil = performance.now() + 280;
}

function drawFlyingCouchDude(ctx, x, y, size, now, wobble) {
  const bob = Math.sin(now / 180 + wobble) * size * .05;
  const top = y + bob;

  // Chunky old couch, complete with sagging cushions and tiny hover jets.
  ctx.fillStyle = "#59351f";
  ctx.fillRect(x - size * .72, top - size * .04, size * 1.44, size * .58);
  ctx.fillStyle = "#a86b35";
  ctx.fillRect(x - size * .62, top - size * .3, size * 1.24, size * .58);
  ctx.fillStyle = "#c98748";
  ctx.fillRect(x - size * .5, top + size * .18, size * .46, size * .25);
  ctx.fillRect(x + size * .04, top + size * .18, size * .46, size * .25);
  ctx.fillStyle = "#744526";
  ctx.fillRect(x - size * .8, top - size * .12, size * .2, size * .62);
  ctx.fillRect(x + size * .6, top - size * .12, size * .2, size * .62);
  ctx.fillStyle = "#72ddff";
  ctx.fillRect(x - size * .57, top + size * .57, size * .17, size * .13);
  ctx.fillRect(x + size * .4, top + size * .57, size * .17, size * .13);

  // Big-bellied couch potato sitting deep in the cushions.
  ctx.fillStyle = "#f2c092";
  ctx.fillRect(x - size * .18, top - size * .72, size * .36, size * .29);
  ctx.fillStyle = "#402519";
  ctx.fillRect(x - size * .2, top - size * .77, size * .4, size * .1);
  ctx.fillStyle = "#f4d13d";
  ctx.fillRect(x - size * .34, top - size * .44, size * .68, size * .52);
  ctx.fillStyle = "#f7cfaa";
  ctx.beginPath();
  ctx.ellipse(x, top - size * .05, size * .36, size * .33, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff2d6";
  ctx.fillRect(x - size * .12, top - size * .12, size * .24, size * .17);
  ctx.fillStyle = "#24334b";
  ctx.fillRect(x - size * .42, top + size * .08, size * .3, size * .13);
  ctx.fillRect(x + size * .12, top + size * .08, size * .3, size * .13);
  ctx.fillStyle = "#111827";
  ctx.fillRect(x - size * .1, top - size * .62, size * .05, size * .05);
  ctx.fillRect(x + size * .05, top - size * .62, size * .05, size * .05);
}

function drawActionChopper(ctx, px, py, unit, now, state = game) {
  const rotorPulse = Math.abs(Math.sin(now / 55));

  // Tail boom, tail rotor, landing skids and a recognizable helicopter cabin.
  ctx.fillStyle = "#315b32";
  ctx.fillRect(px - unit * 8.2, py - unit * .9, unit * 6.2, unit * 1.8);
  ctx.fillStyle = "#75a64f";
  ctx.fillRect(px - unit * 9.2, py - unit * 2.1, unit * 1.4, unit * 4.2);
  ctx.fillStyle = "#d9e7ec";
  ctx.fillRect(px - unit * 9.85, py - unit * .2, unit * 2.7, unit * .4);
  ctx.fillRect(px - unit * 8.7, py - unit * 1.35, unit * .4, unit * 2.7);
  ctx.fillStyle = "#467a40";
  ctx.beginPath();
  ctx.ellipse(px, py, unit * 4.8, unit * 3.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(px - unit * 3.4, py - unit * 2.2, unit * 6.7, unit * 4.4);
  ctx.fillStyle = "#94dcff";
  ctx.fillRect(px + unit * .6, py - unit * 1.85, unit * 2.8, unit * 2.25);
  ctx.fillStyle = "#d9f5ff";
  ctx.fillRect(px + unit * 1.2, py - unit * 1.45, unit * 1.5, unit * .42);
  ctx.fillStyle = "#1b2a23";
  ctx.fillRect(px - unit * 3.1, py + unit * 2.7, unit * 6.6, unit * .42);
  ctx.fillRect(px - unit * 3.5, py + unit * 2, unit * .42, unit * 1.1);
  ctx.fillRect(px + unit * 3.1, py + unit * 2, unit * .42, unit * 1.1);

  // Mast and animated main rotor.
  ctx.fillStyle = "#c8d4dc";
  ctx.fillRect(px - unit * .25, py - unit * 4.2, unit * .5, unit * 2);
  ctx.fillRect(px - unit * (7 + rotorPulse * 2), py - unit * 4.4, unit * (14 + rotorPulse * 4), unit * .42);
  ctx.fillStyle = "#202933";
  ctx.fillRect(px - unit * 1.1, py - unit * 4.65, unit * 2.2, unit * .85);

  // Generic '80s muscle-action hero leaning out of the open door.
  const hx = px + unit * 2.9;
  const hy = py - unit * .2;
  ctx.fillStyle = "#f0b06f";
  ctx.fillRect(hx - unit * .5, hy - unit * 3.15, unit * 1.25, unit * 1.25);
  ctx.fillStyle = "#d7a042";
  ctx.fillRect(hx - unit * .65, hy - unit * 3.45, unit * 1.5, unit * .45);
  ctx.fillStyle = "#1c2127";
  ctx.fillRect(hx - unit * .44, hy - unit * 2, unit * 1.65, unit * 2.35);
  ctx.fillStyle = "#f0b06f";
  ctx.beginPath();
  ctx.ellipse(hx - unit * .85, hy - unit * 1.15, unit * .8, unit * 1.05, -.45, 0, Math.PI * 2);
  ctx.ellipse(hx + unit * 1.15, hy - unit * 1.1, unit * .88, unit * 1.08, .45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(hx + unit * 1.15, hy - unit * 1.25, unit * 2.6, unit * .6);

  // Protein-fed machine gun and muzzle flash.
  ctx.fillStyle = "#121820";
  ctx.fillRect(hx + unit * 1.3, hy - unit * .85, unit * 4.35, unit * .65);
  ctx.fillRect(hx + unit * 2.05, hy - unit * .2, unit * .65, unit * 1.4);
  ctx.fillStyle = "#e6edf2";
  ctx.fillRect(hx + unit * .65, hy - unit * .25, unit * 1.45, unit * 1.1);
  ctx.fillStyle = "#e83b4f";
  ctx.font = `900 ${Math.max(5, unit * .58)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("WHEY", hx + unit * 1.38, hy + unit * .3);
  if (state?.message === "PROTEIN CANNON!" && now < state.messageUntil) {
    ctx.fillStyle = "#fff36b";
    ctx.fillRect(hx + unit * 5.65, hy - unit * 1.05, unit * 1.2, unit * 1.05);
  }
}

function spawnChopperEnemy(now) {
  if (!game || game.mode !== "chopper" || now - game.lastSpawn < 650) return;
  game.lastSpawn = now;
  game.enemies.push({
    x: 1.08,
    y: .12 + Math.random() * .76,
    speed: .14 + Math.random() * .1,
    wobble: Math.random() * Math.PI * 2,
    label: Math.random() < .5 ? "Z" : "0"
  });
}

function updateChopper(now) {
  if (!game || game.mode !== "chopper") return;
  const delta = Math.min(.035, game.lastFrame ? (now - game.lastFrame) / 1000 : .016);
  game.lastFrame = now;
  game.rotorAngle += delta * 18;
  const speed = .62;
  game.player.x = Math.max(.08, Math.min(.82, game.player.x + game.motion.x * speed * delta));
  game.player.y = Math.max(.08, Math.min(.92, game.player.y + game.motion.y * speed * delta));
  spawnChopperEnemy(now);
  game.bullets.forEach(bullet => { bullet.x += delta * .95; });
  game.enemies.forEach(enemy => {
    enemy.x -= delta * enemy.speed;
    enemy.y += Math.sin(now / 260 + enemy.wobble) * delta * .035;
  });

  game.enemies.forEach(enemy => {
    const bulletIndex = game.bullets.findIndex(bullet => Math.abs(bullet.x - enemy.x) < .055 && Math.abs(bullet.y - enemy.y) < .055);
    if (bulletIndex >= 0) {
      game.bullets.splice(bulletIndex, 1);
      enemy.hit = true;
      game.score += 100;
      playEffect("impact");
      game.message = enemy.label === "Z" ? "COUCH POTATO DOWN!" : "ZERO REPS!";
      game.messageUntil = now + 520;
    }
    if (!enemy.hit && Math.abs(enemy.x - game.player.x) < .075 && Math.abs(enemy.y - game.player.y) < .075) {
      enemy.hit = true;
      game.lives = Math.max(0, game.lives - 1);
      playEffect("damage");
      game.message = "GAINS DAMAGED!";
      game.messageUntil = now + 650;
      if (!game.lives) game.lives = 3;
    }
  });
  game.bullets = game.bullets.filter(bullet => bullet.x < 1.12);
  game.enemies = game.enemies.filter(enemy => !enemy.hit && enemy.x > -.12);
}

function drawGymChopper(now, state = game) {
  if (!state || state.mode !== "chopper") return;
  const { canvas, ctx } = state;
  const rect = canvas.getBoundingClientRect();
  const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const targetW = Math.max(272, Math.floor(rect.width * scale));
  const targetH = Math.floor(targetW * 1.25);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#071426";
  ctx.fillRect(0, 0, w, h);
  // Pixel skyline and moving cloud bands.
  ctx.fillStyle = "#173250";
  for (let i = 0; i < 8; i += 1) {
    const x = ((i * .17 + now / 18000) % 1.25) * w - w * .1;
    ctx.fillRect(x, h * (.12 + (i % 4) * .2), w * .09, h * .025);
  }
  ctx.fillStyle = "#0d253b";
  for (let i = 0; i < 9; i += 1) {
    const buildingW = w / 9;
    const buildingH = h * (.08 + (i % 3) * .035);
    ctx.fillRect(i * buildingW, h - buildingH, buildingW * .82, buildingH);
  }

  state.bullets.forEach(bullet => {
    const bx = bullet.x * w;
    const by = bullet.y * h;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bx, by - 5, 14, 10);
    ctx.fillStyle = "#ff4567";
    ctx.fillRect(bx + 3, by - 2, 8, 4);
  });

  state.enemies.forEach(enemy => {
    const x = enemy.x * w;
    const y = enemy.y * h;
    const size = Math.max(29, w * .09);
    drawFlyingCouchDude(ctx, x, y, size, now, enemy.wobble);
  });

  // Muscle-action helicopter with a real cabin, rotors and door gunner.
  const px = state.player.x * w;
  const py = state.player.y * h;
  const unit = Math.max(3, w * .0095);
  drawActionChopper(ctx, px, py, unit, now, state);

  if (state.message && now < state.messageUntil) {
    ctx.fillStyle = "rgba(2,4,10,.8)";
    ctx.fillRect(w * .16, h * .1, w * .68, h * .08);
    ctx.fillStyle = "#fff36b";
    ctx.font = `900 ${Math.max(14, w * .047)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.message, w / 2, h * .14);
  }
}

function drawProteinRun(now, state = game) {
  if (!state) return;
  const { canvas, ctx } = state;
  const rect = canvas.getBoundingClientRect();
  const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const targetW = Math.max(272, Math.floor(rect.width * scale));
  const targetH = Math.floor(targetW * MAZE.length / MAZE[0].length);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const cellW = canvas.width / MAZE[0].length;
  const cellH = canvas.height / MAZE.length;
  ctx.fillStyle = "#02040a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const accent = getComputedStyle(document.getElementById(OVERLAY_ID)).getPropertyValue("--protein-run-accent").trim() || "#2d8cff";
  MAZE.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === "#") {
      ctx.fillStyle = accent;
      ctx.fillRect(x * cellW + cellW * .08, y * cellH + cellH * .08, cellW * .84, cellH * .84);
      ctx.fillStyle = "#081324";
      ctx.fillRect(x * cellW + cellW * .23, y * cellH + cellH * .23, cellW * .54, cellH * .54);
      return;
    }
    const key = `${x},${y}`;
    if (state.pellets.has(key)) drawProteinTub(ctx, x, y, cellW, cellH, false);
    if (state.powers.has(key)) drawProteinTub(ctx, x, y, cellW, cellH, true);
  }));
  const crushable = isCrushMode(now, state);
  drawLifter(ctx, state.player.x, state.player.y, cellW, cellH, growthStage(state), crushable);
  state.enemies.forEach(enemy => drawGhost(ctx, enemy, cellW, cellH, crushable, now));
  if (state.message && now < state.messageUntil) {
    ctx.fillStyle = "rgba(2,4,10,.82)";
    ctx.fillRect(canvas.width * .22, canvas.height * .44, canvas.width * .56, canvas.height * .1);
    ctx.fillStyle = crushable ? "#fff36b" : "#72e89a";
    ctx.font = `900 ${Math.max(15, canvas.width * .055)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.message, canvas.width / 2, canvas.height * .49);
  }
}

function syncHud() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay || !game) return false;
  const active = readActive();
  const timer = active?.restTimer;
  const sameTimer = Boolean(timer && (!game.timerId || !timer.timerId || timer.timerId === game.timerId));
  const ms = sameTimer ? remainingMs(timer) : 0;
  overlay.querySelector("[data-protein-run-clock]").textContent = timer?.status === "paused" ? "PAUSED" : formatTime(ms);
  overlay.querySelector("[data-protein-run-score]").textContent = String(game.score).padStart(5, "0");
  overlay.querySelector("[data-protein-run-lives]").textContent = "💪".repeat(game.lives);
  overlay.querySelector("[data-protein-run-size-label]").textContent = game.mode === "chopper" ? "AMMO" : "SIZE";
  overlay.querySelector("[data-protein-run-size]").textContent = game.mode === "chopper" ? "∞" : `${growthStage(game) + 1}/4`;
  const finished = !sameTimer || timer?.status === "finished" || ms <= 0;
  overlay.querySelector("[data-protein-run-finish]")?.classList.toggle("is-visible", finished);
  game.finished = finished;
  if (finished && !game.finishedSoundPlayed) {
    game.finishedSoundPlayed = true;
    playEffect("rest-over");
    stopMusic();
    stopRotor();
  }
  return !finished && timer?.status !== "paused";
}

function gameLoop(now) {
  if (!game) return;
  if (game.mode === "protein" && game.poweredUntil && now >= game.poweredUntil && growthStage(game) >= MAX_GROWTH_STAGE) {
    game.poweredUntil = 0;
    game.proteinCollected = PROTEIN_PER_GROWTH_STAGE;
    game.message = "POWER DOWN";
    game.messageUntil = now + 750;
  }
  const playing = !document.hidden && syncHud();
  if (playing) {
    if (game.mode === "chopper") updateChopper(now);
    else {
      movePlayer(now);
      moveEnemies(now);
      resolveCollisions(now);
    }
  }
  if (game.mode === "chopper") drawGymChopper(now);
  else drawProteinRun(now);
  frameId = requestAnimationFrame(gameLoop);
}

function arcadeMenuLoop() {
  const overlay = document.getElementById(OVERLAY_ID);
  const select = overlay?.querySelector("[data-rest-arcade-select]");
  if (!overlay || overlay.hidden || select?.hidden) return;
  const timer = readActive()?.restTimer;
  const clock = overlay.querySelector("[data-rest-arcade-clock]");
  if (!timer || timer.status === "finished" || remainingMs(timer) <= 0) {
    clock.textContent = "REST OVER";
    playEffect("rest-over");
    stopMusic();
    stopRotor();
    return;
  }
  clock.textContent = timer.status === "paused" ? "PAUSED" : formatTime(remainingMs(timer));
  frameId = requestAnimationFrame(arcadeMenuLoop);
}

function renderArcadePreviews() {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;
  const now = performance.now();
  const proteinCanvas = overlay.querySelector('[data-arcade-preview="protein"]');
  const chopperCanvas = overlay.querySelector('[data-arcade-preview="chopper"]');

  if (proteinCanvas) {
    const preview = createGameState(proteinCanvas);
    preview.player = { x: 7, y: 5 };
    preview.proteinCollected = PROTEIN_PER_GROWTH_STAGE * MAX_GROWTH_STAGE;
    preview.poweredUntil = now + 60000;
    preview.message = "CRUSH MODE!";
    preview.messageUntil = now + 60000;
    preview.pellets = new Set([...preview.pellets].filter((_, index) => index % 3 === 0));
    drawProteinRun(now, preview);
  }

  if (chopperCanvas) {
    const preview = createChopperState(chopperCanvas);
    preview.player = { x: .28, y: .48 };
    preview.bullets = [{ x: .58, y: .47 }, { x: .72, y: .47 }];
    preview.enemies = [
      { x: .83, y: .3, wobble: 0, label: "Z" },
      { x: .9, y: .7, wobble: 2, label: "0" }
    ];
    preview.message = "FIRE THE GAINS!";
    preview.messageUntil = now + 60000;
    drawGymChopper(now, preview);
  }
}

function ensureGameOverlay() {
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement("section");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Rest timer arcade game");
    overlay.innerHTML = `<div class="protein-run-shell">
      <div class="rest-arcade-select" data-rest-arcade-select>
        <button class="rest-arcade-sound" type="button" data-arcade-sound aria-label="Mute arcade sound">🔊</button>
        <button class="rest-arcade-close" type="button" data-protein-run-close aria-label="Close arcade">×</button>
        <div class="rest-arcade-marquee"><strong>LEVEL UP<br>ARCADE</strong><span>CHOOSE YOUR GAME</span></div>
        <div class="rest-arcade-clock">REST <b data-rest-arcade-clock>0:00</b></div>
        <div class="rest-arcade-grid">
          <button class="rest-arcade-card" type="button" data-arcade-game="protein">
            <canvas class="rest-arcade-art" data-arcade-preview="protein" role="img" aria-label="Actual Protein Run gameplay showing the maze, lifter, protein tubs and ghosts"></canvas>
            <span class="rest-arcade-card-copy"><span class="rest-arcade-card-title">Protein Run</span><span class="rest-arcade-card-desc">Eat protein. Grow huge. Crush the ghosts.</span><span class="rest-arcade-card-play">PLAY ▶</span></span>
          </button>
          <button class="rest-arcade-card" type="button" data-arcade-game="chopper">
            <canvas class="rest-arcade-art" data-arcade-preview="chopper" role="img" aria-label="Actual Gym Chopper gameplay showing the helicopter, whey shots and flying couch potatoes"></canvas>
            <span class="rest-arcade-card-copy"><span class="rest-arcade-card-title">Gym Chopper</span><span class="rest-arcade-card-desc">Fire whey at flying couch potatoes.</span><span class="rest-arcade-card-play">PLAY ▶</span></span>
          </button>
        </div>
        <p class="rest-arcade-insert">● PRESS A GAME TO START ●</p>
      </div>
      <div data-rest-game-view hidden>
        <header class="protein-run-header"><div><span class="protein-run-kicker">8-BIT REST TIMER</span><h2 data-rest-game-title>Protein Run</h2></div><div style="display:flex;gap:8px"><button class="rest-arcade-sound" type="button" data-arcade-sound aria-label="Mute arcade sound">🔊</button><div class="protein-run-clock" data-protein-run-clock>0:00</div><button class="protein-run-close" type="button" data-protein-run-close aria-label="Close game">×</button></div></header>
        <div class="protein-run-scorebar"><span>SCORE <b data-protein-run-score>00000</b></span><span><i data-protein-run-size-label style="font-style:normal">SIZE</i> <b data-protein-run-size>1/4</b></span><span data-protein-run-lives>💪💪💪</span><span>HIGH <b data-protein-run-high>00000</b></span></div>
        <div class="protein-run-stage"><canvas data-rest-game-canvas aria-label="Maze with a bicep collecting protein powder"></canvas><div class="protein-run-finish" data-protein-run-finish><div><strong>Rest Over!</strong><span>Get back to work.</span></div></div></div>
        <div class="protein-run-controls" aria-label="Game controls"><button type="button" data-game-direction="up" aria-label="Move up">▲</button><button type="button" data-game-direction="left" aria-label="Move left">◀</button><button type="button" data-game-direction="down" aria-label="Move down">▼</button><button type="button" data-game-direction="right" aria-label="Move right">▶</button><button class="gym-chopper-fire" type="button" data-chopper-fire>FIRE</button></div>
        <p class="protein-run-help" data-rest-game-help>Collect the clearly labelled protein tubs to grow. At maximum size, the ghosts flash—run into them and crush them with your biceps. Closing the game never stops your rest timer.</p>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", event => {
      if (event.target.closest("[data-protein-run-close]")) closeGame();
      if (event.target.closest("[data-arcade-sound]")) toggleArcadeSound();
      if (event.target.closest("[data-chopper-fire]")) shootChopper();
      const selection = event.target.closest("[data-arcade-game]");
      if (selection) openGame(selection.dataset.arcadeGame);
    });
    overlay.addEventListener("pointerdown", event => {
      const direction = event.target.closest("[data-game-direction]")?.dataset.gameDirection;
      if (direction) {
        event.preventDefault();
        setDirection(direction);
      }
    });
    const stopDirection = event => {
      const direction = event.target.closest("[data-game-direction]")?.dataset.gameDirection;
      if (direction) stopChopperDirection(direction);
    };
    overlay.addEventListener("pointerup", stopDirection);
    overlay.addEventListener("pointercancel", stopDirection);
    const canvas = overlay.querySelector("[data-rest-game-canvas]");
    canvas.addEventListener("touchstart", event => {
      const touch = event.changedTouches[0];
      touchStart = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });
    canvas.addEventListener("touchend", event => {
      if (!touchStart) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;
      touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    }, { passive: true });
  }
  return overlay;
}

function openArcadeMenu() {
  const timer = readActive()?.restTimer;
  if (!timer || timer.status === "finished") return;
  ensureStyles();
  const overlay = ensureGameOverlay();
  overlay.hidden = false;
  overlay.dataset.gameMode = "select";
  overlay.querySelector("[data-rest-arcade-select]").hidden = false;
  overlay.querySelector("[data-rest-game-view]").hidden = true;
  overlay.querySelector("[data-rest-arcade-clock]").textContent = timer.status === "paused" ? "PAUSED" : formatTime(remainingMs(timer));
  updateSoundButtons();
  stopRotor();
  startMusic();
  window.requestAnimationFrame(renderArcadePreviews);
  document.body.style.overflow = "hidden";
  cancelAnimationFrame(frameId);
  frameId = requestAnimationFrame(arcadeMenuLoop);
}

function openGame(mode = "protein") {
  const timer = readActive()?.restTimer;
  if (!timer || timer.status === "finished") return;
  ensureStyles();
  const overlay = ensureGameOverlay();
  overlay.hidden = false;
  overlay.dataset.gameMode = mode;
  overlay.querySelector("[data-rest-arcade-select]").hidden = true;
  overlay.querySelector("[data-rest-game-view]").hidden = false;
  document.body.style.overflow = "hidden";
  const canvas = overlay.querySelector("[data-rest-game-canvas]");
  game = mode === "chopper" ? createChopperState(canvas) : createGameState(canvas);
  const isChopper = game.mode === "chopper";
  updateSoundButtons();
  startMusic();
  if (isChopper) startRotor();
  else stopRotor();
  overlay.querySelector("[data-rest-game-title]").textContent = isChopper ? "Gym Chopper" : "Protein Run";
  overlay.querySelector("[data-rest-game-help]").textContent = isChopper
    ? "Hold the arrows to fly. Fire protein scoops at the flying couch potatoes before they damage your gains. Closing the game never stops your rest timer."
    : "Collect the clearly labelled protein tubs to grow. At maximum size, the ghosts flash—run into them and crush them with your biceps. Closing the game never stops your rest timer.";
  canvas.setAttribute("aria-label", isChopper ? "Muscle helicopter shooting flying couch potatoes" : "Maze with a lifter collecting protein powder");
  const highScoreKey = isChopper ? CHOPPER_HIGH_SCORE_KEY : HIGH_SCORE_KEY;
  overlay.querySelector("[data-protein-run-high]").textContent = String(Number(localStorage.getItem(highScoreKey)) || 0).padStart(5, "0");
  cancelAnimationFrame(frameId);
  frameId = requestAnimationFrame(gameLoop);
}

function closeGame() {
  if (game) {
    const highScoreKey = game.mode === "chopper" ? CHOPPER_HIGH_SCORE_KEY : HIGH_SCORE_KEY;
    const high = Math.max(Number(localStorage.getItem(highScoreKey)) || 0, game.score);
    localStorage.setItem(highScoreKey, String(high));
  }
  game = null;
  stopMusic();
  stopRotor();
  cancelAnimationFrame(frameId);
  frameId = null;
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.hidden = true;
  document.body.style.overflow = "";
}

function syncLaunchButton() {
  if (!isRestTimerGameEnabled()) {
    document.querySelectorAll(".rest-game-launch").forEach(button => button.remove());
    return;
  }
  const active = readActive();
  const timer = active?.restTimer;
  const controls = document.querySelector("#level-up-rest-alarm-banner .rest-alarm-controls");
  if (!controls || !timer || timer.status === "finished") return;
  if (controls.querySelector(".rest-game-launch")) return;
  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.className = "rest-game-launch";
  launcher.dataset.restGameLaunch = "arcade";
  launcher.textContent = "🎮 Play Game";
  controls.append(launcher);
}

function initialize() {
  ensureStyles();
  document.addEventListener("click", event => {
    const launcher = event.target.closest("[data-rest-game-launch]");
    if (launcher) openArcadeMenu();
  });
  document.addEventListener("levelup:rest-game-setting-changed", syncLaunchButton);
  document.addEventListener("levelup:rest-timer-finished", () => syncHud());
  document.addEventListener("keydown", event => {
    const keyMap = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (game && keyMap[event.key]) {
      event.preventDefault();
      setDirection(keyMap[event.key]);
    }
    if (game?.mode === "chopper" && (event.key === " " || event.key === "Enter")) shootChopper();
    if (event.key === "Escape" && !document.getElementById(OVERLAY_ID)?.hidden) closeGame();
  });
  document.addEventListener("keyup", event => {
    const keyMap = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (game?.mode === "chopper" && keyMap[event.key]) stopChopperDirection(keyMap[event.key]);
  });
  new MutationObserver(syncLaunchButton).observe(document.body, { childList: true, subtree: true });
  window.setInterval(syncLaunchButton, 500);
  syncLaunchButton();
}

if (isNativeIOS()) initialize();
