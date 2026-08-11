const FRONT_ASSET = 'assets/recovery/front-body-map.svg';
const BACK_ASSET = 'assets/recovery/back-body-map.svg';

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

function replaceBody(root, side) {
  if (!root || root.dataset.designedRecoveryAsset === 'true') return;
  root.innerHTML = anatomy(side);
  root.dataset.designedRecoveryAsset = 'true';
  root.classList.add('recovery-designed-wrap');
}

function installDesignedAssets() {
  document.querySelectorAll('.muscle-recovery-map-view').forEach(view => {
    replaceBody(view.querySelector('[data-recovery-body-front]'), 'front');
    replaceBody(view.querySelector('[data-recovery-body-back]'), 'back');
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
