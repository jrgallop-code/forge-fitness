const SESSION_STORAGE_KEY = "forge_workout_sessions";
const PREVIEW_ID = "level-up-recap-preview-session";

function readSessions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessions(sessions) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
}

function demoSession() {
  const completedAt = new Date().toISOString();
  return {
    id: PREVIEW_ID,
    planName: "Upper A",
    trainingDayName: "Upper A",
    completedAt,
    durationMs: 52 * 60 * 1000 + 14 * 1000,
    exercises: [
      {
        exerciseId: "dumbbell-bench-press",
        trackingType: "reps",
        sets: [
          { weight: 70, reps: 12, completed: true },
          { weight: 70, reps: 11, completed: true },
          { weight: 65, reps: 12, completed: true }
        ]
      },
      {
        exerciseId: "incline-dumbbell-press",
        trackingType: "reps",
        sets: [
          { weight: 55, reps: 12, completed: true },
          { weight: 55, reps: 10, completed: true },
          { weight: 50, reps: 12, completed: true }
        ]
      }
    ]
  };
}

function ensurePreviewButton() {
  const home = document.querySelector("[data-workout-home]");
  if (!home || home.querySelector("[data-recap-preview-button]")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary-btn";
  button.dataset.recapPreviewButton = "true";
  button.textContent = "Preview Workout Complete";
  button.style.width = "100%";
  button.style.margin = "12px 0";
  button.style.minHeight = "48px";
  button.style.borderColor = "#2f7df6";
  button.style.color = "#7db4ff";

  const anchor = home.querySelector("[data-smart-build-launcher]") || home.firstElementChild;
  if (anchor) anchor.insertAdjacentElement("afterend", button);
  else home.prepend(button);
}

function triggerPreview() {
  const existing = readSessions().filter(session => session?.id !== PREVIEW_ID);
  const latest = [...existing]
    .filter(session => session?.completedAt)
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];

  const preview = latest || demoSession();
  let wroteDemo = false;
  if (!latest) {
    writeSessions([...existing, preview]);
    wroteDemo = true;
  }

  const logger = document.createElement("div");
  logger.id = "workout-session-logger";
  logger.style.display = "none";
  const saveButton = document.createElement("button");
  saveButton.id = "save-session-btn";
  logger.appendChild(saveButton);
  document.body.appendChild(logger);
  saveButton.click();

  window.setTimeout(() => {
    logger.remove();
    if (wroteDemo) {
      writeSessions(readSessions().filter(session => session?.id !== PREVIEW_ID));
    }
  }, 1200);
}

document.addEventListener("click", event => {
  if (event.target.closest?.("[data-recap-preview-button]")) {
    event.preventDefault();
    triggerPreview();
  }
});

const observer = new MutationObserver(ensurePreviewButton);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.setTimeout(ensurePreviewButton, 0);
window.addEventListener("focus", ensurePreviewButton);
