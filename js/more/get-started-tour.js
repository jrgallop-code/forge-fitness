const TOUR_STEPS = [
  {
    eyebrow: "WELCOME",
    title: "Learn the Level Up workflow",
    description: "Level Up is built around one simple training loop: plan your work, train with intent, track what happened, then adjust from real data.",
    narration: "Welcome to Level Up. The app is designed around a simple process. Build your training plan, log your workouts, track your progress, and make adjustments based on what your data shows.",
    visual: `
      <div class="get-started-flow" aria-label="Plan, train, track, adjust">
        <div><span>01</span><strong>PLAN</strong><small>Choose how you want to train.</small></div>
        <i aria-hidden="true"></i>
        <div><span>02</span><strong>TRAIN</strong><small>Log the work you actually do.</small></div>
        <i aria-hidden="true"></i>
        <div><span>03</span><strong>TRACK</strong><small>See strength, volume and recovery.</small></div>
        <i aria-hidden="true"></i>
        <div><span>04</span><strong>ADJUST</strong><small>Use the data to guide the next step.</small></div>
      </div>`,
    action: { label: "Open Dashboard", page: "home" }
  },
  {
    eyebrow: "YOUR SETUP",
    title: "Tell Level Up what you are training for",
    description: "Your profile gives Smart Build and the rest of the app useful context about your goals, availability and exercise preferences.",
    narration: "Start with your goals and profile. Set your main training goal, how often you can train, the muscles you want to prioritize, and any exercises you prefer to avoid. You can come back and change these settings whenever your goals change.",
    visual: `
      <div class="get-started-profile-preview">
        <div><span>PRIMARY GOAL</span><strong>Build Muscle</strong></div>
        <div><span>TRAINING DAYS</span><strong>4 days / week</strong></div>
        <div><span>PRIORITY</span><strong>Chest · Back · Arms</strong></div>
        <div><span>PREFERENCES</span><strong>Exercise choices saved</strong></div>
      </div>`,
    action: { label: "Open My Profile", event: "levelup:open-profile-setup" }
  },
  {
    eyebrow: "BUILD YOUR PROGRAM",
    title: "Choose the planning style that fits you",
    description: "You can let Level Up build a plan, start from a template, or control every exercise yourself.",
    narration: "There are three ways to build your program. Smart Build creates a plan around your goals and training schedule. Templates give you a ready made starting point. Manual Build lets you choose every day, exercise, set, and rep target yourself.",
    visual: `
      <div class="get-started-build-grid">
        <div class="featured"><span>RECOMMENDED</span><strong>Smart Build</strong><small>Built around your goals and schedule.</small></div>
        <div><strong>Templates</strong><small>Start with a ready-made routine.</small></div>
        <div><strong>Manual Build</strong><small>Choose everything yourself.</small></div>
      </div>`,
    action: { label: "Open Workout", page: "workout" }
  },
  {
    eyebrow: "TRAIN",
    title: "Log one exercise at a time",
    description: "Your workout logger keeps the important information close: previous performance, today's load, target reps and the sets you complete.",
    narration: "When you start a workout, Level Up focuses on one exercise at a time. You can see your previous performance, record today's weight and reps, use optional warm up guidance, open the Form Guide, swap an exercise, or create supersets when needed. Swipe through the workout as you go.",
    visual: `
      <div class="get-started-logger-preview">
        <div class="get-started-logger-head"><span>EXERCISE 2 OF 6</span><strong>Barbell Bench Press</strong><small>Target 8–12 reps</small></div>
        <div class="get-started-set-row get-started-set-labels"><span>SET</span><span>PREVIOUS</span><span>TODAY</span></div>
        <div class="get-started-set-row"><span>1</span><span>185 × 11</span><strong>185 × 12</strong></div>
        <div class="get-started-set-row"><span>2</span><span>185 × 10</span><strong>185 × 11</strong></div>
        <div class="get-started-set-row"><span>3</span><span>185 × 9</span><strong>—</strong></div>
        <div class="get-started-swipe-hint">SWIPE FOR NEXT EXERCISE →</div>
      </div>`,
    action: { label: "Open Workout", page: "workout" }
  },
  {
    eyebrow: "PROGRESSIVE OVERLOAD",
    title: "Know when it may be time to progress",
    description: "Level Up compares what you do with your target rep range and your previous performance.",
    narration: "Level Up remembers your previous performance. When you reach the top of your target rep range across your planned sets, the app can prompt you to consider increasing the load. If performance falls below your target range, it can also suggest reducing the weight or adjusting the rep target.",
    visual: `
      <div class="get-started-progression-preview">
        <span class="get-started-status">TARGET RANGE COMPLETED</span>
        <strong>185 lb × 12 · 12 · 12</strong>
        <div class="get-started-arrow" aria-hidden="true">↓</div>
        <div class="get-started-prompt"><span>NEXT WORKOUT</span><strong>Consider increasing the load</strong><small>Start near the lower end of the suggested increase.</small></div>
      </div>`,
    action: { label: "Open Workout", page: "workout" }
  },
  {
    eyebrow: "TRACK",
    title: "Your training history becomes your dashboard",
    description: "The more consistently you log, the more useful Level Up becomes for spotting patterns in training.",
    narration: "Your Progress area brings your training data together. Review strength trends, weekly training volume, muscle group volume, personal records, workout history, and your plan target map. The goal is not more data for its own sake. It is to make your training easier to understand.",
    visual: `
      <div class="get-started-metric-grid">
        <div><span>STRENGTH TREND</span><strong>↗ 4.8%</strong><small>Estimated strength</small></div>
        <div><span>WEEKLY SETS</span><strong>62</strong><small>Working sets</small></div>
        <div><span>WORKOUTS</span><strong>4 / 4</strong><small>This week</small></div>
        <div><span>RECENT PRs</span><strong>3</strong><small>New bests</small></div>
      </div>`,
    action: { label: "Open Progress", page: "progress" }
  },
  {
    eyebrow: "RECOVERY & CALORIES",
    title: "Connect training with recovery and body-weight goals",
    description: "Recovery helps visualize recently trained muscle groups, while Calories supports cutting, maintaining or gaining phases.",
    narration: "Level Up also connects your training with recovery and nutrition. The Recovery view shows recently trained muscle groups across the front and back anatomy maps. In Calories, you can set a phase for fat loss, maintenance, or muscle gain and follow your weight trend over time.",
    visual: `
      <div class="get-started-recovery-preview">
        <div class="get-started-recovery-card"><span>RECOVERY</span><div class="get-started-body-pair"><i></i><i></i></div><strong>Muscle recovery map</strong><small>Front + back training status</small></div>
        <div class="get-started-calorie-card"><span>CALORIE PHASE</span><strong>Lean Gain</strong><div><small>Daily target</small><b>2,650 kcal</b></div><div><small>Weight trend</small><b>+0.3 lb/wk</b></div></div>
      </div>`,
    action: { label: "Open Calories", page: "energy" }
  },
  {
    eyebrow: "PROTECT YOUR DATA",
    title: "Back up Level Up before you need the backup",
    description: "Level Up is a PWA, so keeping a current backup gives you a safe way to restore or move your training history.",
    narration: "Finally, protect your training history. Level Up includes export, restore, and Google Drive backup tools. Keeping a recent backup makes it much easier to recover your data if you change devices, clear browser storage, or reinstall the app. Once that is set, you are ready to train.",
    visual: `
      <div class="get-started-backup-preview">
        <div class="get-started-cloud-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7.2 18.5h10.5a4.3 4.3 0 0 0 .4-8.6A6.4 6.4 0 0 0 6 8.2a5.2 5.2 0 0 0 1.2 10.3Z"/><path d="m9 13 3 3 4-5"/></svg></div>
        <strong>Your training data matters.</strong>
        <small>Export · Restore · Google Drive</small>
        <div class="get-started-ready">YOU'RE READY TO LEVEL UP</div>
      </div>`,
    action: { label: "Start Training", page: "workout" }
  }
];

