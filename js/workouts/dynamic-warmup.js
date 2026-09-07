import { getExerciseById } from "./exercise-library.js?v=exercise-library-catalogue-2";
import { getFormGuideVideo } from "./exercise-guide-video-resolver.js?v=form-video-root-fallback-1";

const STYLE_ID = "dynamic-warmup-styles";
const STYLE_HREF = "/css/dynamic-warmup.css?v=dynamic-warmup-5";
const ACTIVE_KEY = "level_up_active_workout";
const MODE_KEY = "level_up_dynamic_warmup_mode";
const SESSION_KEY = "level_up_dynamic_warmup_sessions";
const WARMUP_VIDEO_ORIGIN = "https://media.leveluphypertrophy.com/warmup-videos";
const WARMUP_VIDEO_KEYS = Object.freeze({
  shoulderBand: "band-shoulder-warm-up.mp4",
  dynamicChest: "dynamic-chest-stretch.mp4",
  reachRotation: "reach-up-back-rotation.mp4",
  kneelingRotation: "kneeling-back-rotation.mp4",
  dynamicBack: "dynamic-back-stretch.mp4",
  standingRotation: "standing-back-rotation.mp4",
  kneelingLat: "kneeling-lat-mobilization.mp4",
  scapulaDips: "scapula-dips.mp4",
  wristCircles: "wrist-circles.mp4",
  hipCircles: "hip-circles.mp4",
  kneeRaise: "dynamic-knee-raises.mp4",
  ankleRotation: "ankle-rotations.mp4",
  kneeCircles: "knee-circles.mp4",
  sideLunge: "dynamic-side-lunges.mp4",
  bodyweightSquat: "bodyweight-squats.mp4",
  hipAbduction: "band-hip-abduction.mp4",
  pullThrough: "band-pull-through.mp4",
  jumpingJack: "jumping-jacks.mp4"
});

