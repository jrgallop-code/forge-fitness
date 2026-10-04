import { isProgressiveOverloadEnabled, setProgressiveOverloadEnabled } from '../core/progressive-overload-preferences.js?v=progressive-overload-toggle-1';

export function renderProgressiveOverloadSettings() {
  const enabled = isProgressiveOverloadEnabled();
  return `<section class="dashboard-welcome app-feature-settings-header"><div>
    <button class="nutrition-planner-back" type="button" data-progression-settings-back>← More</button>
    <span class="eyebrow">WORKOUT PREFERENCES</span><h2>Progressive Overload</h2>
    <p>Choose whether Level Up suggests your next weight and rep targets.</p>
  </div></section>
  <section class="section-card app-feature-settings-card">
    <div class="progressive-overload-toggle-row"><div><strong>Progressive overload guidance</strong>
      <span>Suggested weight and rep targets before and during workouts</span></div>
      <label class="progressive-overload-switch"><input type="checkbox" role="switch" data-progression-enabled ${enabled ? 'checked' : ''}>
        <span aria-hidden="true"></span><span class="sr-only">Enable progressive overload guidance</span>
      </label>
    </div>
    <p class="app-feature-status" data-progression-status aria-live="polite">${enabled ? 'Guidance is on. Level Up suggests how to progress.' : 'Guidance is off. Choose your own weight and reps.'}</p>
    <p class="app-feature-data-note">Your programmed sets and rep ranges, previous results, workout logging and personal records remain available. Guidance is on by default and can be switched back on anytime.</p>
  </section>`;
}

export function initializeProgressiveOverloadSettings({ onBack } = {}) {
  if (!document.getElementById('progressive-overload-settings-style')) {
    const link = document.createElement('link');
    link.id = 'progressive-overload-settings-style';
    link.rel = 'stylesheet';
    link.href = new URL('../../css/progressive-overload-settings.css?v=progressive-overload-toggle-1', import.meta.url).href;
    document.head.appendChild(link);
  }
  document.querySelector('[data-progression-settings-back]')?.addEventListener('click', () => onBack?.());
  const toggle = document.querySelector('[data-progression-enabled]');
  const status = document.querySelector('[data-progression-status]');
  toggle?.addEventListener('change', () => {
    const requested = toggle.checked;
    const enabled = setProgressiveOverloadEnabled(requested);
    toggle.checked = enabled;
    if (status) status.textContent = enabled !== requested ? 'The setting could not be saved. Please try again.'
      : enabled ? 'Guidance is on. Level Up suggests how to progress.' : 'Guidance is off. Choose your own weight and reps.';
  });
}
