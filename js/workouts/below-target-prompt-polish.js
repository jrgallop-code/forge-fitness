function polishBelowTargetPrompts(root = document) {
  root.querySelectorAll?.('.progression-prompt.progression-prompt-down').forEach(prompt => {
    const heading = prompt.querySelector('strong');
    if (heading) heading.textContent = 'Adjust load or rep range';

    const note = prompt.querySelector('small');
    const extra = 'You can reduce the load, or adjust the programmed rep range if a different range better matches your training goal.';
    if (note && !note.textContent.includes('adjust the programmed rep range')) {
      note.textContent = `${note.textContent.trim()} ${extra}`;
    }
  });
}

const observer = new MutationObserver(() => polishBelowTargetPrompts());
observer.observe(document.body, { childList: true, subtree: true });

document.addEventListener('click', event => {
  if (event.target.closest('.complete-set-btn')) setTimeout(() => polishBelowTargetPrompts(), 120);
});

polishBelowTargetPrompts();
