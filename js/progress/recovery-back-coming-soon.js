const STYLE_ID = 'recovery-back-coming-soon-style';
const PANEL_ATTR = 'data-recovery-back-coming-soon-panel';

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    [data-recovery-body-back] { display: none !important; }
    [${PANEL_ATTR}] { min-height: 340px; display: grid; place-items: center; padding: 28px 20px; text-align: center; }
    [${PANEL_ATTR}][hidden] { display: none !important; }
    [${PANEL_ATTR}] .recovery-back-coming-soon-card { width: min(100%, 360px); padding: 24px 20px; border: 1px solid rgba(255,255,255,.12); border-radius: 18px; background: rgba(255,255,255,.035); }
    [${PANEL_ATTR}] strong { display: block; margin-bottom: 8px; color: #f4f4f6; font-size: 18px; font-weight: 800; }
    [${PANEL_ATTR}] p { margin: 0; color: #aaaab4; font-size: 14px; line-height: 1.5; }
  `;
  document.head.appendChild(style);
}

function ensurePanel(view) {
  let panel = view?.querySelector?.(`[${PANEL_ATTR}]`);
  if (panel) return panel;
  const mapPanel = view?.querySelector?.('[data-recovery-map-panel]');
  if (!mapPanel) return null;

  panel = document.createElement('div');
  panel.setAttribute(PANEL_ATTR, '');
  panel.hidden = true;
  panel.innerHTML = `<div class="recovery-back-coming-soon-card"><strong>Back View — Coming Soon</strong><p>We’re refining the back recovery map. Please use the Front view for now.</p></div>`;

  const front = mapPanel.querySelector('[data-recovery-body-front]');
  front ? mapPanel.insertBefore(panel, front) : mapPanel.appendChild(panel);
  return panel;
}

function enforceBackHidden(view) {
  const back = view?.querySelector?.('[data-recovery-body-back]');
  if (!back) return;
  back.hidden = true;
  back.style.setProperty('display', 'none', 'important');
  back.setAttribute('aria-hidden', 'true');
}

function activateComingSoon(view) {
  if (!view) return;
  const panel = ensurePanel(view);
  const front = view.querySelector('[data-recovery-body-front]');
  const back = view.querySelector('[data-recovery-body-back]');

  view.querySelectorAll('[data-recovery-facing]').forEach(button => {
    button.classList.toggle('active', button.dataset.recoveryFacing === 'back');
  });

  if (front) {
    front.hidden = true;
    front.style.setProperty('display', 'none', 'important');
    front.setAttribute('aria-hidden', 'true');
  }
  if (back) {
    back.hidden = true;
    back.style.setProperty('display', 'none', 'important');
    back.setAttribute('aria-hidden', 'true');
  }
  if (panel) panel.hidden = false;
}

function activateFront(view) {
  if (!view) return;
  const panel = ensurePanel(view);
  const front = view.querySelector('[data-recovery-body-front]');

  view.querySelectorAll('[data-recovery-facing]').forEach(button => {
    button.classList.toggle('active', button.dataset.recoveryFacing === 'front');
  });

  if (panel) panel.hidden = true;
  if (front) {
    front.hidden = false;
    front.style.setProperty('display', 'grid', 'important');
    front.setAttribute('aria-hidden', 'false');
  }
  enforceBackHidden(view);
}

function syncView(view) {
  if (!view) return;
  ensurePanel(view);
  enforceBackHidden(view);
  const backActive = view.querySelector('[data-recovery-facing="back"].active');
  if (backActive) activateComingSoon(view);
}

function install() {
  ensureStyle();
  document.querySelectorAll('.muscle-recovery-map-view').forEach(syncView);
}

document.addEventListener('click', event => {
  const control = event.target.closest?.('[data-recovery-facing]');
  if (!control) return;
  const view = control.closest('.muscle-recovery-map-view');
  if (!view) return;

  if (control.dataset.recoveryFacing === 'back') {
    requestAnimationFrame(() => activateComingSoon(view));
  } else if (control.dataset.recoveryFacing === 'front') {
    requestAnimationFrame(() => activateFront(view));
  }
}, true);

const content = document.getElementById('content');
if (content) {
  new MutationObserver(install).observe(content, { childList: true, subtree: true });
}

window.setTimeout(install, 0);