const TOUR_ICON = `<svg class="app-silhouette-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h11.5a2.5 2.5 0 0 1 2.5 2.5v8.5H6.5A2.5 2.5 0 0 1 4 14V5.5Zm2 2v6.3c0 .4.3.7.7.7H16V8c0-.3-.2-.5-.5-.5H6Zm12 2.5 3-2v8l-3-2v-4Z"/></svg>`;

let currentStep = 0;
let narrationEnabled = true;
let started = false;
let activeUtterance = null;

function installTourCard(root = document) {
  const grid = root.querySelector?.(".more-menu-grid");
  if (!grid || grid.querySelector("[data-get-started-tour]")) return;

  const button = document.createElement("button");
  button.className = "more-menu-card get-started-menu-card";
  button.type = "button";
  button.dataset.getStartedTour = "";
  button.innerHTML = `<span class="more-menu-icon">${TOUR_ICON}</span><span><strong>How to Get Started</strong><small>Take a quick guided tour of Level Up and learn how to build, train and track your progress.</small></span><span class="get-started-menu-badge">GUIDED TOUR</span>`;
  button.addEventListener("click", openTour);
  grid.prepend(button);
}

function openTour() {
  stopNarration();
  currentStep = 0;
  started = false;
  const content = document.getElementById("content");
  if (!content) return;
  content.innerHTML = renderIntro();
  bindTourControls();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderIntro() {
  return `
    <section class="get-started-tour get-started-intro" aria-label="How to Get Started">
      <header class="get-started-topbar">
        <button type="button" class="get-started-back" data-tour-exit>← More</button>
        <span>HOW TO GET STARTED</span>
      </header>
      <div class="get-started-intro-card">
        <div class="get-started-mark" aria-hidden="true">LU</div>
        <span class="eyebrow">LEVEL UP GUIDED TOUR</span>
        <h2>Learn the app in a few minutes.</h2>
        <p>See how Level Up fits together — from building your plan to progressing your lifts, understanding recovery and protecting your data.</p>
        <div class="get-started-intro-flow"><span>PLAN</span><i></i><span>TRAIN</span><i></i><span>TRACK</span><i></i><span>ADJUST</span></div>
        <div class="get-started-audio-choice">
          <button type="button" data-tour-audio aria-pressed="${narrationEnabled}">${speakerIcon()}<span><strong>Voice narration ${narrationEnabled ? "ON" : "OFF"}</strong><small>${speechSupported() ? "Uses your device's built-in voice" : "Voice is not available on this device"}</small></span></button>
        </div>
        <button class="primary-btn get-started-begin" type="button" data-tour-start>Start Guided Tour</button>
        <small class="get-started-time">8 short sections · captions always included</small>
      </div>
    </section>`;
}

function renderStep() {
  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;
  return `
    <section class="get-started-tour" aria-label="How to Get Started">
      <header class="get-started-topbar">
        <button type="button" class="get-started-back" data-tour-exit>← More</button>
        <span>${currentStep + 1} OF ${TOUR_STEPS.length}</span>
        <button type="button" class="get-started-audio-toggle" data-tour-audio aria-pressed="${narrationEnabled}" aria-label="Turn voice narration ${narrationEnabled ? "off" : "on"}">${speakerIcon()}</button>
      </header>
      <div class="get-started-progress" aria-hidden="true"><span style="width:${progress}%"></span></div>
      <article class="get-started-step" aria-live="polite">
        <span class="eyebrow">${step.eyebrow}</span>
        <h2>${step.title}</h2>
        <p class="get-started-description">${step.description}</p>
        <div class="get-started-visual">${step.visual}</div>
        <div class="get-started-narration">
          <div><span>VOICE GUIDE</span><button type="button" data-tour-replay ${speechSupported() ? "" : "disabled"}>Replay</button></div>
          <p>${step.narration}</p>
        </div>
        ${step.action ? `<button class="get-started-show-me" type="button" data-tour-action>${step.action.label}<span aria-hidden="true">→</span></button>` : ""}
      </article>
      <footer class="get-started-footer">
        <button class="secondary-btn" type="button" data-tour-prev ${currentStep === 0 ? "disabled" : ""}>Back</button>
        <div class="get-started-dots" aria-label="Tour progress">${TOUR_STEPS.map((_, index) => `<i class="${index === currentStep ? "active" : ""}" aria-hidden="true"></i>`).join("")}</div>
        <button class="primary-btn" type="button" data-tour-next>${currentStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"}</button>
      </footer>
    </section>`;
}

function bindTourControls() {
  const content = document.getElementById("content");
  if (!content) return;

  content.querySelector("[data-tour-exit]")?.addEventListener("click", exitTour);
  content.querySelector("[data-tour-start]")?.addEventListener("click", () => {
    started = true;
    renderCurrentStep(true);
  });
  content.querySelectorAll("[data-tour-audio]").forEach(button => button.addEventListener("click", toggleNarration));
  content.querySelector("[data-tour-replay]")?.addEventListener("click", () => speakCurrent(true));
  content.querySelector("[data-tour-prev]")?.addEventListener("click", () => changeStep(-1));
  content.querySelector("[data-tour-next]")?.addEventListener("click", () => {
    if (currentStep >= TOUR_STEPS.length - 1) {
      finishTour();
      return;
    }
    changeStep(1);
  });
  content.querySelector("[data-tour-action]")?.addEventListener("click", runCurrentAction);
}

function renderCurrentStep(shouldNarrate = false) {
  const content = document.getElementById("content");
  if (!content) return;
  content.innerHTML = renderStep();
  bindTourControls();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (shouldNarrate && narrationEnabled) speakCurrent();
}

function changeStep(delta) {
  stopNarration();
  currentStep = Math.max(0, Math.min(TOUR_STEPS.length - 1, currentStep + delta));
  renderCurrentStep(true);
}

function toggleNarration() {
  narrationEnabled = !narrationEnabled;
  if (!speechSupported()) narrationEnabled = false;
  stopNarration();

  if (!started) {
    const content = document.getElementById("content");
    if (content) {
      content.innerHTML = renderIntro();
      bindTourControls();
    }
    return;
  }

  renderCurrentStep(false);
  if (narrationEnabled) speakCurrent();
}

function speakCurrent(force = false) {
  if (!speechSupported() || (!narrationEnabled && !force)) return;
  stopNarration();
  const text = TOUR_STEPS[currentStep]?.narration;
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(voice => /^en(-|_)(CA|US|GB)/i.test(voice.lang) && voice.localService) ||
    voices.find(voice => /^en/i.test(voice.lang) && voice.localService) ||
    voices.find(voice => /^en/i.test(voice.lang));
  if (preferred) utterance.voice = preferred;
  utterance.rate = 0.96;
  utterance.pitch = 1;
  activeUtterance = utterance;
  utterance.addEventListener("end", () => { if (activeUtterance === utterance) activeUtterance = null; });
  utterance.addEventListener("error", () => { if (activeUtterance === utterance) activeUtterance = null; });
  window.speechSynthesis.speak(utterance);
}

function stopNarration() {
  if (!speechSupported()) return;
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel();
  activeUtterance = null;
}

function runCurrentAction() {
  const action = TOUR_STEPS[currentStep]?.action;
  if (!action) return;
  stopNarration();
  if (action.event) {
    document.dispatchEvent(new CustomEvent(action.event));
    return;
  }
  if (action.page) {
    document.querySelector(`.nav-btn[data-page="${action.page}"]`)?.click();
  }
}

function finishTour() {
  try { localStorage.setItem("level_up_get_started_tour_completed", new Date().toISOString()); } catch {}
  stopNarration();
  document.querySelector('.nav-btn[data-page="more"]')?.click();
}

function exitTour() {
  stopNarration();
  document.querySelector('.nav-btn[data-page="more"]')?.click();
}

function speechSupported() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

function speakerIcon() {
  return narrationEnabled && speechSupported()
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="M16 9.2c1.5 1.5 1.5 4.1 0 5.6M18.8 6.5c3 3 3 8 0 11"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="m17 9 4 6M21 9l-4 6"/></svg>';
}

const content = document.getElementById("content");
if (content) {
  installTourCard(content);
  new MutationObserver(() => installTourCard(content)).observe(content, { childList: true, subtree: true });
}
