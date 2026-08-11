const GUIDE_IMAGE_PATHS = {
    "barbell-bench-press": "assets/exercise-guides/performance/barbell-bench-press-guide.webp?v=1",
    "dumbbell-bench-press": "assets/exercise-guides/performance/dumbbell-bench-press.webp?v=2",
    "incline-barbell-press": "assets/exercise-guides/performance/incline-barbell-press.webp?v=1",
    "incline-dumbbell-press": "assets/exercise-guides/performance/incline-dumbbell-press.webp?v=1",
    "machine-chest-press": "assets/exercise-guides/performance/machine-chest-press.webp?v=1",
    "cable-fly": "assets/exercise-guides/performance/cable-fly.webp?v=1",
    "pec-deck": "assets/exercise-guides/performance/pec-deck.webp?v=1",
    "push-up": "assets/exercise-guides/performance/push-up.webp?v=1"
};

const GUIDE_IDS_BY_NAME = {
    "Barbell Bench Press": "barbell-bench-press",
    "Dumbbell Bench Press": "dumbbell-bench-press",
    "Incline Barbell Press": "incline-barbell-press",
    "Incline Dumbbell Press": "incline-dumbbell-press",
    "Machine Chest Press": "machine-chest-press",
    "Cable Fly": "cable-fly",
    "Pec Deck": "pec-deck",
    "Push-Up": "push-up"
};

let stylesAdded = false;

function ensureStyles() {
    if (stylesAdded || document.getElementById("exercise-guide-hero-image-styles")) return;
    stylesAdded = true;
    const style = document.createElement("style");
    style.id = "exercise-guide-hero-image-styles";
    style.textContent = `
        .exercise-guide-hero-figure {
            margin: 14px 0 12px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,.11);
            border-radius: 16px;
            background: #050506;
        }
        .exercise-guide-hero-figure img {
            display: block;
            width: 100%;
            height: auto;
            aspect-ratio: 3 / 2;
            object-fit: cover;
            background: #000;
        }
    `;
    document.head.appendChild(style);
}

function addGuideImage(exerciseId, targetScreen = null) {
    const source = GUIDE_IMAGE_PATHS[exerciseId];
    if (!source) return;

    const screen = targetScreen || document.querySelector(".exercise-guide-screen");
    const header = screen?.querySelector(".exercise-guide-header");
    if (!screen || !header || screen.querySelector(".exercise-guide-hero-figure")) return;

    ensureStyles();

    const figure = document.createElement("figure");
    figure.className = "exercise-guide-hero-figure";

    const image = document.createElement("img");
    image.src = source;
    image.alt = `${exerciseId.replaceAll("-", " ")} anatomy guide showing primary muscles in red and secondary muscles in orange`;
    image.loading = "eager";
    image.decoding = "async";

    figure.appendChild(image);
    header.insertAdjacentElement("afterend", figure);
}

function addImageToRenderedGuide(screen) {
    if (!(screen instanceof Element) || !screen.matches(".exercise-guide-screen")) return;
    const title = screen.querySelector(".exercise-guide-header h2")?.textContent?.trim();
    const exerciseId = GUIDE_IDS_BY_NAME[title];
    if (exerciseId) addGuideImage(exerciseId, screen);
}

document.addEventListener("levelup:open-exercise-guide", event => {
    const exerciseId = event.detail?.exerciseId;
    if (!GUIDE_IMAGE_PATHS[exerciseId]) return;
    queueMicrotask(() => addGuideImage(exerciseId));
});

const guideObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (!(node instanceof Element)) return;
            if (node.matches(".exercise-guide-screen")) addImageToRenderedGuide(node);
            node.querySelectorAll?.(".exercise-guide-screen").forEach(addImageToRenderedGuide);
        });
    });
});

guideObserver.observe(document.documentElement, { childList: true, subtree: true });
document.querySelectorAll(".exercise-guide-screen").forEach(addImageToRenderedGuide);
