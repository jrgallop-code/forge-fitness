function addGrayBases(root) {
  if (!root || root.dataset.grayRecoveryBase === 'true') return;

  const svg = root.querySelector('.recovery-user-front-svg');
  if (!svg) return;

  const muscles = [...svg.querySelectorAll('.recovery-user-muscle')];
  muscles.forEach(muscle => {
    const base = muscle.cloneNode(false);
    base.removeAttribute('data-recovery-muscle');
    base.removeAttribute('style');
    base.classList.remove('recovery-user-muscle', 'recovery-user-fill', 'recovery-user-stroke', 'no-data');
    base.classList.add(
      'recovery-user-muscle-base',
      muscle.classList.contains('recovery-user-stroke') ? 'recovery-user-muscle-base-stroke' : 'recovery-user-muscle-base-fill'
    );
    muscle.parentNode.insertBefore(base, muscle);
  });

  root.dataset.grayRecoveryBase = 'true';
}

function installGrayRecoveryBases() {
  document.querySelectorAll('[data-recovery-body-front]').forEach(addGrayBases);
}

document.addEventListener('click', event => {
  if (event.target.closest?.('.training-progress-tab[data-view="recovery"], [data-recovery-facing], [data-recovery-map-button], [data-recovery-details-button], [data-recovery-mode]')) {
    requestAnimationFrame(installGrayRecoveryBases);
  }
}, true);

const content = document.getElementById('content');
if (content) {
  new MutationObserver(installGrayRecoveryBases).observe(content, { childList: true, subtree: true });
}

window.setTimeout(installGrayRecoveryBases, 0);
