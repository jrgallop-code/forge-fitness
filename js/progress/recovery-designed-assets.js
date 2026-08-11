import { getExerciseById } from '../workouts/exercise-library.js?v=recovery-designed-assets-1';

const FRONT_ASSET = 'assets/recovery/front-body-map.svg';
const BACK_ASSET = 'assets/recovery/back-body-map.svg';
const SESSION_KEY = 'forge_workout_sessions';
const FULL_RECOVERY_HOURS = 72;

const frontParts = [
  ['front-shoulder-left','Shoulders'],['front-shoulder-right','Shoulders'],
  ['front-chest-left','Chest'],['front-chest-right','Chest'],
  ['front-biceps-left','Biceps'],['front-biceps-right','Biceps'],
  ['front-forearm-left-outer','Forearms'],['front-forearm-left-inner','Forearms'],
  ['front-forearm-right-outer','Forearms'],['front-forearm-right-inner','Forearms'],
  ['front-abs-upper-left','Core'],['front-abs-upper-right','Core'],
  ['front-abs-mid-left','Core'],['front-abs-mid-right','Core'],
  ['front-abs-lower-left','Core'],['front-abs-lower-right','Core'],
  ['front-oblique-left','Core'],['front-oblique-right','Core'],
  ['front-quad-left-outer','Quads'],['front-quad-left-inner','Quads'],
  ['front-quad-right-inner','Quads'],['front-quad-right-outer','Quads'],
  ['front-calf-left','Calves'],['front-calf-right','Calves']
];

const backParts = [
  ['back-traps-left','Back'],['back-traps-right','Back'],
  ['back-rear-delt-left','Rear Delts'],['back-rear-delt-right','Rear Delts'],
  ['back-lat-left-upper','Back'],['back-lat-right-upper','Back'],
  ['back-lat-left-lower','Back'],['back-lat-right-lower','Back'],
  ['back-triceps-left','Triceps'],['back-triceps-right','Triceps'],
  ['back-forearm-left-outer','Forearms'],['back-forearm-left-inner','Forearms'],
  ['back-forearm-right-outer','Forearms'],['back-forearm-right-inner','Forearms'],
  ['back-lower-back-left','Back'],['back-lower-back-right','Back'],
  ['back-glute-left','Glutes'],['back-glute-right','Glutes'],
  ['back-hamstring-left-outer','Hamstrings'],['back-hamstring-left-inner','Hamstrings'],
  ['back-hamstring-right-inner','Hamstrings'],['back-hamstring-right-outer','Hamstrings'],
  ['back-calf-left','Calves'],['back-calf-right','Calves']
];

function use(asset, id, muscle) {
  return `<use href="${asset}#${id}" class="recovery-designed-muscle" data-recovery-muscle="${muscle}"/>`;
}

function anatomy(side) {
  const front = side === 'front';
  const asset = front ? FRONT_ASSET : BACK_ASSET;
  const parts = front ? frontParts : backParts;
  return `<svg class="recovery-designed-anatomy" viewBox="0 0 500 900" role="img" aria-label="${front ? 'Front' : 'Back'} muscle recovery map">
    <use href="${asset}#${front ? 'front-base' : 'back-base'}" class="recovery-designed-base"/>
    ${parts.map(([id,muscle]) => use(asset,id,muscle)).join('')}
  </svg>`;
}

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
  return (exercise?.sets || []).some(set => Number(set?.reps) > 0 || Number(set?.weight) > 0 || Number(set?.duration) > 0 || Number(set?.durationMinutes) > 0);
}

function normalizeGroup(value) {
  const text = String(value || '').trim();
  const aliases = {
    Quadriceps:'Quads', Hamstring:'Hamstrings', Shoulder:'Shoulders', Glute:'Glutes', Calf:'Calves',
    Abs:'Core', Abdominals:'Core', Forearm:'Forearms'
  };
  return aliases[text] || text;
}

