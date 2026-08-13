const ID_TO_MUSCLE = new Map([
  ["front-shoulder-left","Shoulders"],["front-shoulder-right","Shoulders"],
  ["front-chest-left","Chest"],["front-chest-right","Chest"],
  ["front-biceps-left","Biceps"],["front-biceps-right","Biceps"],
  ["front-forearm-left-outer","Forearms"],["front-forearm-left-inner","Forearms"],
  ["front-forearm-right-outer","Forearms"],["front-forearm-right-inner","Forearms"],
  ["front-abs-upper-left","Core"],["front-abs-upper-right","Core"],
  ["front-abs-mid-left","Core"],["front-abs-mid-right","Core"],
  ["front-abs-lower-left","Core"],["front-abs-lower-right","Core"],
  ["front-oblique-left","Core"],["front-oblique-right","Core"],
  ["front-quad-left-outer","Quads"],["front-quad-left-inner","Quads"],
  ["front-quad-right-inner","Quads"],["front-quad-right-outer","Quads"],
  ["front-calf-left","Calves"],["front-calf-right","Calves"]
]);

function trainedMusclesFromLegacySvg(root) {
  const trained = new Set();
  root.querySelectorAll('.workout-complete-recap__muscle.is-trained').forEach(node => {
    const href = node.getAttribute('href') || node.getAttribute('xlink:href') || '';
    const id = href.split('#').pop();
    const muscle = ID_TO_MUSCLE.get(id);
    if (muscle) trained.add(muscle);
  });
  return trained;
}

function styleDetailedFront(root, trained) {
  const svg = root.querySelector('.recovery-user-front-svg');
  if (!svg) return false;

  root.querySelectorAll('[data-recovery-muscle]').forEach(node => {
    const muscle = node.dataset.recoveryMuscle;
    node.style.setProperty('--recovery-fill', '#2f7df6');
    node.style.setProperty('--recovery-opacity', trained.has(muscle) ? '.96' : '.04');
    node.classList.toggle('no-data', false);
  });

  root.classList.add('workout-complete-recap__detailed-recovery-front');
  return true;
}

function invokeRecoveryRenderer(container, trained) {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.hidden = true;
  trigger.dataset.recoveryMapButton = 'true';
  container.appendChild(trigger);
  trigger.click();
  trigger.remove();

  let attempts = 0;
  const finish = () => {
    if (styleDetailedFront(container, trained)) return;
    attempts += 1;
    if (attempts < 12) requestAnimationFrame(finish);
  };
  requestAnimationFrame(finish);
}

function upgradeRecapBody(recap) {
  if (!recap || recap.dataset.detailedRecoveryFront === 'true') return;
  const legacy = recap.querySelector('.workout-complete-recap__anatomy');
  if (!legacy) return;

  const trained = trainedMusclesFromLegacySvg(legacy);
  const bodyGlow = legacy.closest('.workout-complete-recap__body-glow');
  if (!bodyGlow) return;

  const view = document.createElement('div');
  view.className = 'muscle-recovery-map-view workout-complete-recap__recovery-view';
  view.innerHTML = '<div data-recovery-body-front class="workout-complete-recap__recovery-front"></div>';
  legacy.replaceWith(view);
  recap.dataset.detailedRecoveryFront = 'true';
  invokeRecoveryRenderer(view.querySelector('[data-recovery-body-front]'), trained);
}

function scan() {
  document.querySelectorAll('[data-workout-complete-recap]').forEach(upgradeRecapBody);
}

new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
window.addEventListener('focus', scan);
document.addEventListener('visibilitychange', () => { if (!document.hidden) scan(); });
window.setTimeout(scan, 0);
