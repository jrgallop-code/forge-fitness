import { openStandalonePlateCalculator } from "../workouts/plate-calculator.js?v=gym-tools-2";
import { massUnit, UNIT_KINDS } from "./unit-system.js?v=granular-units-1";
import { epley1RM, convertGymWeight } from "./gym-tools-math.js?v=gym-tools-1";

const TABS = [["plates", "Plates"], ["convert", "Convert"], ["warmup", "Warm-up"], ["oneRM", "1RM"], ["stopwatch", "Stopwatch"]];
let overlay = null;
let tab = "convert";
let unit = massUnit(UNIT_KINDS.LIFTING_WEIGHT) === "kg" ? "kg" : "lb";
let startTime = 0;
let elapsed = 0;
let timer = null;
const STOPWATCH_KEY = "gym-tools-stopwatch";
const nativeTimer = () => window.Capacitor?.Plugins?.LevelUpTimer;
const now = () => Date.now();
let previousFocus = null;
const convert = convertGymWeight;
const fmt = value => Number.isFinite(value) ? Number(value.toFixed(2)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—";
export function warmUpRamp(target, reps) {
  if (!Number.isFinite(target) || target <= 0) return [];
  // Low-fatigue illustrative ramp, not a prescription.
  const levels = [{ p: .4, reps: 8 }, { p: .6, reps: 5 }, { p: .75, reps: 3 }, { p: .9, reps: 1 }];
  const increment = unit === "kg" ? 2.5 : 5;
  return levels.map(step => ({ ...step, weight: Math.round(target * step.p / increment) * increment }));
}
const field = (label, name, value, options = {}) => '<label class="gym-tools-field"><span>' + label + '</span><input data-gym-input="' + name + '" type="number" inputmode="decimal" min="' + (options.min ?? 0) + '" max="' + (options.max ?? 10000) + '" step="' + (options.step ?? "any") + '" value="' + value + '"></label>';
const unitControl = () => '<label class="gym-tools-field"><span>Unit</span><select data-gym-unit><option value="lb"' + (unit === "lb" ? " selected" : "") + '>lb</option><option value="kg"' + (unit === "kg" ? " selected" : "") + '>kg</option></select></label>';
const validWeight = (selector) => { const input = overlay?.querySelector('[data-gym-input="' + selector + '"]'); const val = Number(input?.value); return input?.value !== "" && Number.isFinite(val) && val > 0 && val <= 10000 ? val : null; };
function renderContents() {
  if (!overlay) return;
  const body = overlay.querySelector("[data-gym-content]");
  if (tab === "plates") {
    body.innerHTML = '<p class="gym-tools-help">Use the full workout plate calculator with the original visual bar loading, bar presets and equipment settings.</p><button type="button" class="gym-tools-secondary" data-gym-open-plates>Open Plate Calculator</button>';
  } else if (tab === "convert") {
    body.innerHTML = '<p class="gym-tools-help">Convert a machine or free-weight load instantly.</p><div class="gym-tools-fields">' + field("Weight", "target", 45) + unitControl() + '</div><div class="gym-tools-results" data-gym-results></div><button type="button" class="gym-tools-secondary" data-gym-swap>Swap units</button>';
  } else if (tab === "warmup") {
    body.innerHTML = '<p class="gym-tools-help">A suggested warm-up ramp before your working sets. Adjust it to your needs.</p><div class="gym-tools-fields">' + field("Working weight", "target", unit === "lb" ? 135 : 60) + unitControl() + '</div><div class="gym-tools-results" data-gym-results></div>';
  } else if (tab === "oneRM") {
    body.innerHTML = '<p class="gym-tools-help">Estimate your one-rep max using the Epley formula. For higher repetitions, estimates become less reliable.</p><div class="gym-tools-fields">' + field("Weight lifted", "target", unit === "lb" ? 135 : 60) + field("Repetitions (1–30)", "reps", 8, { min: 1, max: 30, step: 1 }) + unitControl() + '</div><div class="gym-tools-results" data-gym-results></div>';
  } else {
    body.innerHTML = '<p class="gym-tools-help">Time planks, carries, hangs, or any exercise without starting a workout.</p><div class="gym-tools-stopwatch-panel"><div class="gym-tools-stopwatch-top"><span class="gym-tools-live-dot"></span><span>SESSION STOPWATCH</span></div><div class="gym-tools-clock" role="timer" aria-live="off" aria-label="Elapsed time" data-gym-clock>00:00.0</div><div class="gym-tools-stopwatch-subtitle">Minutes : Seconds . Tenths</div></div><div class="gym-tools-timer-actions"><button type="button" data-gym-timer="toggle">Start</button><button type="button" data-gym-timer="reset" class="gym-tools-secondary">Reset</button></div>';
    refreshClock();
  }
  updateResults();
}
function updateResults() {
  const results = overlay?.querySelector("[data-gym-results]");
  if (!results) return;
  const value = validWeight("target");
  if (value === null) { results.innerHTML = '<p>Enter a valid positive weight.</p>'; return; }
  if (tab === "convert") {
    const other = unit === "lb" ? "kg" : "lb";
    results.innerHTML = '<strong class="gym-tools-result-number">' + fmt(convert(value, unit, other)) + ' ' + other + '</strong><small>' + fmt(value) + ' ' + unit + ' = ' + fmt(convert(value, unit, other)) + ' ' + other + '</small>';
  } else if (tab === "oneRM") {
    const input = overlay.querySelector('[data-gym-input="reps"]');
    const reps = Number(input?.value);
    const estimated = input?.value === "" ? null : epley1RM(value, reps);
    results.innerHTML = estimated === null ? '<p>Enter 1–30 whole-number repetitions.</p>' : '<span class="gym-tools-kicker">Estimated 1RM</span><strong class="gym-tools-result-number">' + fmt(estimated) + ' ' + unit + '</strong><small>Epley: weight × (1 + reps ÷ 30). One rep uses the lifted weight.</small>';
  } else if (tab === "warmup") {
    results.innerHTML = '<span class="gym-tools-kicker">Suggested warm-up sets</span>' + warmUpRamp(value).map(step => '<div class="gym-tools-result-row"><span>' + Math.round(step.p * 100) + '% · ' + step.reps + ' reps</span><strong>' + fmt(step.weight) + ' ' + unit + '</strong></div>').join('') + '<small>Illustrative loads; reduce or skip sets as appropriate.</small>';
  }
}
function refreshClock() {
  const ms = startTime ? Math.max(0, now() - startTime) : elapsed;
  const tenths = Math.floor(ms / 100) % 10;
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const clock = overlay?.querySelector("[data-gym-clock]");
  if (clock) clock.innerHTML = '<span class="gym-tools-clock-main">' + (hours ? String(hours).padStart(2, "0") + ":" : "") + String(minutes % 60).padStart(2, "0") + ":" + String(seconds).padStart(2, "0") + '</span><span class="gym-tools-clock-tenths">.' + tenths + '</span>';
  clock?.classList.toggle("is-running", Boolean(startTime));
  const toggle = overlay?.querySelector('[data-gym-timer="toggle"]');
  if (toggle) toggle.textContent = startTime ? "Pause" : (elapsed ? "Resume" : "Start");
}
async function updateNativeStopwatch(status) {
  const plugin = nativeTimer();
  if (!plugin) return;
  const seconds = Math.floor((startTime ? now() - startTime : elapsed) / 1000);
  try {
    const state = await plugin.getState?.({ key: STOPWATCH_KEY });
    if (!state?.found || state.status === "skipped" || state.status === "finished") {
      if (status === "running") {
        await plugin.startHold?.({
          key: STOPWATCH_KEY, kind: "stopwatch",
          startedAt: startTime, exerciseName: "Gym Stopwatch", setNumber: 0,
          theme: document.documentElement.dataset.theme || "level-up",
          icon: document.documentElement.dataset.theme || "level-up"
        });
      }
      return;
    }
    await plugin.update?.({
      key: STOPWATCH_KEY, status, startedAt: startTime || now() - elapsed,
      remainingSeconds: seconds
    });
  } catch (error) { console.warn("Gym Stopwatch Live Activity sync failed:", error); }
}
async function syncFromNativeStopwatch() {
  if (!nativeTimer()?.getState) return;
  try {
    const state = await nativeTimer().getState({ key: STOPWATCH_KEY });
    if (!state?.found) return;
    if (state.status === "skipped" || state.status === "finished") {
      elapsed = 0; startTime = 0;
    } else if (state.status === "paused") {
      elapsed = Math.max(0, Number(state.remainingSeconds) || 0) * 1000;
      startTime = 0;
    } else if (state.status === "running") {
      startTime = Number(state.startedAt) || now();
      elapsed = 0;
    }
    clearInterval(timer); timer = startTime && overlay ? setInterval(refreshClock, 100) : null;
    refreshClock();
  } catch (error) { console.warn("Gym Stopwatch state check failed:", error); }
}
window.addEventListener("focus", () => { void syncFromNativeStopwatch(); });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void syncFromNativeStopwatch();
});

