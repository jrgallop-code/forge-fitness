function labelSmartSwapButtons() {
  document.querySelectorAll('.session-inline-swap').forEach(button => {
    if (button.dataset.smartSwapLabelled === 'true') return;
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
  });
}

const observer = new MutationObserver(() => requestAnimationFrame(labelSmartSwapButtons));
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener('click', event => {
  if (event.target.closest('[data-page="workout"], .nav-workout, #begin-session-btn')) {
    setTimeout(labelSmartSwapButtons, 0);
    setTimeout(labelSmartSwapButtons, 100);
    setTimeout(labelSmartSwapButtons, 400);
  }
});

labelSmartSwapButtons();
