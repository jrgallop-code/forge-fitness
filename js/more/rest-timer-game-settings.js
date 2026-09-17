import { isRestTimerGameEnabled, setRestTimerGameEnabled } from "../workouts/rest-timer-game.js?v=protein-run-1";

export function renderRestTimerGameSettings() {
  const enabled = isRestTimerGameEnabled();
  return `<section class="dashboard-welcome app-feature-settings-header"><div>
    <button class="nutrition-planner-back" type="button" data-rest-game-back>← More</button>
    <span class="eyebrow">WORKOUT PREFERENCES</span>
    <h2>Protein Run</h2>
    <p>An optional 8-bit maze game you can play while the real rest timer keeps running.</p>
  </div></section>
  <section class="section-card app-feature-settings-card">
    <div class="adaptive-toggle-row"><div><strong>Show Protein Run</strong><span>Add a Play Protein Run button to active rest timers</span></div>
      <label class="adaptive-switch"><input type="checkbox" data-rest-game-toggle ${enabled ? "checked" : ""}><span aria-hidden="true"></span><span class="sr-only">Show Protein Run during rest timers</span></label>
    </div>
    <p class="app-feature-status" data-rest-game-status>${enabled ? "The game button appears during active rest timers." : "The game is hidden from rest timers."}</p>
    <p class="app-feature-data-note"><strong>Your timer stays in control.</strong> Playing, pausing or closing the game never changes the workout countdown or lock-screen alert.</p>
  </section>`;
}

export function initializeRestTimerGameSettings({ onBack } = {}) {
  document.querySelector("[data-rest-game-back]")?.addEventListener("click", () => onBack?.());
  const toggle = document.querySelector("[data-rest-game-toggle]");
  const status = document.querySelector("[data-rest-game-status]");
  toggle?.addEventListener("change", () => {
    const enabled = setRestTimerGameEnabled(toggle.checked);
    if (status) status.textContent = enabled
      ? "The game button appears during active rest timers."
      : "The game is hidden from rest timers.";
  });
}