// Curated from the Level Up Form Videos Google Drive library. These are the
// most useful dynamic / movement-prep clips for pre-lifting use. Static holds
// remain out of the automatic warm-up rotation.
const DRILLS = Object.freeze({
  shoulderBand: {
    key: "shoulderBand",
    name: "Band Shoulder Warm-Up",
    seconds: 30,
    cue: "Move continuously through a comfortable shoulder range. Keep the band light.",
    driveId: "1N4jLRoIGfFEMfrsuCX31tokXTsdwOAoL",
    sourceFile: "Stretching - Band Warm-up Shoulder Stretch.mp4",
    fallbackId: "cable-rear-delt-fly"
  },
  dynamicChest: {
    key: "dynamicChest",
    name: "Dynamic Chest Stretch",
    seconds: 30,
    cue: "Use controlled, rhythmic reps. Open the chest without forcing end range.",
    driveId: "1GWfndBLOS4wLC8j5n6UgyHecRl8LkU8_",
    sourceFile: "Stretching - Dynamic Chest Stretch.mp4",
    fallbackId: "push-up"
  },
  reachRotation: {
    key: "reachRotation",
    name: "Reach-Up Back Rotation",
    seconds: 30,
    cue: "Rotate smoothly through the upper back while keeping the movement controlled.",
    driveId: "1q1UhEgBm7c9ao2armFdi9gbfo8ZrfQB4",
    sourceFile: "Stretching - Standing Reach Up Back Rotation Stretch.mp4",
    fallbackId: "cable-rear-delt-fly"
  },
  kneelingRotation: {
    key: "kneelingRotation",
    name: "Kneeling Back Rotation",
    seconds: 30,
    cue: "Rotate through the upper back rather than forcing the lower back.",
    driveId: "1hL2VEm4ZsvW3EMpRiRBNO82pAEqahOki",
    sourceFile: "Stretching - Kneeling Back Rotation Stretch.mp4",
    fallbackId: "cable-rear-delt-fly"
  },
  dynamicBack: {
    key: "dynamicBack",
    name: "Dynamic Back Stretch",
    seconds: 30,
    cue: "Keep the movement fluid and comfortable as you prepare the upper back for pulling.",
    driveId: "1Rl2dvlLbpWSPOVfuAgSxBDeCkAp3lzYP",
    sourceFile: "Stretching - Dynamic Back Stretch.mp4",
    fallbackId: "seated-cable-row"
  },
  standingRotation: {
    key: "standingRotation",
    name: "Standing Back Rotation",
    seconds: 30,
    cue: "Rotate side to side under control. Avoid bouncing into end range.",
    driveId: "1IRrxtP3G4CoEEleQw-DdDxWgeMHZ4pi4",
    sourceFile: "Stretching - Standing Back Rotation Stretch.mp4",
    fallbackId: "seated-cable-row"
  },
  kneelingLat: {
    key: "kneelingLat",
    name: "Kneeling Lat Mobilization",
    seconds: 30,
    cue: "Move in and out of the stretch gently rather than holding the deepest position.",
    driveId: "1-umCWvcXuX1XVw97WLZW1n9pUjC2-1Wd",
    sourceFile: "Stretching - Kneeling Lat Stretch.mp4",
    fallbackId: "straight-arm-pulldown"
  },
  scapulaDips: {
    key: "scapulaDips",
    name: "Scapula Dips",
    seconds: 30,
    cue: "Keep the arms straight and move through the shoulder blades with control.",
    driveId: "18dVXK4luULAIMz7iBvv7JJ_OIJE3_UQM",
    sourceFile: "Scapula Dips.mp4",
    fallbackId: "dip"
  },
  wristCircles: {
    key: "wristCircles",
    name: "Wrist Circles",
    seconds: 20,
    cue: "Use smooth circles in both directions before gripping weights.",
    driveId: "1IuH2K8AMfeltQq_hoq4TCuFp4MeTsuHw",
    sourceFile: "Stretching - Wrist Circles.mp4",
    fallbackId: "wrist-curl"
  },
  hipCircles: {
    key: "hipCircles",
    name: "Hip Circles",
    seconds: 30,
    cue: "Move through comfortable circles and gradually increase the range.",
    driveId: "18MzeQdVltHRFcaSPjAqYnRtaRgPlP6ZZ",
    sourceFile: "Stretching - Hip Circles Stretch.mp4",
    fallbackId: "hip-abduction-machine"
  },
  kneeRaise: {
    key: "kneeRaise",
    name: "Dynamic Knee Raises",
    seconds: 30,
    cue: "Alternate sides smoothly and keep your torso tall.",
    driveId: "1A8kN6Jq_9bEF2rcyHVfEs7jAJUSqnegY",
    sourceFile: "Stretching - Knee Raise.mp4",
    fallbackId: "walking-lunge"
  },
  ankleRotation: {
    key: "ankleRotation",
    name: "Feet & Ankle Rotations",
    seconds: 25,
    cue: "Circle each ankle through a comfortable range before squatting or lunging.",
    driveId: "1t_yo9Hv8bSLEXunb5A30rgezUUNQ3-vK",
    sourceFile: "Stretching - Feet and Ankles Rotation Stretch.mp4",
    fallbackId: "standing-calf-raise"
  },
  kneeCircles: {
    key: "kneeCircles",
    name: "Knee Circles",
    seconds: 20,
    cue: "Keep the circles small and controlled. This is movement prep, not a deep stretch.",
    driveId: "11m8hGT16j-UqHI32wmSWQ3q03VSIhH3C",
    sourceFile: "Stretching - Circles Knee Stretch.mp4",
    fallbackId: "bodyweight-squat"
  },
  sideLunge: {
    key: "sideLunge",
    name: "Dynamic Side Lunges",
    seconds: 35,
    cue: "Shift side to side under control and gradually increase depth.",
    driveId: "1Q2SIu2uW6bycj7zjc1Hbi-da3IyClkJe",
    sourceFile: "Stretching - Plyo Side Lunge Stretch.mp4",
    fallbackId: "lunge"
  },
  bodyweightSquat: {
    key: "bodyweightSquat",
    name: "Bodyweight Squats",
    seconds: 40,
    cue: "Use a comfortable depth and progressively settle into your squat pattern.",
    driveId: "18Z0UWY9bYZqYJmO4BNNhsyS0S4JrEuM8",
    sourceFile: "Squat.mp4",
    fallbackId: "bodyweight-squat"
  },
  hipAbduction: {
    key: "hipAbduction",
    name: "Band Hip Abduction",
    seconds: 30,
    cue: "Use a light band and controlled reps to prepare the lateral hips and glutes.",
    driveId: "1WB8D0BUSkNprHZ1u-x110TVHgt3jEfXD",
    sourceFile: "Band Hip Abduction.mp4",
    fallbackId: "hip-abduction-machine"
  },
  pullThrough: {
    key: "pullThrough",
    name: "Light Band Pull-Through",
    seconds: 35,
    cue: "Rehearse the hip hinge with a light band and a neutral spine.",
    driveId: "1s2NKBfgUxJ9aAtycSDU_HMiN7mwqFZ04",
    sourceFile: "Band Pull Through.mp4",
    fallbackId: "cable-pull-through"
  },
  jumpingJack: {
    key: "jumpingJack",
    name: "Jumping Jacks",
    seconds: 30,
    cue: "Use an easy pace to raise body temperature before the movement-specific warm-up.",
    driveId: "1byQ2mrVPOGs2HhpznIsv7eW-T8zI9iVj",
    sourceFile: "Jumping Jack.mp4",
    fallbackId: "elliptical"
  }
});

