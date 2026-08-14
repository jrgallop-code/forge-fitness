const MESSAGE_ID = 'recovery-back-coming-soon-message';

function isBackFacingControl(target) {
  const control = target?.closest?.('[data-recovery-facing]');
  if (!control) return null;
  const value = String(control.dataset.recoveryFacing || '').trim().toLowerCase();
  const text = String(control.textContent || '').trim().toLowerCase();
  const label = String(control.getAttribute('aria-label') || '').trim().toLowerCase();
  return value === 'back' || text === 'back' || label.includes('back') ? control : null;
}

function ensureMessage() {
  let message = document.getElementById(MESSAGE_ID);
  if (message) return message;

  message = document.createElement('div');
  message.id = MESSAGE_ID;
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');
  message.innerHTML = `
    <div class="recovery-back-coming-soon-card">
      <strong>Back View — Coming Soon</strong>
      <span>We’re refining the back recovery map. Please use the Front view for now.</span>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #${MESSAGE_ID}{position:fixed;left:50%;bottom:calc(94px + env(safe-area-inset-bottom,0px));z-index:9999;width:min(calc(100vw - 32px),420px);transform:translate(-50%,18px);opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}
    #${MESSAGE_ID}.is-visible{opacity:1;transform:translate(-50%,0)}
    #${MESSAGE_ID} .recovery-back-coming-soon-card{display:flex;flex-direction:column;gap:5px;padding:14px 16px;border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(18,18,22,.97);box-shadow:0 14px 40px rgba(0,0,0,.42);color:#f7f7f8;text-align:center;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
    #${MESSAGE_ID} strong{font-size:15px;line-height:1.25;font-weight:800;letter-spacing:.01em}
    #${MESSAGE_ID} span{font-size:13px;line-height:1.4;color:#b8b8c1}
  `;

  document.head.appendChild(style);
  document.body.appendChild(message);
  return message;
}

let hideTimer = 0;
function showComingSoon() {
  const message = ensureMessage();
  window.clearTimeout(hideTimer);
  message.classList.remove('is-visible');
  requestAnimationFrame(() => message.classList.add('is-visible'));
  hideTimer = window.setTimeout(() => message.classList.remove('is-visible'), 2800);
}

function blockBackView(event) {
  const control = isBackFacingControl(event.target);
  if (!control) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  showComingSoon();
}

document.addEventListener('click', blockBackView, true);
