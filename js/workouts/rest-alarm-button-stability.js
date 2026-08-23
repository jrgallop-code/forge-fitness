import { getExerciseById } from "./exercise-library.js?v=exercise-library-3";
import { openActiveWorkout } from "./workout-session.js?v=drop-sets-6";

const BANNER_ID = "level-up-rest-alarm-banner";
const FIX_MARKER = "buttonStabilityFixed";
const ACTIVE_WORKOUT_STORAGE_KEY = "level_up_active_workout";
const GLOBAL_STYLE_ID = "level-up-global-rest-banner-style";

let lastGlobalSignature = "";
let lastAlarmSignature = "";
let alarmAudioContext = null;

function getActive() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY) || "null");
    return parsed && parsed.status === "in_progress" ? parsed : null;
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

function formatCountdown(ms) {
  const seconds = Math.max(0, Math.ceil(Number(ms || 0) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function getNextSet(active) {
  if (!active || !Array.isArray(active.exercises)) return null;

  const startExercise = Math.max(0, Number(active.currentExerciseIndex) || 0);
  const startSet = Math.max(-1, Number(active.currentSetIndex));

  for (let exerciseIndex = startExercise; exerciseIndex < active.exercises.length; exerciseIndex += 1) {
    const sets = active.exercises[exerciseIndex]?.sets;
    if (!Array.isArray(sets)) continue;
    const firstSet = exerciseIndex === startExercise ? Math.max(0, startSet + 1) : 0;
    for (let setIndex = firstSet; setIndex < sets.length; setIndex += 1) {
      if (!sets[setIndex]?.completed) return { exerciseIndex, setIndex };
    }
  }

  for (let exerciseIndex = 0; exerciseIndex < active.exercises.length; exerciseIndex += 1) {
    const sets = active.exercises[exerciseIndex]?.sets;
    if (!Array.isArray(sets)) continue;
    const setIndex = sets.findIndex(set => !set?.completed);
    if (setIndex >= 0) return { exerciseIndex, setIndex };
  }

  return null;
}

function getNextContext(active) {
  const next = getNextSet(active);
  if (!next) {
    return {
      done: true,
      title: "All planned sets are complete",
      detail: "Review the workout when you are ready."
    };
  }

  const planned = active?.planSnapshot?.days?.[Number(active.trainingDayIndex) || 0]?.exercises?.[next.exerciseIndex];
  const state = active?.exercises?.[next.exerciseIndex];
  const exerciseId = planned?.id || state?.exerciseId || state?.id;
  const exerciseName = getExerciseById(exerciseId)?.name || planned?.name || state?.name || "Next exercise";
  const reps = String(planned?.reps || "").trim();

  return {
    ...next,
    done: false,
    title: `${exerciseName} · Set ${next.setIndex + 1}`,
    detail: reps ? `Target ${reps} reps` : "Next working set"
  };
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

function ensureGlobalStyle() {
  if (document.getElementById(GLOBAL_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = GLOBAL_STYLE_ID;
  style.textContent = `
    #${BANNER_ID} {
      top: calc(env(safe-area-inset-top) + 8px) !important;
      bottom: auto !important;
      z-index: 5000 !important;
      touch-action: manipulation;
    }
    @media (max-width: 390px) {
      #${BANNER_ID} {
        top: calc(env(safe-area-inset-top) + 6px) !important;
        bottom: auto !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function getAlarmAudioContext() {
  if (alarmAudioContext) return alarmAudioContext;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  alarmAudioContext = new AudioCtx();
  return alarmAudioContext;
}

function unlockAlarmAudio() {
  const context = getAlarmAudioContext();
  if (context?.state === "suspended") context.resume().catch(() => {});
}

function playProlongedRestAlarm() {
  const context = getAlarmAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    context.resume().then(playProlongedRestAlarm).catch(() => {});
    return;
  }

  const start = context.currentTime + 0.55;
  const tones = [
    [0.00, 660, 0.40],
    [0.65, 880, 0.40],
    [1.30, 660, 0.40],
    [1.95, 880, 0.40],
    [2.60, 660, 0.40],
    [3.25, 880, 0.40],
    [3.90, 660, 0.40],
    [4.55, 880, 0.58]
  ];

  tones.forEach(([offset, frequency, duration], index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, start + offset);
    gain.gain.setValueAtTime(0.0001, start + offset);
    gain.gain.exponentialRampToValueAtTime(index === tones.length - 1 ? 0.16 : 0.12, start + offset + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start + offset);
    oscillator.stop(start + offset + duration + 0.03);
  });
}

function installBannerStabilityFix() {
  const banner = document.getElementById(BANNER_ID);
  if (!banner || banner.dataset[FIX_MARKER] === "true") return;

  const htmlDescriptor =
    Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML") ||
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerHTML");

  if (htmlDescriptor?.get && htmlDescriptor?.set) {
    let lastAssignedHtml = htmlDescriptor.get.call(banner);
    Object.defineProperty(banner, "innerHTML", {
      configurable: true,
      get() {
        return htmlDescriptor.get.call(this);
      },
      set(value) {
        const nextHtml = String(value ?? "");
        if (nextHtml === lastAssignedHtml) return;
        lastAssignedHtml = nextHtml;
        htmlDescriptor.set.call(this, nextHtml);
      }
    });
  }

  const hiddenDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "hidden");
  if (hiddenDescriptor?.get && hiddenDescriptor?.set) {
    Object.defineProperty(banner, "hidden", {
      configurable: true,
      get() {
        return hiddenDescriptor.get.call(this);
      },
      set(value) {
        const active = getActive();
        if (value === true && active?.restTimer) {
          hiddenDescriptor.set.call(this, false);
          return;
        }
        hiddenDescriptor.set.call(this, Boolean(value));
      }
    });
  }

  banner.dataset[FIX_MARKER] = "true";
  banner.style.touchAction = "manipulation";

  banner.addEventListener("click", event => {
    const button = event.target.closest("button[data-rest-action]");
    if (!button || button.dataset.restAction !== "next") return;
    if (document.getElementById("workout-session-logger")) return;

    const active = getActive();
    document.querySelector('.nav-btn[data-page="workout"]')?.click();
    if (!getNextSet(active)) openActiveWorkout();
  }, true);
}

function renderGlobalBanner() {
  const banner = document.getElementById(BANNER_ID);
  const active = getActive();
  const timer = active?.restTimer;

  if (!banner || !active || !timer) {
    lastGlobalSignature = "";
    return;
  }

  const ms = remainingMs(timer);
  const complete = timer.status === "finished" || (timer.status !== "paused" && ms <= 0);
  const alarmSignature = `${timer.endAt || timer.durationSeconds || "timer"}|${active.currentExerciseIndex}|${active.currentSetIndex}`;
  if (complete && alarmSignature !== lastAlarmSignature) {
    lastAlarmSignature = alarmSignature;
    playProlongedRestAlarm();
  }

  // On the Workout logger, the original Phase 1 renderer still owns the
  // detailed banner content. This module only keeps it pinned at the top.
  if (document.getElementById("workout-session-logger")) {
    banner.hidden = false;
    lastGlobalSignature = "";
    return;
  }

  const paused = timer.status === "paused";
  const context = getNextContext(active);
  const signature = [timer.status, Math.ceil(ms / 1000), context.title, context.detail].join("|");
  if (signature === lastGlobalSignature) {
    banner.hidden = false;
    return;
  }
  lastGlobalSignature = signature;

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
          <div class="rest-alarm-detail"><span>${escapeHtml(context.detail)}</span></div>
        </div>
        <div class="rest-alarm-time">READY</div>
      </div>
      <div class="rest-alarm-controls">
        <button class="rest-alarm-primary" type="button" data-rest-action="next">${context.done ? "Review" : "Start Next Set"}</button>
        <button type="button" data-rest-action="plus30">+30 sec</button>
        <button type="button" data-rest-action="plus15">+15 sec</button>
        <button type="button" data-rest-action="skip">Dismiss</button>
      </div>
    `;
    return;
  }

  banner.innerHTML = `
    <div class="rest-alarm-top">
      <div class="rest-alarm-copy">
        <span class="rest-alarm-kicker">${paused ? "REST PAUSED" : "REST TIMER"}</span>
        <strong class="rest-alarm-next">Next: ${escapeHtml(context.title)}</strong>
        <div class="rest-alarm-detail"><span>${escapeHtml(context.detail)}</span></div>
      </div>
      <div class="rest-alarm-time">${formatCountdown(ms)}</div>
    </div>
    <div class="rest-alarm-controls">
      <button type="button" data-rest-action="minus15">−15 sec</button>
      <button class="rest-alarm-primary" type="button" data-rest-action="pause">${paused ? "Resume" : "Pause"}</button>
      <button type="button" data-rest-action="plus15">+15 sec</button>
      <button type="button" data-rest-action="skip">Skip Rest</button>
    </div>
  `;
}

ensureGlobalStyle();
installBannerStabilityFix();
document.addEventListener("pointerdown", unlockAlarmAudio, { capture: true });
document.addEventListener("touchstart", unlockAlarmAudio, { capture: true, passive: true });

if (!document.getElementById(BANNER_ID)) {
  const observer = new MutationObserver(() => {
    if (!document.getElementById(BANNER_ID)) return;
    installBannerStabilityFix();
    renderGlobalBanner();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

window.setInterval(renderGlobalBanner, 250);
window.addEventListener("focus", renderGlobalBanner);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderGlobalBanner();
});
renderGlobalBanner();