const ROUTINES = Object.freeze({
  push: { label: "Chest / Push", drills: ["shoulderBand", "dynamicChest", "reachRotation", "scapulaDips"] },
  shoulders: { label: "Shoulders", drills: ["shoulderBand", "dynamicBack", "standingRotation", "scapulaDips"] },
  pull: { label: "Back / Pull", drills: ["dynamicBack", "standingRotation", "kneelingLat", "scapulaDips"] },
  arms: { label: "Arms", drills: ["wristCircles", "shoulderBand", "dynamicChest", "scapulaDips"] },
  upper: { label: "Upper Body", drills: ["shoulderBand", "dynamicChest", "dynamicBack", "standingRotation", "scapulaDips"] },
  squat: { label: "Squat / Quad", drills: ["ankleRotation", "hipCircles", "kneeCircles", "sideLunge", "bodyweightSquat"] },
  hinge: { label: "Hinge / Posterior Chain", drills: ["hipCircles", "kneeRaise", "pullThrough", "hipAbduction", "bodyweightSquat"] },
  lower: { label: "Lower Body", drills: ["ankleRotation", "hipCircles", "kneeRaise", "sideLunge", "bodyweightSquat"] },
  full: { label: "Full Body", drills: ["jumpingJack", "shoulderBand", "hipCircles", "dynamicBack", "bodyweightSquat"] }
});

let observer = null;
let activeTimer = null;
let sequence = [];
let sequenceIndex = 0;
let remaining = 0;
let running = false;
let mountedWorkoutId = "";
let mountedRoutineLabel = "";

