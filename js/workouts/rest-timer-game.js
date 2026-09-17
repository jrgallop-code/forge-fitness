import { isNativeIOS } from "../core/home-screen-widgets.js?v=home-widget-live-3";

const ACTIVE_KEY = "level_up_active_workout";
const ENABLED_KEY = "level_up_rest_timer_game_enabled";
const HIGH_SCORE_KEY = "level_up_protein_run_high_score";
const OVERLAY_ID = "level-up-protein-run";
const STYLE_ID = "level-up-protein-run-style";

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

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .protein-run-launch { grid-column: 1 / -1; min-height: 38px; border-color: color-mix(in srgb, var(--accent, #2d8cff) 70%, white 18%) !important; background: color-mix(in srgb, var(--accent, #2d8cff) 28%, #07111f) !important; color: #fff !important; font-size: 11px !important; letter-spacing: .03em; }
    #${OVERLAY_ID} { position: fixed; inset: 0; z-index: 20000; display: grid; align-items: end; background: rgba(1, 5, 12, .76); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
    #${OVERLAY_ID}[hidden] { display: none !important; }
    .protein-run-shell { width: 100%; max-height: 94svh; overflow: auto; border-radius: 24px 24px 0 0; padding: 14px 14px calc(16px + env(safe-area-inset-bottom)); background: #050912; border: 2px solid var(--protein-run-accent, #2d8cff); box-shadow: 0 -22px 65px rgba(0,0,0,.58); color: #f7fbff; font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; image-rendering: pixelated; }
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
    poweredUntil: 0,
    lastPlayerMove: 0,
    lastEnemyMove: 0,
    timerId: readActive()?.restTimer?.timerId || "",
    finished: false
  };
}

function resetBoard(state) {
  const next = createGameState(state.canvas);
  next.score = state.score;
  next.lives = state.lives;
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
  game.queued = DIRECTIONS[name];
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
  if (game.pellets.delete(key)) game.score += 10;
  if (game.powers.delete(key)) {
    game.score += 50;
    game.poweredUntil = now + 5000;
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
  if (now < game.poweredUntil) {
    game.score += 200;
    hit.x = 8;
    hit.y = 9;
    hit.direction = DIRECTIONS.up;
  } else {
    game.lives = Math.max(0, game.lives - 1);
    game.player = { x: 8, y: 9 };
    game.enemies[0].x = 7;
    game.enemies[0].y = 9;
    game.enemies[1].x = 9;
    game.enemies[1].y = 9;
    if (!game.lives) game.lives = 3;
  }
}

function drawBicep(ctx, x, y, size, powered) {
  const px = Math.max(2, Math.floor(size / 7));
  ctx.fillStyle = powered ? "#fff36b" : "#f3a43b";
  ctx.fillRect(x + px, y + px * 3, px * 5, px * 3);
  ctx.fillRect(x + px * 2, y + px, px * 3, px * 4);
  ctx.fillRect(x + px * 4, y + px * 2, px * 2, px * 2);
  ctx.fillStyle = "#7d3f10";
  ctx.fillRect(x, y + px * 5, px * 2, px * 2);
  ctx.fillRect(x + px * 5, y + px * 5, px * 2, px * 2);
}

function drawShaker(ctx, enemy, cellW, cellH, powered) {
  const pad = Math.max(2, Math.floor(cellW * .2));
  const x = enemy.x * cellW + pad;
  const y = enemy.y * cellH + pad;
  const w = cellW - pad * 2;
  const h = cellH - pad * 2;
  ctx.fillStyle = powered ? "#48576b" : enemy.color;
  ctx.fillRect(x + w * .18, y + h * .12, w * .64, h * .18);
  ctx.fillRect(x, y + h * .3, w, h * .58);
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + w * .2, y + h * .46, w * .16, h * .16);
  ctx.fillRect(x + w * .64, y + h * .46, w * .16, h * .16);
}

function draw(now) {
  if (!game) return;
  const { canvas, ctx } = game;
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
    if (game.pellets.has(key)) {
      ctx.fillStyle = "#eef7ff";
      ctx.fillRect(x * cellW + cellW * .42, y * cellH + cellH * .42, cellW * .16, cellH * .16);
    }
    if (game.powers.has(key)) {
      ctx.fillStyle = "#f8f8f8";
      ctx.fillRect(x * cellW + cellW * .28, y * cellH + cellH * .22, cellW * .44, cellH * .58);
      ctx.fillStyle = "#ff4567";
      ctx.fillRect(x * cellW + cellW * .34, y * cellH + cellH * .43, cellW * .32, cellH * .14);
    }
  }));
  drawBicep(ctx, game.player.x * cellW + cellW * .08, game.player.y * cellH + cellH * .08, Math.min(cellW, cellH) * .85, now < game.poweredUntil);
  game.enemies.forEach(enemy => drawShaker(ctx, enemy, cellW, cellH, now < game.poweredUntil));
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
  const finished = !sameTimer || timer?.status === "finished" || ms <= 0;
  overlay.querySelector("[data-protein-run-finish]")?.classList.toggle("is-visible", finished);
  game.finished = finished;
  return !finished && timer?.status !== "paused";
}

