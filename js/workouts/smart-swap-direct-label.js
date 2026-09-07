const STYLE_ID = 'smart-swap-inline-layout-style';

function ensureLayoutStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #workout-session-logger .logger-exercise-tools {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    #workout-session-logger .logger-exercise-tools .session-inline-swap {
      position: static !important;
      width: auto !important;
      min-height: 32px !important;
      margin: 0 !important;
      padding: 5px 9px !important;
      border-radius: 9px !important;
      font-size: 11px !important;
      line-height: 1.1 !important;
    }
  `;
  document.head.appendChild(style);
}

function placeSmartSwapButton(button) {
  const card = button.closest('.session-exercise-card');
  const tools = card?.querySelector('.logger-exercise-tools');
  if (!card || !tools) return;

  const warmup = tools.querySelector('.exercise-warmup-btn') || card.querySelector('.exercise-warmup-btn');
  if (warmup) {
    if (button.previousElementSibling !== warmup) warmup.insertAdjacentElement('afterend', button);
    return;
  }

  if (button.parentElement !== tools) tools.appendChild(button);
}

function labelSmartSwapButtons() {
  ensureLayoutStyles();
  document.querySelectorAll('.session-inline-swap').forEach(button => {
    if (button.dataset.smartSwapLabelled !== 'true') {
      const exerciseName = button.getAttribute('aria-label')
        ?.replace(/^Swap\s+/i, '')
        ?.replace(/\s+for today only$/i, '')
        ?.trim();

      button.textContent = 'Smart Swap';
      button.classList.add('session-inline-smart-swap');
      button.dataset.smartSwapLabelled = 'true';
      button.setAttribute(
        'aria-label',
        `Smart Swap ${exerciseName || 'exercise'} for a similar alternative today only`
      );
    }

    placeSmartSwapButton(button);
  });
}

const observer = new MutationObserver(() => requestAnimationFrame(labelSmartSwapButtons));
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener('click', event => {
  if (event.target.closest('[data-page="workout"], .nav-workout, #begin-session-btn, .exercise-carousel-controls, .logger-exercise-strip')) {
    setTimeout(labelSmartSwapButtons, 0);
    setTimeout(labelSmartSwapButtons, 100);
    setTimeout(labelSmartSwapButtons, 400);
  }
});

labelSmartSwapButtons();
