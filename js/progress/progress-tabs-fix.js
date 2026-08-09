function bindProgressTabs() {
    const weightButton = document.getElementById('weight-tab');
    const liftingButton = document.getElementById('lifting-tab');
    const weightSection = document.getElementById('weight-progress');
    const liftingSection = document.getElementById('lifting-progress');

    if (!weightButton || !liftingButton || !weightSection || !liftingSection) {
        return;
    }

    if (liftingButton.dataset.progressTabsFixed === 'true') {
        return;
    }

    liftingButton.dataset.progressTabsFixed = 'true';
    weightButton.dataset.progressTabsFixed = 'true';

    const showWeight = () => {
        weightSection.hidden = false;
        liftingSection.hidden = true;
        weightButton.classList.add('active');
        liftingButton.classList.remove('active');
    };

    const showLifting = () => {
        weightSection.hidden = true;
        liftingSection.hidden = false;
        liftingButton.classList.add('active');
        weightButton.classList.remove('active');

        // Charts/canvases can be measured incorrectly while hidden.
        // Let existing progress modules redraw after the section becomes visible.
        window.dispatchEvent(new Event('resize'));
    };

    weightButton.addEventListener('click', showWeight);
    liftingButton.addEventListener('click', showLifting);
}

const observer = new MutationObserver(() => bindProgressTabs());
observer.observe(document.body, { childList: true, subtree: true });
bindProgressTabs();
