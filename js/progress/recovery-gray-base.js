const COMING_SOON_ID = 'recovery-back-coming-soon-message';

function isBackRecoveryControl(target) {
  const control = target?.closest?.('[data-recovery-facing]');
  if (!control) return null;
  const value = String(control.dataset.recoveryFacing || '').trim().toLowerCase();
  const text = String(control.textContent || '').trim().toLowerCase();
  const label = String(control.getAttribute('aria-label') || '').trim().toLowerCase();
  return value === 'back' || text === 'back' || label.includes('back') ? control : null;
}

function ensureBackComingSoonMessage() {
  let message = document.getElementById(COMING_SOON_ID);
  if (message) return message;

  const style = document.createElement('style');
  style.textContent = `
    #${COMING_SOON_ID}{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:9999;width:min(calc(100vw - 32px),420px);transform:translate(-50%,18px);opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}
    #${COMING_SOON_ID}.is-visible{opacity:1;transform:translate(-50%,0)}
    #${COMING_SOON_ID} .recovery-coming-soon-card{display:flex;flex-direction:column;gap:5px;padding:14px 16px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(18,18,22,.97);box-shadow:0 14px 40px rgba(0,0,0,.42);color:#f7f7f8;text-align:center;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
    #${COMING_SOON_ID} strong{font-size:15px;line-height:1.25;font-weight:800}
    #${COMING_SOON_ID} span{font-size:13px;line-height:1.4;color:#b8b8c1}
  `;
  document.head.appendChild(style);

  message = document.createElement('div');
  message.id = COMING_SOON_ID;
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  message.innerHTML = `<div class="recovery-coming-soon-card"><strong>Back View — Coming Soon</strong><span>We’re refining the back recovery map. Please use the Front view for now.</span></div>`;
  document.body.appendChild(message);
  return message;
}

let comingSoonTimer = 0;
function showBackComingSoon() {
  const message = ensureBackComingSoonMessage();
  clearTimeout(comingSoonTimer);
  message.classList.remove('is-visible');
  requestAnimationFrame(() => message.classList.add('is-visible'));
  comingSoonTimer = window.setTimeout(() => message.classList.remove('is-visible'), 2800);
}

document.addEventListener('click', event => {
  if (!isBackRecoveryControl(event.target)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  showBackComingSoon();
}, true);

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
