import { getExerciseById } from '../workouts/exercise-library.js?v=recovery-secondary-3';
import { createGeneratedExerciseGuide } from '../workouts/exercise-guide-generator.js?v=recovery-secondary-3';

const SESSION_KEY = 'forge_workout_sessions';
const FULL_RECOVERY_HOURS = 72;
const SECONDARY_IMPACT = 0.5;
const SET_EQUIVALENTS_FOR_FULL_FATIGUE = 3;
export const RECOVERY_DETAIL_GROUPS = [
  ['Chest','Chest'],['Back','Back'],['Shoulders','Shoulders'],['Rear Delts','Rear Delts'],
  ['Biceps','Biceps'],['Triceps','Triceps'],['Forearms','Forearms'],['Abs','Core'],
  ['Quads','Quads'],['Hamstrings','Hamstrings'],['Glutes','Glutes'],['Calves','Calves']
];

function recoveryUiPresent() {
  return Boolean(document.querySelector('[data-recovery-muscle], [data-recovery-detail-list], #recovery-fresh-count'));
}

function getSessions() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateOnlyTimestamp(trainingDate) {
  const parts = String(trainingDate || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part))) return 0;
  const [year, month, day] = parts;
  const anchored = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isFinite(anchored.getTime()) ? anchored.getTime() : 0;
}

function sessionTrainingTime(session) {
  const trainingDate = String(session?.date || '').trim();
  const hasRecordedDate = /^\d{4}-\d{2}-\d{2}$/.test(trainingDate);
  const today = localDateKey(new Date());
  if (hasRecordedDate) {
    if (trainingDate !== today) return dateOnlyTimestamp(trainingDate);
    for (const raw of [session?.completedAt, session?.endTime, session?.startedAt].filter(Boolean)) {
      const candidate = new Date(raw);
      if (Number.isFinite(candidate.getTime()) && localDateKey(candidate) === trainingDate) return candidate.getTime();
    }
    return dateOnlyTimestamp(trainingDate);
  }
  for (const raw of [session?.completedAt, session?.endTime, session?.startedAt].filter(Boolean)) {
    const time = new Date(raw).getTime();
    if (Number.isFinite(time)) return time;
  }
  return 0;
}

function performedSetCount(exercise) {
  if (exercise?.trackingType === 'notes') return 0;
  return (exercise?.sets || []).filter(set =>
    set?.completed === true || Number(set?.reps) > 0 || Number(set?.duration) > 0 || Number(set?.durationMinutes) > 0
  ).length;
}

function normalizeRecoveryGroup(value) {
  const text = String(value || '').trim();
  const aliases = {
    Quadriceps:'Quads', Hamstring:'Hamstrings', Shoulder:'Shoulders', Glute:'Glutes', Calf:'Calves', Forearm:'Forearms',
    'Front Delts':'Shoulders', 'Side Delts':'Shoulders', Lats:'Back', 'Upper Back':'Back', 'Spinal Erectors':'Back',
    'Rectus Abdominis':'Core', Obliques:'Core', 'Deep Core':'Core', Abs:'Core', Abdominals:'Core'
  };
  return aliases[text] || text;
}

function muscleRoles(definition, exercise) {
  try {
    const guide = definition ? createGeneratedExerciseGuide(definition) : null;
    const primary = Array.isArray(guide?.primary) ? guide.primary : [];
    const secondary = Array.isArray(guide?.secondary) ? guide.secondary : [];
    if (primary.length || secondary.length) return { primary, secondary };
  } catch {}
  const fallback = normalizeRecoveryGroup(definition?.muscleGroup || exercise?.muscleGroup);
  return { primary: fallback ? [fallback] : [], secondary: [] };
}

function exerciseImpacts(definition, exercise) {
  const roles = muscleRoles(definition, exercise);
  const impacts = new Map();
  roles.secondary.forEach(muscle => {
    const group = normalizeRecoveryGroup(muscle);
    if (group) impacts.set(group, { weight: SECONDARY_IMPACT, role: 'secondary' });
  });
  roles.primary.forEach(muscle => {
    const group = normalizeRecoveryGroup(muscle);
    if (group) impacts.set(group, { weight: 1, role: 'primary' });
  });
  return impacts;
}

function recoveryOpacityForFatigue(fatigue) {
  const value = Math.max(0, Math.min(1, Number(fatigue) || 0));
  // Keep fully recovered muscles neutral, but retain a subtle visible tint for
  // every not-yet-100% state. This mainly improves contrast above ~75% recovery.
  if (value <= 0) return .04;
  return Math.min(.96, .08 + .88 * value);
}

