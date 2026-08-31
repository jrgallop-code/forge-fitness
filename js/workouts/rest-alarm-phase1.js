import { openActiveWorkout, ACTIVE_WORKOUT_STORAGE_KEY } from "./workout-session.js?v=workout-source-stats-1";
import { getExerciseById } from "./exercise-library.js?v=exercise-library-3";

const EXERCISE_TIMER_SETTINGS_KEY = "level_up_exercise_rest_settings";
const ALARM_PREFS_KEY = "level_up_rest_alarm_preferences";
const STYLE_ID = "level-up-rest-alarm-phase1-styles";
const BANNER_ID = "level-up-rest-alarm-banner";

let lastTimerSignature = "";
let intervalId = null;
let observerQueued = false;

function getActive() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || "null");
    return parsed && parsed.status === "in_progress" ? parsed : null;
  } catch {
    return null;
  }
}

function saveActive(active) {
  if (!active) return;
  active.updatedAt = new Date().toISOString();
  localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(active));
}

function getExerciseSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EXERCISE_TIMER_SETTINGS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getAlarmPrefs() {
  const fallback = { defaultSeconds: 120 };
  try {
    const parsed = JSON.parse(localStorage.getItem(ALARM_PREFS_KEY) || "{}");
    const seconds = Number(parsed?.defaultSeconds);
    return {
      ...fallback,
      ...(parsed && typeof parsed === "object" ? parsed : {}),
      defaultSeconds: [60, 90, 120, 180].includes(seconds) ? seconds : fallback.defaultSeconds
    };
  } catch {
    return fallback;
  }
}

function saveAlarmPrefs(patch) {
  localStorage.setItem(ALARM_PREFS_KEY, JSON.stringify({ ...getAlarmPrefs(), ...patch }));
}

function remainingMs(timer) {
  if (!timer) return 0;
  if (timer.status === "running" && timer.endAt) {
    return Math.max(0, new Date(timer.endAt).getTime() - Date.now());
  }
  return Math.max(0, Number(timer.remainingMs) || 0);
}

