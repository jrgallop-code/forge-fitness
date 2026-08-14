const CLEAN_BACK_ASSET = 'assets/recovery/back-user-source.svg?v=back-source-3';
const SVG_NS = 'http://www.w3.org/2000/svg';
const BACK_OUTLINE_FILTER_ID = 'recovery-back-outline-alpha';

function ensureBackOutlineFilter(svg) {
  if (!svg || svg.querySelector(`#${BACK_OUTLINE_FILTER_ID}`)) return;

  let defs = svg.querySelector('defs[data-recovery-back-outline-defs]');
  if (!defs) {
    defs = document.createElementNS(SVG_NS, 'defs');
    defs.dataset.recoveryBackOutlineDefs = 'true';
    svg.insertBefore(defs, svg.firstChild);
  }

  const filter = document.createElementNS(SVG_NS, 'filter');
  filter.id = BACK_OUTLINE_FILTER_ID;
  filter.setAttribute('x', '-2%');
  filter.setAttribute('y', '-2%');
  filter.setAttribute('width', '104%');
  filter.setAttribute('height', '104%');
  filter.setAttribute('color-interpolation-filters', 'sRGB');

  const matrix = document.createElementNS(SVG_NS, 'feColorMatrix');
  matrix.setAttribute('type', 'matrix');
  matrix.setAttribute('values', [
    '0 0 0 0 1',
    '0 0 0 0 1',
    '0 0 0 0 1',
    '0.2126 0.7152 0.0722 0 0'
  ].join(' '));

  filter.appendChild(matrix);
  defs.appendChild(filter);
}

function replaceBackArtwork(root) {
  if (!root?.matches?.('[data-recovery-body-back]')) return;
  const svg = root.querySelector('.recovery-user-back-svg');
  const image = svg?.querySelector('image');
  if (!svg || !image) return;

  ensureBackOutlineFilter(svg);

  if (image.getAttribute('href') !== CLEAN_BACK_ASSET) {
    image.setAttribute('href', CLEAN_BACK_ASSET);
    image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', CLEAN_BACK_ASSET);
  }

  image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  image.setAttribute('filter', `url(#${BACK_OUTLINE_FILTER_ID})`);
}

function addGrayBases(root) {
  if (!root) return;
  replaceBackArtwork(root);
  if (root.dataset.grayRecoveryBase === 'true') return;

  const svg = root.querySelector('.recovery-user-front-svg, .recovery-user-back-svg');
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
  document.querySelectorAll('[data-recovery-body-front], [data-recovery-body-back]').forEach(addGrayBases);
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