export function getRecoveryStates() {
  const exposures = new Map();
  getSessions().forEach(session => {
    const time = sessionTrainingTime(session);
    if (!time) return;
    (session.exercises || []).forEach(exercise => {
      const setCount = performedSetCount(exercise);
      if (!setCount) return;
      const definition = getExerciseById(exercise.exerciseId);
      const name = definition?.name || exercise.name || 'Exercise';
      exerciseImpacts(definition, exercise).forEach((impact, group) => {
        if (/cardio|other/i.test(group)) return;
        if (!exposures.has(group)) exposures.set(group, []);
        exposures.get(group).push({ time, name, setCount, role: impact.role, setEquivalents: setCount * impact.weight });
      });
    });
  });

  const states = new Map();
  const now = Date.now();
  exposures.forEach((items, group) => {
    items.sort((a,b) => b.time - a.time);
    let fatigue = 0;
    items.forEach(item => {
      const hours = Math.max(0, (now - item.time) / 3600000);
      const remaining = Math.max(0, 1 - hours / FULL_RECOVERY_HOURS);
      const initialFatigue = item.role === 'primary' ? 1 : Math.min(1, item.setEquivalents / SET_EQUIVALENTS_FOR_FULL_FATIGUE);
      fatigue = Math.max(fatigue, initialFatigue * remaining);
    });
    const percent = Math.max(0, Math.min(100, Math.round((1 - fatigue) * 100)));
    const latestTime = items[0]?.time || 0;
    const hours = latestTime ? Math.max(0, (now - latestTime) / 3600000) : Infinity;
    const details = [];
    const seen = new Set();
    items.filter(item => ((now - item.time) / 3600000) < FULL_RECOVERY_HOURS).forEach(item => {
      const key = `${item.name}|${item.role}|${item.time}`;
      if (seen.has(key) || details.length >= 3) return;
      seen.add(key);
      const role = item.role === 'secondary' ? ' (secondary)' : '';
      details.push(`${item.name}${role} · ${item.setCount} ${item.setCount === 1 ? 'set' : 'sets'} · ${elapsed(Math.max(0, (now-item.time)/3600000))}`);
    });
    states.set(group, {
      group, percent, hours, details,
      status: percent >= 100 ? 'Ready' : percent >= 67 ? 'Nearly Ready' : 'Recovering',
      opacity: recoveryOpacityForFatigue(fatigue)
    });
  });
  return states;
}

export function getReadyRecoveryCount(states = getRecoveryStates()) {
  return RECOVERY_DETAIL_GROUPS.filter(([,group]) => states.get(group)?.percent >= 100).length;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

function elapsed(hours) {
  if (!Number.isFinite(hours)) return 'No recent exercise';
  if (hours < 1) return '<1h ago';
  return `${Math.floor(hours)}h ago`;
}

function colorForPercent(percent) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
  const fatigued = [255,49,95], recovered = [133,135,147];
  return `rgb(${fatigued.map((v,i)=>Math.round(v + (recovered[i]-v)*p)).join(',')})`;
}

function applySecondaryRecovery() {
  if (!recoveryUiPresent()) return;
  const states = getRecoveryStates();
  document.querySelectorAll('[data-recovery-muscle]').forEach(node => {
    const state = states.get(node.dataset.recoveryMuscle);
    node.classList.toggle('no-data', !state);
    node.style.setProperty('--recovery-opacity', String(state?.opacity ?? .04));
    node.style.setProperty('--recovery-fill', '#ff315f');
    node.dataset.recoveryPercent = String(state?.percent ?? 100);
  });
  document.querySelectorAll('[data-recovery-detail-list]').forEach(list => {
    list.innerHTML = RECOVERY_DETAIL_GROUPS.map(([label,group]) => {
      const state = states.get(group);
      if (!state) return `<article class="recovery-detail-row no-data"><div class="recovery-mini"></div><div><strong>${escapeHtml(label)}</strong><span>No recent exercises</span></div><b>—</b></article>`;
      return `<article class="recovery-detail-row" style="--recovery-percent:${state.percent}%"><div class="recovery-mini" style="--recovery-fill:${colorForPercent(state.percent)}"></div><div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(state.details.join(' • '))}</span><small>${state.status}</small><div class="recovery-row-progress"><span></span></div></div><b>${state.percent}%</b></article>`;
    }).join('');
  });
  document.querySelectorAll('#recovery-fresh-count').forEach(node => {
    node.textContent = String(getReadyRecoveryCount(states));
  });
}

let refreshQueued = false;
function scheduleRecoveryRefresh() {
  if (!recoveryUiPresent() || refreshQueued) return;
  refreshQueued = true;
  requestAnimationFrame(() => {
    refreshQueued = false;
    applySecondaryRecovery();
  });
}

document.addEventListener('click', event => {
  if (event.target.closest?.('.training-progress-tab[data-view="recovery"], [data-recovery-facing], [data-recovery-map-button], [data-recovery-details-button], [data-recovery-mode]')) {
    scheduleRecoveryRefresh();
  }
}, true);

const content = document.getElementById('content');
if (content) {
  new MutationObserver(() => {
    if (recoveryUiPresent()) scheduleRecoveryRefresh();
  }).observe(content, { childList:true, subtree:true });
}
window.addEventListener('focus', scheduleRecoveryRefresh);
window.setTimeout(scheduleRecoveryRefresh, 0);
