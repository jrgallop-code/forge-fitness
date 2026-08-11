import { getExerciseById } from '../workouts/exercise-library.js?v=recovery-secondary-1';
import { createGeneratedExerciseGuide } from '../workouts/exercise-guide-generator.js?v=recovery-secondary-1';

const SESSION_KEY = 'forge_workout_sessions';
const FULL_RECOVERY_HOURS = 72;
const PRIMARY_IMPACT = 1;
const SECONDARY_IMPACT = 0.5;
const DETAIL_GROUPS = [
  ['Chest','Chest'],['Back','Back'],['Shoulders','Shoulders'],['Rear Delts','Rear Delts'],
  ['Biceps','Biceps'],['Triceps','Triceps'],['Forearms','Forearms'],['Abs','Core'],
  ['Quads','Quads'],['Hamstrings','Hamstrings'],['Glutes','Glutes'],['Calves','Calves']
];

function getSessions() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function sessionTime(session) {
  const raw = session?.completedAt || session?.endTime || session?.date;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

function performed(exercise) {
  return (exercise?.sets || []).some(set =>
    Number(set?.reps) > 0 || Number(set?.weight) > 0 ||
    Number(set?.duration) > 0 || Number(set?.durationMinutes) > 0
  );
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
    if (group) impacts.set(group, { weight: PRIMARY_IMPACT, role: 'primary' });
  });
  return impacts;
}

function buildStates() {
  const exposures = new Map();
  getSessions().forEach(session => {
    const time = sessionTime(session);
    if (!time) return;
    (session.exercises || []).forEach(exercise => {
      if (!performed(exercise)) return;
      const definition = getExerciseById(exercise.exerciseId);
      const name = definition?.name || exercise.name || 'Exercise';
      exerciseImpacts(definition, exercise).forEach((impact, group) => {
        if (/cardio|other/i.test(group)) return;
        if (!exposures.has(group)) exposures.set(group, []);
        exposures.get(group).push({ time, name, ...impact });
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
      fatigue += item.weight * remaining;
    });
    fatigue = Math.min(1, fatigue);
    const percent = Math.max(0, Math.min(100, Math.round((1 - fatigue) * 100)));
    const latestTime = items[0]?.time || 0;
    const hours = latestTime ? Math.max(0, (now - latestTime) / 3600000) : Infinity;
    const recentNames = [];
    const seen = new Set();
    items.filter(item => ((now - item.time) / 3600000) < FULL_RECOVERY_HOURS).forEach(item => {
      const key = `${item.name}|${item.role}`;
      if (seen.has(key) || recentNames.length >= 3) return;
      seen.add(key);
      recentNames.push(item.role === 'secondary' ? `${item.name} (secondary)` : item.name);
    });
    if (!recentNames.length && items[0]) recentNames.push(items[0].role === 'secondary' ? `${items[0].name} (secondary)` : items[0].name);
    states.set(group, {
      group, percent, hours, names: recentNames,
      status: percent >= 100 ? 'Ready' : percent >= 67 ? 'Nearly Ready' : 'Recovering',
      opacity: Math.max(.04, .96 * fatigue)
    });
  });
  return states;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
}
function elapsed(hours) {
  if (!Number.isFinite(hours)) return 'No recent exercise';
  if (hours < 1) return 'trained recently';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
function colorForPercent(percent) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
  const fatigued = [255,49,95], recovered = [133,135,147];
  return `rgb(${fatigued.map((v,i)=>Math.round(v + (recovered[i]-v)*p)).join(',')})`;
}

function applyBody(states) {
  document.querySelectorAll('[data-recovery-muscle]').forEach(node => {
    const state = states.get(node.dataset.recoveryMuscle);
    node.classList.toggle('no-data', !state);
    const percent = state?.percent ?? 100;
    node.style.setProperty('--recovery-opacity', String(state?.opacity ?? .04));
    node.style.setProperty('--recovery-fill', '#ff315f');
    node.dataset.recoveryPercent = String(percent);
  });
}

function detailRow(label, group, state) {
  if (!state) return `<article class="recovery-detail-row no-data"><div class="recovery-mini"></div><div><strong>${escapeHtml(label)}</strong><span>No recent exercises</span></div><b>—</b></article>`;
  return `<article class="recovery-detail-row" style="--recovery-percent:${state.percent}%"><div class="recovery-mini" style="--recovery-fill:${colorForPercent(state.percent)}"></div><div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(state.names.join(', '))} · ${elapsed(state.hours)}</span><small>${state.status}</small><div class="recovery-row-progress"><span></span></div></div><b>${state.percent}%</b></article>`;
}

function applyDetails(states) {
  document.querySelectorAll('[data-recovery-detail-list]').forEach(list => {
    list.innerHTML = DETAIL_GROUPS.map(([label,group]) => detailRow(label, group, states.get(group))).join('');
  });
  document.querySelectorAll('#recovery-fresh-count').forEach(node => {
    node.textContent = String(DETAIL_GROUPS.filter(([,group]) => states.get(group)?.percent >= 100).length);
  });
}

function applySecondaryRecovery() {
  const states = buildStates();
  applyBody(states);
  applyDetails(states);
}

document.addEventListener('click', event => {
  if (event.target.closest?.('.training-progress-tab[data-view="recovery"], [data-recovery-facing], [data-recovery-map-button], [data-recovery-details-button], [data-recovery-mode]')) {
    window.setTimeout(applySecondaryRecovery, 0);
  }
}, true);

const content = document.getElementById('content');
if (content) new MutationObserver(() => window.setTimeout(applySecondaryRecovery, 0)).observe(content, { childList:true, subtree:true });
window.addEventListener('focus', applySecondaryRecovery);
window.setTimeout(applySecondaryRecovery, 0);
