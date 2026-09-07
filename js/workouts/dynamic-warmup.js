import { getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { getFormGuideVideo } from "./exercise-guide-video-resolver.js?v=form-video-root-fallback-1";

const STYLE_ID = "dynamic-warmup-styles";
const STYLE_HREF = "/css/dynamic-warmup.css?v=dynamic-warmup-1";
const ACTIVE_KEY = "level_up_active_workout";
const MODE_KEY = "level_up_dynamic_warmup_mode";
const SESSION_KEY = "level_up_dynamic_warmup_sessions";

const DRILLS = Object.freeze({
  pushup: { id: "push-up", name: "Push-Ups", seconds: 30, cue: "Move smoothly through a comfortable range. Keep a few reps in reserve." },
  rearDelt: { id: "cable-rear-delt-fly", name: "Rear-Delt Fly", seconds: 30, cue: "Use very light resistance and focus on controlled shoulder-blade movement." },
  lateralRaise: { id: "lateral-raise", name: "Light Lateral Raises", seconds: 20, cue: "Use very light resistance. Raise smoothly without shrugging." },
  squat: { id: "bodyweight-squat", name: "Bodyweight Squats", seconds: 40, cue: "Use a comfortable depth and gradually increase your range." },
  lunge: { id: "lunge", name: "Alternating Lunges", seconds: 40, cue: "Stay controlled and use bodyweight or very light resistance." },
  bridge: { id: "glute-bridge", name: "Glute Bridges", seconds: 30, cue: "Squeeze the glutes at the top without overextending your lower back." },
  hinge: { id: "romanian-deadlift", name: "Light Hip Hinges", seconds: 30, cue: "Use an empty bar or very light load and rehearse the hinge pattern." },
  calf: { id: "standing-calf-raise", name: "Calf Raises", seconds: 25, cue: "Move through a comfortable range and pause briefly at the top." },
  pulldown: { id: "straight-arm-pulldown", name: "Light Straight-Arm Pulldowns", seconds: 30, cue: "Use light resistance and focus on shoulder motion and lat engagement." }
});

let observer = null;
let activeTimer = null;
let sequence = [];
let sequenceIndex = 0;
let remaining = 0;
let running = false;
let mountedWorkoutId = "";

function ensureStyles() {
  let link = document.getElementById(STYLE_ID);
  if (!link) {
    link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (!link.href.includes("dynamic-warmup-1")) link.href = STYLE_HREF;
}

function readActive() {
  try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null"); }
  catch { return null; }
}

function getMode() {
  const value = localStorage.getItem(MODE_KEY);
  return ["ask", "always", "off"].includes(value) ? value : "ask";
}

function setMode(value) {
  if (!["ask", "always", "off"].includes(value)) return;
  localStorage.setItem(MODE_KEY, value);
}

function readStatuses() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch { return {}; }
}

function setStatus(workoutId, status) {
  if (!workoutId) return;
  const statuses = readStatuses();
  statuses[workoutId] = { status, at: Date.now() };
  const compact = Object.fromEntries(Object.entries(statuses)
    .sort((a, b) => Number(b[1]?.at || 0) - Number(a[1]?.at || 0))
    .slice(0, 20));
  localStorage.setItem(SESSION_KEY, JSON.stringify(compact));
}

function getStatus(workoutId) {
  return readStatuses()[workoutId]?.status || "";
}

function hasStartedLifting(active) {
  return Boolean(active?.exercises?.some(exercise =>
    (exercise?.sets || []).some(set => set?.completed || Number(set?.reps) > 0 || Number(set?.weight) > 0)
  ));
}

function workoutMuscles(active) {
  return new Set((active?.exercises || []).map(item => {
    const id = item?.exerciseId || item?.id;
    return getExerciseById(id)?.muscleGroup || "";
  }).filter(Boolean));
}

function chooseSequence(active) {
  const muscles = workoutMuscles(active);
  const upperPush = ["Chest", "Shoulders", "Triceps"].some(m => muscles.has(m));
  const upperPull = ["Back", "Biceps", "Rear Delts"].some(m => muscles.has(m));
  const lower = ["Quads", "Hamstrings", "Glutes", "Calves", "Adductors"].some(m => muscles.has(m));
  const picks = [];

  if (lower) {
    picks.push(DRILLS.squat, DRILLS.lunge);
    if (muscles.has("Hamstrings") || muscles.has("Glutes")) picks.push(DRILLS.hinge, DRILLS.bridge);
    else picks.push(DRILLS.bridge, DRILLS.calf);
  }
  if (upperPush) picks.push(DRILLS.pushup, DRILLS.lateralRaise);
  if (upperPull) picks.push(DRILLS.rearDelt, DRILLS.pulldown);

  if (!picks.length) picks.push(DRILLS.squat, DRILLS.pushup, DRILLS.lunge, DRILLS.bridge);

  const unique = [...new Map(picks.map(drill => [drill.id, drill])).values()];
  if (upperPush && upperPull && lower) return [DRILLS.squat, DRILLS.pushup, DRILLS.rearDelt, DRILLS.lunge];
  return unique.slice(0, 4);
}

function formatTime(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function totalMinutes(drills) {
  const seconds = drills.reduce((sum, drill) => sum + drill.seconds, 0);
  return Math.max(2, Math.ceil(seconds / 60));
}

function currentVideo(drill) {
  return getFormGuideVideo(drill.id);
}

function videoMarkup(drill, className = "") {
  const video = currentVideo(drill);
  if (!video?.src) return `<div class="dynamic-warmup-video-fallback ${className}" aria-hidden="true">▶</div>`;
  return `<video class="dynamic-warmup-video ${className}" muted playsinline loop preload="metadata" src="${video.src}" data-fallback-src="${video.fallbackSrc || ""}" aria-label="${drill.name} demonstration"></video>`;
}

function bindVideoFallback(root) {
  root.querySelectorAll("video.dynamic-warmup-video").forEach(video => {
    video.addEventListener("error", () => {
      const fallback = video.dataset.fallbackSrc;
      if (fallback && video.src !== fallback) {
        video.src = fallback;
        video.load();
      }
    }, { once: true });
  });
}

function renderPrompt(logger, active) {
  if (!logger || logger.querySelector("[data-dynamic-warmup-prompt]")) return;
  const drills = chooseSequence(active);
  if (!drills.length) return;
  const prompt = document.createElement("section");
  prompt.className = "dynamic-warmup-prompt";
  prompt.dataset.dynamicWarmupPrompt = "";
  prompt.innerHTML = `
    <div class="dynamic-warmup-prompt-head">
      <div><span class="dynamic-warmup-kicker">DYNAMIC WARM-UP</span><h3>Prepare before lifting <small>Optional</small></h3><p>${totalMinutes(drills)} min · ${drills.length} movements tailored to today's workout.</p></div>
      <button class="dynamic-warmup-skip" type="button" data-dynamic-warmup-skip>Skip</button>
    </div>
    <div class="dynamic-warmup-preview-list">
      ${drills.map((drill, index) => `<div><b>${index + 1}</b><span><strong>${drill.name}</strong><small>${formatTime(drill.seconds)}</small></span></div>`).join("")}
    </div>
    <div class="dynamic-warmup-actions">
      <label>Warm-up setting<select data-dynamic-warmup-mode><option value="ask">Ask each workout</option><option value="always">Always show</option><option value="off">Off</option></select></label>
      <button class="dynamic-warmup-start" type="button" data-dynamic-warmup-start>▶ Start Warm-Up</button>
    </div>`;
  prompt.querySelector("[data-dynamic-warmup-mode]").value = getMode();

  const anchor = logger.querySelector("#session-exercises") || logger.firstElementChild;
  if (anchor) anchor.insertAdjacentElement("beforebegin", prompt);
  else logger.prepend(prompt);

  prompt.querySelector("[data-dynamic-warmup-skip]")?.addEventListener("click", () => skipWarmup(active.id));
  prompt.querySelector("[data-dynamic-warmup-start]")?.addEventListener("click", () => startWarmup(active.id, drills));
  prompt.querySelector("[data-dynamic-warmup-mode]")?.addEventListener("change", event => {
    setMode(event.target.value);
    if (event.target.value === "off") skipWarmup(active.id, true);
  });

  if (getMode() === "always") requestAnimationFrame(() => startWarmup(active.id, drills));
}

function skipWarmup(workoutId, settingChanged = false) {
  stopTimer();
  if (!settingChanged) setStatus(workoutId, "skipped");
  document.querySelector("[data-dynamic-warmup-overlay]")?.remove();
  document.querySelector("[data-dynamic-warmup-prompt]")?.remove();
}

function startWarmup(workoutId, drills) {
  stopTimer();
  sequence = drills;
  sequenceIndex = 0;
  remaining = sequence[0]?.seconds || 30;
  running = false;
  setStatus(workoutId, "started");
  renderOverlay(workoutId);
}

function renderOverlay(workoutId) {
  document.querySelector("[data-dynamic-warmup-overlay]")?.remove();
  const drill = sequence[sequenceIndex];
  if (!drill) return finishWarmup(workoutId);
  const overlay = document.createElement("section");
  overlay.className = "dynamic-warmup-overlay";
  overlay.dataset.dynamicWarmupOverlay = "";
  overlay.innerHTML = `
    <div class="dynamic-warmup-sheet" role="dialog" aria-modal="true" aria-label="Dynamic warm-up">
      <div class="dynamic-warmup-sheet-head"><div><span>DYNAMIC WARM-UP · ${sequenceIndex + 1}/${sequence.length}</span><h3>${drill.name}</h3></div><button type="button" data-dynamic-warmup-close aria-label="Skip warm-up">×</button></div>
      <div class="dynamic-warmup-current-video">${videoMarkup(drill, "is-current")}<div class="dynamic-warmup-time" data-dynamic-warmup-time>${formatTime(remaining)}</div></div>
      <p>${drill.cue}</p>
      <div class="dynamic-warmup-progress"><i style="width:${((sequenceIndex + 1) / sequence.length) * 100}%"></i></div>
      <div class="dynamic-warmup-controls">
        <button type="button" data-dynamic-warmup-prev ${sequenceIndex === 0 ? "disabled" : ""}>|◀</button>
        <button class="dynamic-warmup-play" type="button" data-dynamic-warmup-play>▶</button>
        <button type="button" data-dynamic-warmup-next>${sequenceIndex === sequence.length - 1 ? "Finish" : "▶|"}</button>
      </div>
      <div class="dynamic-warmup-up-next">${sequence.slice(sequenceIndex + 1).map(item => `<span><strong>${item.name}</strong><small>${formatTime(item.seconds)}</small></span>`).join("") || "<span><strong>Ready to lift</strong><small>Finish when ready</small></span>"}</div>
      <button class="dynamic-warmup-skip-sheet" type="button" data-dynamic-warmup-skip-sheet>Skip Warm-Up</button>
    </div>`;
  document.body.appendChild(overlay);
  bindVideoFallback(overlay);

  overlay.querySelector("[data-dynamic-warmup-close]")?.addEventListener("click", () => skipWarmup(workoutId));
  overlay.querySelector("[data-dynamic-warmup-skip-sheet]")?.addEventListener("click", () => skipWarmup(workoutId));
  overlay.querySelector("[data-dynamic-warmup-play]")?.addEventListener("click", () => toggleTimer());
  overlay.querySelector("[data-dynamic-warmup-prev]")?.addEventListener("click", () => moveTo(workoutId, sequenceIndex - 1));
  overlay.querySelector("[data-dynamic-warmup-next]")?.addEventListener("click", () => {
    if (sequenceIndex >= sequence.length - 1) finishWarmup(workoutId);
    else moveTo(workoutId, sequenceIndex + 1);
  });
}

function moveTo(workoutId, index) {
  stopTimer();
  sequenceIndex = Math.max(0, Math.min(index, sequence.length - 1));
  remaining = sequence[sequenceIndex]?.seconds || 30;
  renderOverlay(workoutId);
  startTimer();
}

function toggleTimer() {
  running ? stopTimer() : startTimer();
}

function startTimer() {
  if (activeTimer || !sequence.length) return;
  running = true;
  const overlay = document.querySelector("[data-dynamic-warmup-overlay]");
  overlay?.querySelector(".dynamic-warmup-video.is-current")?.play?.().catch(() => {});
  const play = overlay?.querySelector("[data-dynamic-warmup-play]");
  if (play) play.textContent = "Ⅱ";
  activeTimer = window.setInterval(() => {
    remaining -= 1;
    const time = document.querySelector("[data-dynamic-warmup-time]");
    if (time) time.textContent = formatTime(remaining);
    if (remaining > 0) return;
    const active = readActive();
    const workoutId = active?.id || mountedWorkoutId;
    if (sequenceIndex >= sequence.length - 1) finishWarmup(workoutId);
    else moveTo(workoutId, sequenceIndex + 1);
  }, 1000);
}

function stopTimer() {
  if (activeTimer) window.clearInterval(activeTimer);
  activeTimer = null;
  running = false;
  const overlay = document.querySelector("[data-dynamic-warmup-overlay]");
  overlay?.querySelector(".dynamic-warmup-video.is-current")?.pause?.();
  const play = overlay?.querySelector("[data-dynamic-warmup-play]");
  if (play) play.textContent = "▶";
}

function finishWarmup(workoutId) {
  stopTimer();
  setStatus(workoutId, "completed");
  document.querySelector("[data-dynamic-warmup-overlay]")?.remove();
  document.querySelector("[data-dynamic-warmup-prompt]")?.remove();
  document.querySelector("#session-exercises")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
}

function mount() {
  ensureStyles();
  const logger = document.querySelector("#workout-session-logger, .workout-session-logger");
  if (!logger || logger.dataset.editingSessionId) return;
  const active = readActive();
  if (!active?.id) return;
  mountedWorkoutId = active.id;
  if (getMode() === "off" || hasStartedLifting(active) || ["skipped", "completed"].includes(getStatus(active.id))) {
    logger.querySelector("[data-dynamic-warmup-prompt]")?.remove();
    return;
  }
  renderPrompt(logger, active);
}

function scheduleMount() { requestAnimationFrame(mount); }

observer = new MutationObserver(scheduleMount);
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("click", event => {
  if (event.target.closest?.("#begin-session-btn, [data-schedule-start], .active-workout-banner, [data-active-workout-banner], .nav-btn")) {
    setTimeout(scheduleMount, 40);
  }
});
window.addEventListener("storage", scheduleMount);

scheduleMount();