function onKeydown(event) { if (event.key === "Escape") closeGymTools(); }
export function closeGymTools() {
  if (!overlay) return;
  clearInterval(timer); timer = null;
  overlay.remove(); overlay = null;
  document.body.classList.remove("gym-tools-open");
  document.removeEventListener("keydown", onKeydown);
  previousFocus?.focus?.({ preventScroll: true });
}
export function openGymTools() {
  if (overlay) return;
  previousFocus = document.activeElement;
  overlay = document.createElement("div");
  overlay.className = "gym-tools-overlay";
  overlay.innerHTML = '<div class="gym-tools-scrim" data-gym-close></div><section class="gym-tools-sheet" role="dialog" aria-modal="true" aria-labelledby="gym-tools-title"><header class="gym-tools-header"><div><span class="gym-tools-kicker">LEVEL UP</span><h2 id="gym-tools-title">Gym Tools</h2></div><button type="button" aria-label="Close Gym Tools" data-gym-close>×</button></header><nav class="gym-tools-tabs" aria-label="Gym tools">' + TABS.map(([key,label]) => '<button type="button" data-gym-tab="' + key + '">' + label + '</button>').join("") + '</nav><div data-gym-content></div></section>';
  document.body.append(overlay);
  document.body.classList.add("gym-tools-open");
  overlay.addEventListener("click", event => {
    if (event.target.closest("[data-gym-close]")) { closeGymTools(); return; }
    const chosen = event.target.closest("[data-gym-tab]");
    if (chosen) {
      if (chosen.dataset.gymTab === "plates") { closeGymTools(); openStandalonePlateCalculator(); return; }
      tab = chosen.dataset.gymTab; renderContents(); syncTabs(); return;
    }
    if (event.target.closest("[data-gym-open-plates]")) { closeGymTools(); openStandalonePlateCalculator(); return; }
    if (event.target.closest("[data-gym-swap]")) {
      const val = validWeight("target");
      if (val !== null) { unit = unit === "lb" ? "kg" : "lb"; renderContents(); overlay.querySelector('[data-gym-input="target"]').value = convert(val, unit === "lb" ? "kg" : "lb", unit).toFixed(2); updateResults(); }
      return;
    }
    const command = event.target.closest("[data-gym-timer]")?.dataset.gymTimer;
    if (command === "toggle") {
      if (startTime) {
        elapsed = Math.max(0, now() - startTime);
        startTime = 0;
        clearInterval(timer); timer = null;
        void updateNativeStopwatch("paused");
      } else {
        startTime = now() - elapsed;
        timer = setInterval(refreshClock, 100);
        void updateNativeStopwatch("running");
      }
      refreshClock();
    } else if (command === "reset") {
      startTime = 0; elapsed = 0; clearInterval(timer); timer = null; void nativeTimer()?.cancel?.({ key: STOPWATCH_KEY }); refreshClock();
    }
  });
  overlay.addEventListener("input", updateResults);
  overlay.addEventListener("change", event => {
    if (event.target.matches("[data-gym-unit]")) { unit = event.target.value; renderContents(); }
  });
  document.addEventListener("keydown", onKeydown);
  renderContents(); syncTabs();
  void syncFromNativeStopwatch();
  if (startTime && !timer) timer = setInterval(refreshClock, 100);
  overlay.querySelector("[data-gym-close]")?.focus({ preventScroll: true });
}
function syncTabs() {
  overlay?.querySelectorAll("[data-gym-tab]").forEach(button => {
    const selected = button.dataset.gymTab === tab;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-selected", String(selected));
  });
}