function ensureStyles() {
  let link = document.getElementById(STYLE_ID);
  if (!link) {
    link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (!link.href.includes("dynamic-warmup-5")) link.href = STYLE_HREF;
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

function exerciseIds(active) {
  return (active?.exercises || []).map(item => String(item?.exerciseId || item?.id || "").toLowerCase()).filter(Boolean);
}

function workoutMuscles(active) {
  return new Set((active?.exercises || []).map(item => {
    const id = item?.exerciseId || item?.id;
    return getExerciseById(id)?.muscleGroup || "";
  }).filter(Boolean));
}

function matchesAny(ids, pattern) {
  return ids.some(id => pattern.test(id));
}

function chooseRoutine(active) {
  const ids = exerciseIds(active);
  const muscles = workoutMuscles(active);
  const upperPush = ["Chest", "Shoulders", "Triceps"].some(m => muscles.has(m)) || matchesAny(ids, /(bench|press|push-up|dip|fly)/);
  const upperPull = ["Back", "Biceps", "Rear Delts"].some(m => muscles.has(m)) || matchesAny(ids, /(row|pulldown|pull-up|chin-up|pullover)/);
  const lower = ["Quads", "Hamstrings", "Glutes", "Calves", "Adductors"].some(m => muscles.has(m)) || matchesAny(ids, /(squat|lunge|leg-|deadlift|romanian|hip-|calf|pull-through)/);
  const squatPattern = matchesAny(ids, /(squat|hack|leg-press|leg-extension|lunge|split-squat)/);
  const hingePattern = matchesAny(ids, /(deadlift|romanian|hip-thrust|glute-bridge|leg-curl|pull-through|good-morning)/);
  const shoulderDominant = muscles.has("Shoulders") && !muscles.has("Chest") && !muscles.has("Back");
  const armsOnly = !muscles.has("Chest") && !muscles.has("Back") && !muscles.has("Shoulders") && (muscles.has("Biceps") || muscles.has("Triceps") || matchesAny(ids, /(curl|tricep|pushdown|skull|extension)/));

  if (lower && (upperPush || upperPull)) return ROUTINES.full;
  if (lower) {
    if (squatPattern && !hingePattern) return ROUTINES.squat;
    if (hingePattern && !squatPattern) return ROUTINES.hinge;
    return ROUTINES.lower;
  }
  if (armsOnly) return ROUTINES.arms;
  if (shoulderDominant) return ROUTINES.shoulders;
  if (upperPush && upperPull) return ROUTINES.upper;
  if (upperPush) return ROUTINES.push;
  if (upperPull) return ROUTINES.pull;
  return ROUTINES.full;
}

function routineSequence(routine) {
  return routine.drills.map(key => DRILLS[key]).filter(Boolean);
}

function formatTime(seconds) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function totalMinutes(drills) {
  const seconds = drills.reduce((sum, drill) => sum + drill.seconds, 0);
  return Math.max(2, Math.ceil(seconds / 60));
}

function driveDownloadUrl(id) {
  return id ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}` : "";
}

function drivePreviewUrl(id) {
  return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview` : "";
}

function sourceUrls(drill) {
  const urls = [];
  const mediaKey = WARMUP_VIDEO_KEYS[drill.key];
  if (mediaKey) urls.push(`${WARMUP_VIDEO_ORIGIN}/${mediaKey}`);
  if (drill.driveId) urls.push(driveDownloadUrl(drill.driveId));
  const fallback = drill.fallbackId ? getFormGuideVideo(drill.fallbackId) : null;
  if (fallback?.src) urls.push(fallback.src);
  if (fallback?.fallbackSrc) urls.push(fallback.fallbackSrc);
  return [...new Set(urls.filter(Boolean))];
}

function videoMarkup(drill, className = "") {
  const sources = sourceUrls(drill);
  if (!sources.length) return `<div class="dynamic-warmup-video-fallback ${className}" aria-hidden="true">▶</div>`;
  const packed = encodeURIComponent(JSON.stringify(sources));
  const isCurrent = className.includes("is-current");
  const preload = isCurrent || className.includes("is-thumb") ? "auto" : "metadata";
  const autoplay = isCurrent ? " autoplay" : "";
  return `<video class="dynamic-warmup-video ${className}" muted playsinline loop${autoplay} preload="${preload}" src="${sources[0]}" data-video-sources="${packed}" data-drive-preview="${drivePreviewUrl(drill.driveId)}" aria-label="${drill.name} demonstration"></video>`;
}

function bindVideoFallback(root) {
  root.querySelectorAll("video.dynamic-warmup-video").forEach(video => {
    if (video.dataset.fallbackBound === "true") return;
    video.dataset.fallbackBound = "true";
    video.dataset.sourceIndex = "0";
    if (video.classList.contains("is-thumb")) {
      const showStillFrame = () => {
        video.pause?.();
        const duration = Number(video.duration);
        const frameTime = Number.isFinite(duration) && duration > 0 ? Math.min(0.35, duration / 4) : 0.2;
        if (Math.abs(Number(video.currentTime || 0) - frameTime) > 0.04) video.currentTime = frameTime;
      };
      if (video.readyState >= 1) showStillFrame();
      else video.addEventListener("loadedmetadata", showStillFrame, { once: true });
    }
    video.addEventListener("error", () => {
      let sources = [];
      try { sources = JSON.parse(decodeURIComponent(video.dataset.videoSources || "%5B%5D")); } catch {}
      const nextIndex = Number(video.dataset.sourceIndex || 0) + 1;
      if (nextIndex < sources.length) {
        video.dataset.sourceIndex = String(nextIndex);
        video.src = sources[nextIndex];
        video.load();
        if (running && video.classList.contains("is-current")) video.play().catch(() => {});
        return;
      }
      const preview = video.dataset.drivePreview;
      if (preview) {
        const frame = document.createElement("iframe");
        frame.className = video.className.replace("dynamic-warmup-video", "dynamic-warmup-drive-preview");
        frame.src = preview;
        frame.title = video.getAttribute("aria-label") || "Warm-up demonstration";
        frame.allow = "autoplay; fullscreen";
        frame.loading = "lazy";
        video.replaceWith(frame);
        return;
      }
      const fallback = document.createElement("div");
      fallback.className = "dynamic-warmup-video-fallback";
      fallback.textContent = "Video unavailable";
      video.replaceWith(fallback);
    });
  });
}

function openDynamicWarmupSettings() {
  const moreButton = document.querySelector('.nav-btn[data-page="more"]');
  if (!moreButton) return;
  moreButton.click();
  const openSettings = () => document.querySelector('[data-more-page="dynamic-warmups"]')?.click();
  requestAnimationFrame(() => {
    if (!document.querySelector('[data-more-page="dynamic-warmups"]')) {
      window.setTimeout(openSettings, 60);
      return;
    }
    openSettings();
  });
}

function renderPrompt(logger, active) {
  if (!logger || logger.querySelector("[data-dynamic-warmup-prompt]")) return;
  const routine = chooseRoutine(active);
  const drills = routineSequence(routine);
  if (!drills.length) return;
  mountedRoutineLabel = routine.label;

  const prompt = document.createElement("section");
  prompt.className = "dynamic-warmup-prompt";
  prompt.dataset.dynamicWarmupPrompt = "";
  prompt.innerHTML = `
    <div class="dynamic-warmup-prompt-head">
      <div><span class="dynamic-warmup-kicker">DYNAMIC WARM-UP</span><h3>Warm up before ${routine.label}? <small>Optional</small></h3><p>${totalMinutes(drills)} min of video-guided movement preparation.</p></div>
    </div>
    <div class="dynamic-warmup-actions">
      <button class="dynamic-warmup-skip" type="button" data-dynamic-warmup-skip>No, Not Now</button>
      <button class="dynamic-warmup-start" type="button" data-dynamic-warmup-start>Yes, Start</button>
    </div>
    <p class="dynamic-warmup-setting-note">Turn these prompts off anytime in More → <button type="button" data-dynamic-warmup-settings>Dynamic Warm-Ups</button>.</p>`;

  const anchor = logger.querySelector("#session-exercises") || logger.firstElementChild;
  if (anchor) anchor.insertAdjacentElement("beforebegin", prompt);
  else logger.prepend(prompt);

  prompt.querySelector("[data-dynamic-warmup-skip]")?.addEventListener("click", () => skipWarmup(active.id));
  prompt.querySelector("[data-dynamic-warmup-start]")?.addEventListener("click", () => startWarmup(active.id, drills, routine.label));
  prompt.querySelector("[data-dynamic-warmup-settings]")?.addEventListener("click", openDynamicWarmupSettings);
  if (getMode() === "always") requestAnimationFrame(() => startWarmup(active.id, drills, routine.label));
}

function skipWarmup(workoutId, settingChanged = false) {
  stopTimer();
  if (!settingChanged) setStatus(workoutId, "skipped");
  document.querySelector("[data-dynamic-warmup-overlay]")?.remove();
  document.querySelector("[data-dynamic-warmup-prompt]")?.remove();
}

function startWarmup(workoutId, drills, routineLabel = mountedRoutineLabel) {
  stopTimer();
  sequence = drills;
  sequenceIndex = 0;
  remaining = sequence[0]?.seconds || 30;
  running = false;
  mountedRoutineLabel = routineLabel || "Workout";
  setStatus(workoutId, "started");
  renderOverlay(workoutId);
  requestAnimationFrame(startTimer);
}

function renderQueue() {
  return sequence.map((item, index) => `
    <button type="button" class="dynamic-warmup-queue-item ${index === sequenceIndex ? "is-current" : ""}" data-dynamic-warmup-jump="${index}">
      <span class="dynamic-warmup-queue-number">${index + 1}</span>
      <span class="dynamic-warmup-queue-thumb">${videoMarkup(item, "is-thumb")}</span>
      <span class="dynamic-warmup-queue-copy"><strong>${item.name}</strong><small>${index < sequenceIndex ? "Done" : formatTime(item.seconds)}</small></span>
    </button>
  `).join("");
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
      <div class="dynamic-warmup-sheet-head">
        <div><span>DYNAMIC WARM-UP · ${mountedRoutineLabel} · ${sequenceIndex + 1}/${sequence.length}</span><h3>${drill.name}</h3></div>
        <button type="button" data-dynamic-warmup-close aria-label="Skip warm-up">×</button>
      </div>
      <div class="dynamic-warmup-current-video">${videoMarkup(drill, "is-current")}<div class="dynamic-warmup-time" data-dynamic-warmup-time>${formatTime(remaining)}</div></div>
      <p>${drill.cue}</p>
      <div class="dynamic-warmup-progress"><i style="width:${((sequenceIndex + Math.max(0, 1 - remaining / drill.seconds)) / sequence.length) * 100}%"></i></div>
      <div class="dynamic-warmup-controls">
        <button type="button" data-dynamic-warmup-prev ${sequenceIndex === 0 ? "disabled" : ""}>|◀</button>
        <button class="dynamic-warmup-play" type="button" data-dynamic-warmup-play>${running ? "Ⅱ" : "▶"}</button>
        <button type="button" data-dynamic-warmup-next>${sequenceIndex === sequence.length - 1 ? "Finish" : "▶|"}</button>
      </div>
      <div class="dynamic-warmup-queue" aria-label="Warm-up movements">${renderQueue()}</div>
      <button class="dynamic-warmup-skip-sheet" type="button" data-dynamic-warmup-skip-sheet>Skip Warm-Up</button>
    </div>`;
  document.body.appendChild(overlay);
  bindVideoFallback(overlay);
  requestAnimationFrame(() => {
    overlay.querySelector(".dynamic-warmup-queue-item.is-current")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center"
    });
  });

  overlay.querySelector("[data-dynamic-warmup-close]")?.addEventListener("click", () => skipWarmup(workoutId));
  overlay.querySelector("[data-dynamic-warmup-skip-sheet]")?.addEventListener("click", () => skipWarmup(workoutId));
  overlay.querySelector("[data-dynamic-warmup-play]")?.addEventListener("click", () => toggleTimer());
  overlay.querySelector("[data-dynamic-warmup-prev]")?.addEventListener("click", () => moveTo(workoutId, sequenceIndex - 1));
  overlay.querySelector("[data-dynamic-warmup-next]")?.addEventListener("click", () => {
    if (sequenceIndex >= sequence.length - 1) finishWarmup(workoutId);
    else moveTo(workoutId, sequenceIndex + 1);
  });
  overlay.querySelectorAll("[data-dynamic-warmup-jump]").forEach(button => {
    button.addEventListener("click", () => moveTo(workoutId, Number(button.dataset.dynamicWarmupJump)));
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

function playCurrentVideo(overlay) {
  const video = overlay?.querySelector(".dynamic-warmup-video.is-current");
  if (!video) return;
  const play = () => video.play?.().catch(() => {});
  if (video.readyState >= 2) play();
  else video.addEventListener("canplay", play, { once: true });
}

function startTimer() {
  if (activeTimer || !sequence.length) return;
  running = true;
  const overlay = document.querySelector("[data-dynamic-warmup-overlay]");
  playCurrentVideo(overlay);
  const play = overlay?.querySelector("[data-dynamic-warmup-play]");
  if (play) play.textContent = "Ⅱ";
  activeTimer = window.setInterval(() => {
    remaining -= 1;
    const time = document.querySelector("[data-dynamic-warmup-time]");
    if (time) time.textContent = formatTime(remaining);
    const progress = document.querySelector(".dynamic-warmup-progress i");
    const drill = sequence[sequenceIndex];
    if (progress && drill) progress.style.width = `${((sequenceIndex + Math.max(0, 1 - remaining / drill.seconds)) / sequence.length) * 100}%`;
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