function formatCountdown(ms) {
  const seconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function getNextSet(active) {
  if (!active || !Array.isArray(active.exercises)) return null;

  const startExercise = Math.max(0, Number(active.currentExerciseIndex) || 0);
  const startSet = Math.max(-1, Number(active.currentSetIndex));

  for (let exerciseIndex = startExercise; exerciseIndex < active.exercises.length; exerciseIndex += 1) {
    const state = active.exercises[exerciseIndex];
    if (!Array.isArray(state?.sets) || !state.sets.length) continue;
    const firstSet = exerciseIndex === startExercise ? startSet + 1 : 0;
    for (let setIndex = Math.max(0, firstSet); setIndex < state.sets.length; setIndex += 1) {
      if (!state.sets[setIndex]?.completed) return { exerciseIndex, setIndex };
    }
  }

  // If a user manually jumped ahead, still offer the first unfinished set anywhere in the workout.
  for (let exerciseIndex = 0; exerciseIndex < active.exercises.length; exerciseIndex += 1) {
    const state = active.exercises[exerciseIndex];
    if (!Array.isArray(state?.sets)) continue;
    const setIndex = state.sets.findIndex(set => !set?.completed);
    if (setIndex >= 0) return { exerciseIndex, setIndex };
  }

  return null;
}

function getPlannedExercise(active, exerciseIndex) {
  return active?.planSnapshot?.days?.[Number(active.trainingDayIndex) || 0]?.exercises?.[exerciseIndex] || null;
}

function getNextSetContext(active) {
  const next = getNextSet(active);
  if (!next) {
    return {
      done: true,
      title: "All planned sets are complete",
      detail: "Review the workout, then complete it when you are ready.",
      previous: ""
    };
  }

  const planned = getPlannedExercise(active, next.exerciseIndex);
  const exerciseId = planned?.id || active?.exercises?.[next.exerciseIndex]?.exerciseId;
  const exercise = getExerciseById(exerciseId);
  const exerciseName = exercise?.name || "Next exercise";
  const target = String(planned?.reps || "").trim();
  const row = document.querySelector(
    `.session-exercise-card[data-exercise-index="${next.exerciseIndex}"] .session-set-row[data-set-index="${next.setIndex}"]`
  );
  const previous = row?.querySelector(".previous-set-value")?.textContent?.trim() || "";

  return {
    ...next,
    done: false,
    title: `${exerciseName} · Set ${next.setIndex + 1}`,
    detail: target ? `Target ${target} reps` : "Next working set",
    previous: previous && previous !== "Hasn't started" ? `Previous ${previous}` : ""
  };
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${BANNER_ID} {
      position: fixed;
      left: max(12px, env(safe-area-inset-left));
      right: max(12px, env(safe-area-inset-right));
      bottom: calc(72px + env(safe-area-inset-bottom));
      z-index: 1200;
      max-width: 540px;
      margin-inline: auto;
      padding: 11px 12px;
      border: 1px solid rgba(255,255,255,.12);
      border-left: 3px solid #ff315f;
      border-radius: 15px;
      background: rgba(13,13,16,.97);
      box-shadow: 0 14px 40px rgba(0,0,0,.58);
      color: #fff;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    #${BANNER_ID}[hidden] { display: none !important; }
    #${BANNER_ID}.is-ending { border-color: rgba(255,49,95,.55); }
    #${BANNER_ID}.is-final-seconds .rest-alarm-time { animation: levelup-rest-pulse .72s ease-in-out infinite alternate; }
    #${BANNER_ID}.is-complete {
      border-color: rgba(79,220,128,.45);
      border-left-color: #4fdc80;
      background: rgba(11,22,16,.98);
    }
    .rest-alarm-top {
      display: grid;
      grid-template-columns: minmax(0,1fr) auto;
      gap: 12px;
      align-items: center;
    }
    .rest-alarm-copy { min-width: 0; }
    .rest-alarm-kicker {
      display: block;
      color: #ff687f;
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
    }
    .is-complete .rest-alarm-kicker { color: #72e89a; }
    .rest-alarm-next {
      display: block;
      margin-top: 2px;
      overflow: hidden;
      color: #f5f5f7;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.2;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .rest-alarm-detail {
      display: flex;
      flex-wrap: wrap;
      gap: 5px 8px;
      margin-top: 3px;
      color: #9f9fa8;
      font-size: 9px;
      line-height: 1.25;
    }
    .rest-alarm-time {
      min-width: 68px;
      text-align: right;
      color: #ff4f69;
      font-variant-numeric: tabular-nums;
      font-size: 29px;
      font-weight: 950;
      letter-spacing: -.04em;
      line-height: 1;
    }
    .is-complete .rest-alarm-time { color: #72e89a; font-size: 23px; }
    .rest-alarm-controls {
      display: grid;
      grid-template-columns: repeat(4, minmax(0,1fr));
      gap: 6px;
      margin-top: 9px;
    }
    .rest-alarm-controls button {
      min-height: 35px;
      padding: 6px 7px;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 9px;
      background: #202027;
      color: #f7f7f9;
      font-size: 10px;
      font-weight: 850;
    }
    .rest-alarm-controls button.rest-alarm-primary {
      border-color: rgba(255,49,95,.55);
      background: rgba(255,49,95,.18);
    }
    .is-complete .rest-alarm-controls button.rest-alarm-primary {
      border-color: rgba(79,220,128,.45);
      background: rgba(79,220,128,.14);
    }
    .rest-alarm-alert-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-top: 7px;
      padding-top: 7px;
      border-top: 1px solid rgba(255,255,255,.07);
      color: #8f8f98;
      font-size: 9px;
      line-height: 1.25;
    }
    .rest-alarm-alert-row button {
      flex: 0 0 auto;
      padding: 4px 7px;
      border: 1px solid rgba(255,49,95,.35);
      border-radius: 7px;
      background: rgba(255,49,95,.1);
      color: #fff;
      font-size: 9px;
      font-weight: 800;
    }
    @keyframes levelup-rest-pulse {
      from { transform: scale(1); opacity: 1; }
      to { transform: scale(1.055); opacity: .76; }
    }
    @media (max-width: 390px) {
      #${BANNER_ID} { left: 8px; right: 8px; padding: 10px; bottom: calc(68px + env(safe-area-inset-bottom)); }
      .rest-alarm-time { min-width: 62px; font-size: 26px; }
      .rest-alarm-controls { gap: 5px; }
      .rest-alarm-controls button { padding-inline: 4px; font-size: 9px; }
    }
  `;
  document.head.appendChild(style);
}

function ensureBanner() {
  let banner = document.getElementById(BANNER_ID);
  if (banner) return banner;

  banner = document.createElement("section");
  banner.id = BANNER_ID;
  banner.hidden = true;
  banner.setAttribute("aria-live", "polite");
  banner.setAttribute("aria-label", "Rest timer");
  document.body.appendChild(banner);

  banner.addEventListener("click", async event => {
    const button = event.target.closest("button[data-rest-action]");
    if (!button) return;

    const action = button.dataset.restAction;
    if (action === "minus15") adjustTimer(-15);
    if (action === "plus15") adjustTimer(15);
    if (action === "pause") togglePause();
    if (action === "skip") dismissTimer();
    if (action === "plus30") restartFinishedTimer(30);
    if (action === "next") startNextSet();
    if (action === "alerts") await requestAlerts();

    syncBanner(true);
  });

  return banner;
}

function notificationStatusMarkup() {
  if (!("Notification" in window)) {
    return `<div class="rest-alarm-alert-row"><span>Sound + in-app alarm active. Browser notifications are not supported here.</span></div>`;
  }

  if (Notification.permission === "granted") {
    return `<div class="rest-alarm-alert-row"><span>✓ Background notification permission is enabled while the PWA/browser can receive it.</span></div>`;
  }

  if (Notification.permission === "denied") {
    return `<div class="rest-alarm-alert-row"><span>Notifications are blocked. Re-enable them in your iPhone/browser notification settings if wanted.</span></div>`;
  }

  return `<div class="rest-alarm-alert-row"><span>Want a notification banner when Level Up is in the background?</span><button type="button" data-rest-action="alerts">Enable Alerts</button></div>`;
}

function getNotificationPermission() {
  return "Notification" in window ? Notification.permission : "unsupported";
}

function syncBanner(force = false) {
  const banner = ensureBanner();
  const logger = document.getElementById("workout-session-logger");
  const active = getActive();
  const timer = active?.restTimer;

  if (!logger || !active || !timer) {
    banner.hidden = true;
    lastTimerSignature = "";
    return;
  }

  const ms = remainingMs(timer);
  const complete = timer.status === "finished" || (timer.status !== "paused" && ms <= 0);
  const paused = timer.status === "paused";
  const context = getNextSetContext(active);
  const signature = [timer.status, Math.ceil(ms / 1000), active.currentExerciseIndex, active.currentSetIndex, context.title, getNotificationPermission()].join("|");
  if (!force && signature === lastTimerSignature) return;
  lastTimerSignature = signature;

  banner.hidden = false;
  banner.classList.toggle("is-complete", complete);
  banner.classList.toggle("is-ending", !complete && ms > 0 && ms <= 10000);
  banner.classList.toggle("is-final-seconds", !complete && ms > 0 && ms <= 5000);

  if (complete) {
    banner.innerHTML = `
      <div class="rest-alarm-top">
        <div class="rest-alarm-copy">
          <span class="rest-alarm-kicker">REST COMPLETE</span>
          <strong class="rest-alarm-next">${escapeHtml(context.title)}</strong>
          <div class="rest-alarm-detail"><span>${escapeHtml(context.detail)}</span>${context.previous ? `<span>${escapeHtml(context.previous)}</span>` : ""}</div>
        </div>
        <div class="rest-alarm-time">READY</div>
      </div>
      <div class="rest-alarm-controls">
        <button class="rest-alarm-primary" type="button" data-rest-action="next">${context.done ? "Review" : "Start Next Set"}</button>
        <button type="button" data-rest-action="plus30">+30 sec</button>
        <button type="button" data-rest-action="plus15">+15 sec</button>
        <button type="button" data-rest-action="skip">Dismiss</button>
      </div>
      ${notificationStatusMarkup()}
    `;
    return;
  }

  banner.innerHTML = `
    <div class="rest-alarm-top">
      <div class="rest-alarm-copy">
        <span class="rest-alarm-kicker">${paused ? "REST PAUSED" : "REST TIMER"}</span>
        <strong class="rest-alarm-next">Next: ${escapeHtml(context.title)}</strong>
        <div class="rest-alarm-detail"><span>${escapeHtml(context.detail)}</span>${context.previous ? `<span>${escapeHtml(context.previous)}</span>` : ""}</div>
      </div>
      <div class="rest-alarm-time">${formatCountdown(ms)}</div>
    </div>
    <div class="rest-alarm-controls">
      <button type="button" data-rest-action="minus15">−15 sec</button>
      <button class="rest-alarm-primary" type="button" data-rest-action="pause">${paused ? "Resume" : "Pause"}</button>
      <button type="button" data-rest-action="plus15">+15 sec</button>
      <button type="button" data-rest-action="skip">Skip Rest</button>
    </div>
    ${notificationStatusMarkup()}
  `;
}

function adjustTimer(deltaSeconds) {
  const active = getActive();
  const timer = active?.restTimer;
  if (!active || !timer) return;

  const current = remainingMs(timer);
  const next = Math.max(0, current + deltaSeconds * 1000);

  if (timer.status === "paused") {
    if (next <= 0) {
      timer.status = "running";
      timer.endAt = new Date().toISOString();
      timer.remainingMs = 0;
      timer.notified = false;
    } else {
      timer.remainingMs = next;
    }
  } else if (timer.status === "finished") {
    if (deltaSeconds > 0) {
      timer.status = "running";
      timer.remainingMs = next || deltaSeconds * 1000;
      timer.endAt = new Date(Date.now() + (next || deltaSeconds * 1000)).toISOString();
      timer.notified = false;
    }
  } else {
    timer.status = "running";
    timer.remainingMs = next;
    timer.endAt = new Date(Date.now() + next).toISOString();
    timer.notified = false;
  }

  saveActive(active);
}

function togglePause() {
  const active = getActive();
  const timer = active?.restTimer;
  if (!active || !timer || timer.status === "finished") return;

  if (timer.status === "paused") {
    const ms = Math.max(0, Number(timer.remainingMs) || 0);
    timer.status = "running";
    timer.endAt = new Date(Date.now() + ms).toISOString();
  } else {
    timer.remainingMs = remainingMs(timer);
    timer.status = "paused";
    timer.endAt = null;
  }
  saveActive(active);
}

function dismissTimer() {
  const active = getActive();
  if (!active) return;
  active.restTimer = null;
  saveActive(active);
}

function restartFinishedTimer(seconds) {
  const active = getActive();
  if (!active) return;
  active.restTimer = {
    status: "running",
    durationSeconds: seconds,
    remainingMs: seconds * 1000,
    endAt: new Date(Date.now() + seconds * 1000).toISOString(),
    notified: false
  };
  saveActive(active);
}

function startNextSet() {
  const active = getActive();
  if (!active) return;
  const next = getNextSet(active);

  active.restTimer = null;
  if (!next) {
    saveActive(active);
    document.getElementById("save-session-btn")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  active.currentExerciseIndex = next.exerciseIndex;
  active.currentSetIndex = next.setIndex;
  saveActive(active);

  openActiveWorkout();
  setTimeout(() => {
    const row = document.querySelector(
      `.session-exercise-card[data-exercise-index="${next.exerciseIndex}"] .session-set-row[data-set-index="${next.setIndex}"]`
    );
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    row?.querySelector(".session-weight, .session-reps")?.focus({ preventScroll: true });
  }, 180);
}

async function requestAlerts() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    // The in-app alarm remains available.
  }
}

function syncRememberedDefault() {
  const prefs = getAlarmPrefs();
  const settings = getExerciseSettings();

  document.querySelectorAll(".session-exercise-card[data-exercise-id]").forEach(card => {
    const exerciseId = card.dataset.exerciseId;
    if (!exerciseId || settings[exerciseId]) return;
    const select = card.querySelector(".exercise-rest-duration");
    if (select?.querySelector(`option[value="${prefs.defaultSeconds}"]`)) {
      select.value = String(prefs.defaultSeconds);
    }
  });
}

function exerciseIdForControl(control) {
  return control?.closest(".session-exercise-card")?.dataset.exerciseId || "";
}

document.addEventListener("change", event => {
  const duration = event.target.closest?.(".exercise-rest-duration");
  if (duration) {
    const seconds = Number(duration.value);
    if ([60, 90, 120, 180].includes(seconds)) saveAlarmPrefs({ defaultSeconds: seconds });
    return;
  }

  const toggle = event.target.closest?.(".exercise-timer-enabled");
  if (!toggle?.checked) return;
  const exerciseId = exerciseIdForControl(toggle);
  if (!exerciseId || getExerciseSettings()[exerciseId]) return;
  const select = toggle.closest(".exercise-options-popover")?.querySelector(".exercise-rest-duration");
  const seconds = getAlarmPrefs().defaultSeconds;
  if (select?.querySelector(`option[value="${seconds}"]`)) select.value = String(seconds);
}, true);

function queueEnhance() {
  if (observerQueued) return;
  observerQueued = true;
  requestAnimationFrame(() => {
    observerQueued = false;
    syncRememberedDefault();
    syncBanner(true);
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

ensureStyles();
ensureBanner();
syncRememberedDefault();
syncBanner(true);

const observer = new MutationObserver(queueEnhance);
observer.observe(document.body, { childList: true, subtree: true });

intervalId = window.setInterval(syncBanner, 250);
window.addEventListener("focus", () => syncBanner(true));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) syncBanner(true);
});

window.addEventListener("beforeunload", () => {
  if (intervalId) window.clearInterval(intervalId);
});
