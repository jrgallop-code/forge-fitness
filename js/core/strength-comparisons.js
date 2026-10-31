// Optional external comparisons. Personal records never depend on this setting.
export const STRENGTH_COMPARISONS_KEY = 'level_up_strength_comparisons';
export const STRENGTH_COMPARISONS_EVENT = 'strength-comparisons-changed';
const endpoint = 'https://fitnessvolt.com/wp-json/fvss/v1/percentile';
const tiers = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];
const requests = new Map();
export function strengthComparisonsEnabled() {
  try { return localStorage.getItem(STRENGTH_COMPARISONS_KEY) === 'true'; } catch { return false; }
}
export function setStrengthComparisonsEnabled(enabled) {
  localStorage.setItem(STRENGTH_COMPARISONS_KEY, String(Boolean(enabled)));
  window.dispatchEvent(new CustomEvent(STRENGTH_COMPARISONS_EVENT));
}
// Deliberately exact: never rank dumbbells, Smith machines or assisted variants
// using barbell standards, or infer equipment from a partial name match.
export function comparisonLift(name) {
  return ({'bench press':'bench-press','barbell bench press':'bench-press',
    'barbell flat bench press':'bench-press','back squat':'squat','barbell back squat':'squat',
    'barbell squat':'squat','deadlift':'deadlift','barbell deadlift':'deadlift',
    'conventional deadlift':'deadlift','barbell conventional deadlift':'deadlift',
    'overhead press':'overhead-press','barbell overhead press':'overhead-press',
    'standing barbell overhead press':'overhead-press','barbell standing shoulder press':'overhead-press'})[String(name || '').trim().toLowerCase()] || null;
}
export function comparisonInput(item, profile) {
  const lift = comparisonLift(item.name), bodyweight = Number(profile?.weightLb) || Number(profile?.weightKg) * 2.2046226218;
  const weight = Number(item.estimatedOneRepMax);
  if (item.comparisonEligible === false || !lift || !['male','female'].includes(profile?.sex) || !Number.isFinite(bodyweight) || bodyweight <= 0 ||
      !Number.isFinite(weight) || weight <= 0 || !(item.reps >= 1 && item.reps <= 12)) return null;
  const input = {lift, weight, reps:1, bodyweight, sex:profile.sex, unit:'lb'};
  const age = Number(profile.age);
  if (Number.isFinite(age) && age >= 10 && age <= 90) input.age = age;
  return input;
}
export function parseGymComparison(data) {
  const gym = data?.gym;
  // Never silently substitute competition data or the headline fv_score.
  if (data?.success !== true || !gym || !tiers.includes(gym.tier) ||
      !Number.isFinite(gym.percentile) || gym.percentile < 0 || gym.percentile > 100 ||
      !(gym.sample_size >= 30)) return null;
  return {tier:gym.tier, percentile:gym.percentile, sampleSize:gym.sample_size,
    source:'Self-reported gym lifters', tierIndex:tiers.indexOf(gym.tier)};
}
export async function getGymComparison(item, profile) {
  if (!strengthComparisonsEnabled()) return null;
  const input = comparisonInput(item, profile);
  if (!input) return null;
  const key = JSON.stringify(input);
  if (!requests.has(key)) {
    const request = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      try {
        const response = await fetch(endpoint, {method:'POST', headers:{'Content-Type':'application/json'},
          body:key, signal:controller.signal, credentials:'omit', referrerPolicy:'no-referrer'});
        return response.ok ? parseGymComparison(await response.json()) : null;
      } catch { return null; } finally { clearTimeout(timeout); }
    })();
    requests.set(key, request);
    // Cache successful responses in memory only; failures can retry next recap.
    request.then(value => { if (!value) requests.delete(key); });
  }
  const result = await requests.get(key);
  return strengthComparisonsEnabled() ? result : null;
}
export function renderStrengthComparisonSettings() {
  return `<section class="section-card"><span class="eyebrow">PREFERENCES</span><h2>Strength comparisons</h2>
    <p>Choose whether to see how your lifts compare with other lifters.</p>
    <label style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0">
      <span><strong>Show strength comparisons</strong><br><small>Optional ratings on supported lifts and workout completion cards.</small></span>
      <input type="checkbox" role="switch" data-strength-comparisons-toggle ${strengthComparisonsEnabled()?'checked':''}>
    </label><p>Off by default. Turning this off hides comparison levels, percentiles and comparison targets. Your personal records, estimated 1RM and training history stay visible.</p>
    <p>When enabled, supported lift estimates, bodyweight, sex and available age are sent to FitnessVolt for comparison. Your name and workout history are not sent.</p>
    <p>Completion cards show a compact gym-lifter rating only. These ratings describe individual lifts, not your experience or worth.</p>
    <a href="https://fitnessvolt.com/strength-standards/" target="_blank" rel="noopener">Strength standards data by FitnessVolt</a>
    <p data-strength-comparisons-status role="status"></p>
    <button type="button" class="secondary-btn" data-strength-comparisons-back>Back to More</button></section>`;
}
export function initializeStrengthComparisonSettings(root, back) {
  root.querySelector('[data-strength-comparisons-toggle]')?.addEventListener('change', event => {
    try {
      setStrengthComparisonsEnabled(event.target.checked);
      root.querySelector('[data-strength-comparisons-status]').textContent = event.target.checked ? 'Strength comparisons are on.' : 'Strength comparisons are off. Your own progress stays visible.';
    } catch {
      event.target.checked = strengthComparisonsEnabled();
      root.querySelector('[data-strength-comparisons-status]').textContent = 'Could not save this preference. Please try again.';
    }
  });
  root.querySelector('[data-strength-comparisons-back]')?.addEventListener('click', back);
}
