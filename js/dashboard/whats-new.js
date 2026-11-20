const RELEASE_VERSION = "1.0.7";
const VIEW_KEY = "level_up_whats_new_seen_ios_" + RELEASE_VERSION;
const TRAINING_PREFERENCES_KEY = "level_up_training_preferences";
const MAX_VIEWS = 1;
const isIOS = () => window.Capacitor?.getPlatform?.() === "ios" && window.Capacitor?.isNativePlatform?.() === true;

const ICONS = {
  health: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8c0 4.3-5.8 8.7-8.8 11.4C9 16.7 3.2 12.3 3.2 8A4.5 4.5 0 0 1 12 6.2 4.5 4.5 0 0 1 20.8 8Z"/></svg>',
  workout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h3v6H3zM6 7h3v10H6zM9 11h6v2H9zM15 7h3v10h-3zM18 9h3v6h-3z"/></svg>',
  calculator: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8v3H8zM8 13h2m4 0h2m-8 4h2"/></svg>',
  polish: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.3 7.7L22 12l-7.7 2.3L12 22l-2.3-7.7L2 12l7.7-2.3L12 2Z"/><path d="m19 2 .8 2.2L22 5l-2.2.8L19 8l-.8-2.2L16 5l2.2-.8L19 2Z"/></svg>'
};
const CHANGES = [
  ["health", "Apple Health integration", "View your steps and sleep from Apple Health in Level Up."],
  ["quick", "Meet Quick Log", "Tap the new red + button to jump straight into logging workouts, food, and nutrition. Find Smart Build, manual workouts, imports, and photo logging in one place."],
  ["calculator", "Gym Tools", "Open the original visual Plate Calculator with bar options, convert kg and lb, plan warm-up sets, estimate 1RM, or use the lock-screen stopwatch."],
  ["workout", "Better active workouts", "Remove an exercise from your current session without changing your saved routine."],
  ["polish", "A smoother experience", "Refined navigation, clearer Arctic icons, and smaller interface improvements across the app."]
];

function alreadySeen() {
  try { return localStorage.getItem(VIEW_KEY) === "1"; }
  catch { return memorySeen; }
}
let memorySeen = false;
function markSeen() {
  memorySeen = true;
  try { localStorage.setItem(VIEW_KEY, "1"); } catch {}
}
function isOnboarded() {
  try {
    const preferences = JSON.parse(localStorage.getItem(TRAINING_PREFERENCES_KEY) || "null");
    return Boolean(preferences?.onboardingComplete || preferences?.onboardingSkipped);
  } catch { return false; }
}

function featureIcon(key) {
  return key === "quick"
    ? '<span class="whats-new-plus" aria-hidden="true">+</span>'
    : ICONS[key];
}

function quickLogPreview() {
  return '<div class="whats-new-quick-preview" aria-label="Quick Log shortcuts preview">' +
    '<div class="whats-new-preview-top"><span class="whats-new-preview-handle"></span><b>Quick Log</b></div>' +
    '<div class="whats-new-preview-row"><span>▣</span> Workout <small>Smart Build · Manual · Import</small></div>' +
    '<div class="whats-new-preview-row"><span>◉</span> Nutrition <small>Food · Barcode · Photo</small></div>' +
    '<span class="whats-new-preview-action" aria-hidden="true">+</span>' +
    '</div>';
}

function renderCard([key, heading, description]) {
  return '<article class="whats-new-card' + (key === "quick" ? ' whats-new-featured' : '') + '">' +
    '<span class="whats-new-card-icon">' + featureIcon(key) + '</span>' +
    '<div class="whats-new-card-copy"><h3>' + heading + '</h3><p>' + description + '</p></div>' +
    (key === "quick" ? quickLogPreview() : '') + '</article>';
}

export function openWhatsNew({ force = false } = {}) {
  if (!isIOS()) return false;
  if (document.querySelector(".whats-new-overlay")) return true;
  if (!force && (!isOnboarded() || alreadySeen())) return false;

  const overlay = document.createElement("section");
  overlay.className = "whats-new-overlay whats-new-ios";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "whats-new-title");
  overlay.innerHTML = '<div class="whats-new-shell">' +
    '<header class="whats-new-hero">' +
    '<span class="whats-new-brand"><img class="whats-new-logo" src="assets/level-up-logo.svg" alt=""> LEVEL UP</span>' +
    '<button type="button" class="whats-new-close" data-whats-new-close aria-label="Close What\'s New">×</button>' +
    '<div class="whats-new-eyebrow">NEW IN LEVEL UP</div>' +
    '<h2 id="whats-new-title">What\'s New</h2>' +
    '<span class="whats-new-version">Version ' + RELEASE_VERSION + '</span>' +
    '<p>A faster, more connected way to track your training and nutrition.</p>' +
    '</header>' +
    '<div class="whats-new-grid">' + CHANGES.map(renderCard).join("") + '</div>' +
    '<div class="whats-new-free-note">Level Up is free for everyone.</div>' +
    '<footer class="whats-new-footer"><button class="whats-new-done" type="button" data-whats-new-close>Continue to Level Up</button></footer>' +
    '</div>';

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.body.appendChild(overlay);
  const previouslyFocused = document.activeElement;
  const close = () => {
    if (!overlay.isConnected) return;
    document.removeEventListener("keydown", onKeydown);
    overlay.remove();
    document.body.style.overflow = previousOverflow;
    markSeen();
    previouslyFocused?.focus?.();
  };
  const onKeydown = event => { if (event.key === "Escape") close(); };
  document.addEventListener("keydown", onKeydown);
  overlay.querySelectorAll("[data-whats-new-close]").forEach(button => button.addEventListener("click", close));
  requestAnimationFrame(() => overlay.querySelector(".whats-new-close")?.focus());
  return true;
}
export function showWhatsNewIfEligible() { return openWhatsNew(); }
export { VIEW_KEY, MAX_VIEWS, RELEASE_VERSION };
