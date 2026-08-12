function updateExperienceCopy(root = document) {
    const card = [...root.querySelectorAll?.('.smart-question-card') || []].find(item => item.querySelector('[data-experience]'));
    if (!card) return;

    const heading = card.querySelector('h4');
    const intro = card.querySelector('h4 + p');
    if (heading) heading.textContent = 'What best describes your lifting experience?';
    if (intro) intro.textContent = 'Years are only a guide—choose the description that fits you best.';

    const copy = {
        beginner: ['Beginner — ~0–1 year', 'Still developing technique and learning consistent progression.'],
        intermediate: ['Intermediate — ~1–3 years', 'Solid technique and comfortable with progressive overload.'],
        advanced: ['Advanced — ~3+ years', 'Highly experienced; progress is slower and requires more precise programming.']
    };

    card.querySelectorAll('[data-experience]').forEach(button => {
        const value = button.dataset.experience;
        const details = copy[value];
        if (!details) return;
        const title = button.querySelector('strong');
        const description = button.querySelector('small');
        if (title) title.textContent = details[0];
        if (description) description.textContent = details[1];
    });

    if (!card.querySelector('[data-experience-guide-note]')) {
        const body = card.querySelector('.smart-question-body');
        if (body) {
            const note = document.createElement('p');
            note.className = 'smart-helper';
            note.dataset.experienceGuideNote = '';
            note.textContent = 'Not sure? Choose Intermediate.';
            body.appendChild(note);
        }
    }
}

const observer = new MutationObserver(() => updateExperienceCopy(document));
observer.observe(document.body, { childList: true, subtree: true });
updateExperienceCopy(document);
