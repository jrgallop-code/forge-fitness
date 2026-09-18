import { isRestTimerGameEnabled, setRestTimerGameEnabled } from "../workouts/rest-timer-game.js?v=protein-run-4";

export function renderRestTimerGameSettings() {
  const enabled = isRestTimerGameEnabled();
  return `<section class="dashboard-welcome app-feature-settings-header"><div>
    <button class="nutrition-planner-back" type="button" data-rest-game-back>← More</button>
    <span class="eyebrow">WORKOUT PREFERENCES</span>
    <h2>Rest Timer Games</h2>
    <p>Optional 8-bit games you can play while the real rest timer keeps running.</p>
  </div></section>
  <section class="section-card app-feature-settings-card">
    <div class="adaptive-toggle-row"><div><strong>Show Rest Timer Games</strong><span>Add Protein Run and Gym Chopper to active rest timers</span></div>
      <label class="adaptive-switch"><input type="checkbox" data-rest-game-toggle ${enabled ? "checked" : ""}><span aria-hidden="true"></span><span class="sr-only">Show games during rest timers</span></label>
    </div>
    <p class="app-feature-status" data-rest-game-status>${enabled ? "Both game options appear during active rest timers." : "Rest timer games are hidden."}</p>
    <p class="app-feature-data-note"><strong>Your timer stays in control.</strong> Choose Protein Run or Gym Chopper. Playing, pausing or closing either game never changes the workout countdown or lock-screen alert.</p>
  </section>`;
}

export function initializeRestTimerGameSettings({ onBack } = {}) {
  document.querySelector("[data-rest-game-back]")?.addEventListener("click", () => onBack?.());
  const toggle = document.querySelector("[data-rest-game-toggle]");
  const status = document.querySelector("[data-rest-game-status]");
  toggle?.addEventListener("change", () => {
    const enabled = setRestTimerGameEnabled(toggle.checked);
    if (status) status.textContent = enabled
      ? "Both game options appear during active rest timers."
      : "Rest timer games are hidden.";
  });
}
