import {
    getFormGuideMuscleVisual,
    renderFormGuideMuscleSvg
} from "./form-guide-anatomy.js?v=form-guide-anatomy-2";

const STYLE_ID = "form-guide-direct-recovery-svg-styles";

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
        .exercise-guide-screen .exercise-muscle-image-frame > img[src*="assets/exercise-guides/"],
        .exercise-guide-screen .exercise-guide-anatomy-tile > img[src*="assets/exercise-guides/"] {
            display: none !important;
        }

        .exercise-guide-screen .exercise-muscle-image-frame .form-guide-muscle-svg {
            display: block;
            width: 100%;
            height: 100%;
        }

        .exercise-guide-screen .exercise-guide-anatomy-strip {
            align-items: flex-start;
            padding-bottom: 6px;
        }

        .exercise-guide-screen .exercise-guide-anatomy-tile {
            align-self: flex-start;
            box-sizing: border-box;
            height: auto;
            min-height: 0;
            overflow: visible;
        }

        .exercise-guide-screen .exercise-guide-anatomy-tile .form-guide-muscle-svg {
            display: block;
            width: 100%;
            height: auto;
            aspect-ratio: 4 / 5;
            border-radius: 8px;
            background: #000;
        }

        .exercise-guide-screen .exercise-guide-anatomy-tile strong,
        .exercise-guide-screen .exercise-guide-anatomy-tile small {
            position: relative;
            display: block;
            visibility: visible;
            opacity: 1;
        }

        .exercise-guide-screen .exercise-guide-anatomy-tile strong {
            margin-top: 7px;
            min-height: 1.2em;
        }

        .exercise-guide-screen .exercise-guide-anatomy-tile small {
            margin-top: 3px;
            padding-bottom: 2px;
            min-height: 1.1em;
        }

        .exercise-guide-screen .form-guide-anatomy-base {
            opacity: .74;
        }

        .exercise-guide-screen .form-guide-muscle-highlight {
            fill: #ff315f;
            opacity: .98;
            filter: drop-shadow(0 0 8px rgba(255,49,95,.32));
        }
    `;
    document.head.appendChild(style);
}

function muscleNameFromCard(card) {
    return card?.querySelector("strong")?.textContent?.trim() || "";
}

function replaceLegacyFrame(frame) {
    const card = frame?.closest(".exercise-muscle-card");
    const muscle = muscleNameFromCard(card);
    const config = getFormGuideMuscleVisual(muscle);
    if (!frame || !config) return;

    const svg = renderFormGuideMuscleSvg(config);
    if (!svg) return;

    if (frame.dataset.formGuideDirectRecoverySvg === muscle && frame.querySelector(".form-guide-muscle-svg")) {
        return;
    }

    frame.innerHTML = svg;
    frame.dataset.formGuideDirectRecoverySvg = muscle;
    frame.dataset.formGuideAnatomy = muscle;
    frame.classList.add("form-guide-anatomy-frame");
}

function replaceLegacyTile(tile) {
    const muscle = tile?.querySelector("strong")?.textContent?.trim() || "";
    const config = getFormGuideMuscleVisual(muscle);
    if (!tile || !config) return;

    if (tile.dataset.formGuideDirectRecoverySvg === muscle && tile.querySelector(".form-guide-muscle-svg")) {
        return;
    }

    const svg = renderFormGuideMuscleSvg(config);
    if (!svg) return;

    const existingSvg = tile.querySelector(".form-guide-muscle-svg");
    if (existingSvg) {
        existingSvg.outerHTML = svg;
    } else {
        const legacyImage = tile.querySelector("img");
        if (legacyImage) legacyImage.outerHTML = svg;
        else tile.insertAdjacentHTML("afterbegin", svg);
    }

    tile.dataset.formGuideDirectRecoverySvg = muscle;
}

function upgradeGuide(root) {
    if (!(root instanceof Element) && root !== document) return;

    const screens = [];
    if (root instanceof Element && root.matches(".exercise-guide-screen")) screens.push(root);
    root.querySelectorAll?.(".exercise-guide-screen").forEach(screen => screens.push(screen));

    screens.forEach(screen => {
        screen.querySelectorAll(".exercise-muscle-image-frame").forEach(replaceLegacyFrame);
        screen.querySelectorAll(".exercise-guide-anatomy-tile").forEach(replaceLegacyTile);
    });
}

ensureStyles();
upgradeGuide(document);

const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (!(node instanceof Element)) return;
            upgradeGuide(node);

            const guide = node.closest?.(".exercise-guide-screen");
            if (guide) upgradeGuide(guide);
        });
    });
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

document.addEventListener("levelup:open-exercise-guide", () => {
    requestAnimationFrame(() => upgradeGuide(document));
});
