const TEST_SESSION_ID = "level-up-recap-debug-session";
const SESSION_STORAGE_KEY = "forge_workout_sessions";

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

function makeDemoSession() {
  return {
    id: TEST_SESSION_ID,
    planName: "Upper A",
    trainingDayName: "Upper A",
    completedAt: new Date().toISOString(),
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
      },
      {
        exerciseId: "dumbbell-lateral-raise",
        trackingType: "reps",
        sets: [
          { weight: 20, reps: 15, completed: true },
          { weight: 20, reps: 14, completed: true }
        ]
      }
    ]
  };
}

function triggerRecapPreview() {
  const existing = readSessions().filter(session => session?.id !== TEST_SESSION_ID);
  const demo = makeDemoSession();
  writeSessions([...existing, demo]);

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
    writeSessions(readSessions().filter(session => session?.id !== TEST_SESSION_ID));
  }, 1500);
}

function ensureButton() {
  const onWorkoutPage = Boolean(document.querySelector("[data-workout-home], .workout-page"));
  let button = document.querySelector("[data-direct-recap-preview]");

  if (!onWorkoutPage) {
    button?.remove();
    return;
  }

  if (button) return;

  button = document.createElement("button");
  button.type = "button";
  button.dataset.directRecapPreview = "true";
  button.textContent = "Preview Workout Complete";
  button.setAttribute("aria-label", "Preview workout complete celebration");
  Object.assign(button.style, {
    position: "fixed",
    right: "16px",
    bottom: "90px",
    zIndex: "99998",
    minHeight: "50px",
    padding: "0 18px",
    borderRadius: "999px",
    border: "1px solid #2f7df6",
    background: "#0f172a",
    color: "#93c5fd",
    fontWeight: "800",
    boxShadow: "0 8px 28px rgba(0,0,0,.45)",
    cursor: "pointer"
  });
  button.addEventListener("click", triggerRecapPreview);
  document.body.appendChild(button);
}

const observer = new MutationObserver(ensureButton);
observer.observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("focus", ensureButton);
document.addEventListener("visibilitychange", () => { if (!document.hidden) ensureButton(); });
window.setTimeout(ensureButton, 0);
