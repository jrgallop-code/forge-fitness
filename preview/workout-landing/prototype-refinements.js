const root = document.getElementById("content");

if (root) {
  const observer = new MutationObserver(applyRefinements);
  observer.observe(document.body, { childList: true, subtree: true });
  applyRefinements();
  window.setTimeout(applyRefinements, 100);
  window.setTimeout(applyRefinements, 400);
}

function applyRefinements() {
  removeExtraCreateActions();
  mountAllPlansControl();
}

function removeExtraCreateActions() {
  document.querySelectorAll(
    '[data-preview-create-action="one-off"], [data-preview-create-action="templates"], [data-preview-create-action="all-routines"]'
  ).forEach(element => element.remove());

  root.querySelectorAll('#one-off-workout-btn, #one-off-workout-builder').forEach(element => {
    element.hidden = true;
    element.setAttribute('aria-hidden', 'true');
  });
}

function mountAllPlansControl() {
  const landing = root.querySelector('[data-preview-landing]');
  const strip = landing?.querySelector('.prototype-filter-strip');
  if (!landing || !strip || strip.querySelector('[data-preview-all-plans-control]')) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'prototype-filter prototype-all-plans-control';
  button.dataset.previewAllPlansControl = '';
  button.innerHTML = `
    <span class="prototype-filter-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>
    </span>
    <span><small>Browse</small><strong>All Plans</strong></span>
    <i>›</i>
  `;

  button.addEventListener('click', () => {
    const seeAll = landing.querySelector('[data-preview-see-all]');
    if (seeAll) {
      seeAll.click();
      return;
    }

    const allPlansSection = landing.querySelector('[data-preview-all-plans]');
    allPlansSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  strip.prepend(button);
}
