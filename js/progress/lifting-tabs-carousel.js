const STRIP_SELECTOR = ".training-progress-tabs";
const TAB_SELECTOR = ".training-progress-tab";

function centerTab(tab, behavior = "smooth") {
    const strip = tab?.closest(STRIP_SELECTOR);
    if (!strip || strip.scrollWidth <= strip.clientWidth) return;

    const desiredLeft = tab.offsetLeft - ((strip.clientWidth - tab.offsetWidth) / 2);
    const maxLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);

    strip.scrollTo({
        left: Math.max(0, Math.min(maxLeft, desiredLeft)),
        behavior
    });
}

function centerActiveTab(behavior = "auto") {
    const strip = document.querySelector(STRIP_SELECTOR);
    centerTab(strip?.querySelector(`${TAB_SELECTOR}.active`), behavior);
}

document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const tab = target.closest(`${STRIP_SELECTOR} ${TAB_SELECTOR}`);
    if (tab) {
        requestAnimationFrame(() => centerTab(tab));
        return;
    }

    if (target.closest("#lifting-tab")) {
        requestAnimationFrame(() => requestAnimationFrame(() => centerActiveTab()));
    }
});

window.addEventListener("resize", () => centerActiveTab(), { passive: true });