function gameLoop(now) {
  if (!game) return;
  const playing = !document.hidden && syncHud();
  if (playing) {
    movePlayer(now);
    moveEnemies(now);
    resolveCollisions(now);
  }
  draw(now);
  frameId = requestAnimationFrame(gameLoop);
}

function openGame() {
  const timer = readActive()?.restTimer;
  if (!timer || timer.status === "finished") return;
  ensureStyles();
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement("section");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Protein Run rest timer game");
    overlay.innerHTML = `<div class="protein-run-shell">
      <header class="protein-run-header"><div><span class="protein-run-kicker">8-BIT REST TIMER</span><h2>Protein Run</h2></div><div style="display:flex;gap:8px"><div class="protein-run-clock" data-protein-run-clock>0:00</div><button class="protein-run-close" type="button" data-protein-run-close aria-label="Close game">×</button></div></header>
      <div class="protein-run-scorebar"><span>SCORE <b data-protein-run-score>00000</b></span><span data-protein-run-lives>💪💪💪</span><span>HIGH <b data-protein-run-high>00000</b></span></div>
      <div class="protein-run-stage"><canvas aria-label="Maze with a bicep collecting protein powder"></canvas><div class="protein-run-finish" data-protein-run-finish><div><strong>Rest Over!</strong><span>Get back to work.</span></div></div></div>
      <div class="protein-run-controls" aria-label="Game controls"><button type="button" data-game-direction="up" aria-label="Move up">▲</button><button type="button" data-game-direction="left" aria-label="Move left">◀</button><button type="button" data-game-direction="down" aria-label="Move down">▼</button><button type="button" data-game-direction="right" aria-label="Move right">▶</button></div>
      <p class="protein-run-help">Swipe the maze or use the arrows. Eat protein tubs and avoid the shaker bots. Closing the game never stops your rest timer.</p>
    </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", event => {
      if (event.target.closest("[data-protein-run-close]")) closeGame();
      const direction = event.target.closest("[data-game-direction]")?.dataset.gameDirection;
      if (direction) setDirection(direction);
    });
    const canvas = overlay.querySelector("canvas");
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
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  const canvas = overlay.querySelector("canvas");
  game = createGameState(canvas);
  overlay.querySelector("[data-protein-run-high]").textContent = String(Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0).padStart(5, "0");
  cancelAnimationFrame(frameId);
  frameId = requestAnimationFrame(gameLoop);
}

function closeGame() {
  if (game) {
    const high = Math.max(Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0, game.score);
    localStorage.setItem(HIGH_SCORE_KEY, String(high));
  }
  game = null;
  cancelAnimationFrame(frameId);
  frameId = null;
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.hidden = true;
  document.body.style.overflow = "";
}

function syncLaunchButton() {
  if (!isRestTimerGameEnabled()) {
    document.querySelectorAll(".protein-run-launch").forEach(button => button.remove());
    return;
  }
  const active = readActive();
  const timer = active?.restTimer;
  const controls = document.querySelector("#level-up-rest-alarm-banner .rest-alarm-controls");
  if (!controls || !timer || timer.status === "finished") return;
  if (controls.querySelector(".protein-run-launch")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "protein-run-launch";
  button.dataset.restGameLaunch = "true";
  button.textContent = "🎮 Play Protein Run";
  controls.appendChild(button);
}

function initialize() {
  ensureStyles();
  document.addEventListener("click", event => {
    if (event.target.closest("[data-rest-game-launch]")) openGame();
  });
  document.addEventListener("levelup:rest-game-setting-changed", syncLaunchButton);
  document.addEventListener("levelup:rest-timer-finished", () => syncHud());
  document.addEventListener("keydown", event => {
    const keyMap = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
    if (game && keyMap[event.key]) {
      event.preventDefault();
      setDirection(keyMap[event.key]);
    }
    if (game && event.key === "Escape") closeGame();
  });
  new MutationObserver(syncLaunchButton).observe(document.body, { childList: true, subtree: true });
  window.setInterval(syncLaunchButton, 500);
  syncLaunchButton();
}

if (isNativeIOS()) initialize();