function recoveryStates() {
  const latest = new Map();
  getSessions().forEach(session => {
    const time = sessionTime(session);
    if (!time) return;
    (session.exercises || []).forEach(exercise => {
      if (!performed(exercise)) return;
      const definition = getExerciseById(exercise.exerciseId);
      const group = normalizeGroup(definition?.muscleGroup || exercise.muscleGroup);
      if (!group || /cardio|other/i.test(group)) return;
      const name = definition?.name || exercise.name || 'Exercise';
      const current = latest.get(group);
      if (!current || time > current.time) latest.set(group, { time, names:[name] });
      else if (time === current.time && !current.names.includes(name)) current.names.push(name);
    });
  });

  const states = new Map();
  latest.forEach((info, group) => {
    const hours = Math.max(0, (Date.now() - info.time) / 3600000);
    const percent = Math.min(100, Math.round((hours / FULL_RECOVERY_HOURS) * 100));
    states.set(group, { group, hours, percent, opacity: Math.max(.04, .96 * (1 - percent / 100)), names: info.names });
  });
  return states;
}

function applyRecovery(root, states) {
  root.querySelectorAll('[data-recovery-muscle]').forEach(node => {
    const state = states.get(node.dataset.recoveryMuscle);
    node.classList.toggle('no-data', !state);
    if (state) {
      node.style.setProperty('--recovery-opacity', String(state.opacity));
      node.style.setProperty('--recovery-fill', '#ff315f');
    }
  });
}

function replaceBody(root, side, states) {
  if (!root) return;
  if (root.dataset.designedRecoveryAsset !== 'true') {
    root.innerHTML = anatomy(side);
    root.dataset.designedRecoveryAsset = 'true';
    root.classList.add('recovery-designed-wrap');
  }
  applyRecovery(root, states);
}

function statusFor(hours) { return hours < 48 ? 'Recovering' : hours < 72 ? 'Nearly Ready' : 'Ready'; }
function elapsed(hours) { if (hours < 1) return 'trained recently'; if (hours < 24) return `${Math.floor(hours)}h ago`; const days=Math.floor(hours/24); return days===1?'yesterday':`${days} days ago`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }

function extraDetailRow(label, group, state) {
  if (!state) return `<article class="recovery-detail-row no-data" data-designed-extra-muscle="${group}"><div class="recovery-mini"></div><div><strong>${label}</strong><span>No recent exercises</span></div><b>—</b></article>`;
  return `<article class="recovery-detail-row" data-designed-extra-muscle="${group}" style="--recovery-percent:${state.percent}%"><div class="recovery-mini" style="--recovery-fill:#ff315f;opacity:${Math.max(.2,state.opacity)}"></div><div><strong>${label}</strong><span>${escapeHtml(state.names.join(', '))} · ${elapsed(state.hours)}</span><small>${statusFor(state.hours)}</small><div class="recovery-row-progress"><span></span></div></div><b>${state.percent}%</b></article>`;
}

function renderAddedDetails(view, states) {
  const list = view.querySelector('[data-recovery-detail-list]');
  if (!list) return;
  list.querySelectorAll('[data-designed-extra-muscle]').forEach(node => node.remove());
  list.insertAdjacentHTML('beforeend', extraDetailRow('Abs','Core',states.get('Core')) + extraDetailRow('Forearms','Forearms',states.get('Forearms')));
}

function installDesignedAssets() {
  const states = recoveryStates();
  document.querySelectorAll('.muscle-recovery-map-view').forEach(view => {
    replaceBody(view.querySelector('[data-recovery-body-front]'), 'front', states);
    replaceBody(view.querySelector('[data-recovery-body-back]'), 'back', states);
    renderAddedDetails(view, states);
  });
}

document.addEventListener('click', event => {
  if (event.target.closest?.('.training-progress-tab[data-view="recovery"], [data-recovery-facing], [data-recovery-map-button], [data-recovery-details-button], [data-recovery-mode]')) {
    requestAnimationFrame(installDesignedAssets);
  }
}, true);

const content = document.getElementById('content');
if (content) {
  const observer = new MutationObserver(() => {
    const pending = content.querySelector('.muscle-recovery-map-view [data-recovery-body-front]:not([data-designed-recovery-asset="true"])');
    if (pending) installDesignedAssets();
  });
  observer.observe(content, { childList: true, subtree: true });
}

window.setTimeout(installDesignedAssets, 0);
