const GUIDE_IMAGE_PATHS = {
    "barbell-bench-press": "assets/exercise-guides/performance/barbell-bench-press-guide.webp?v=1",
    "dumbbell-bench-press": "assets/exercise-guides/performance/dumbbell-bench-press.webp?v=1",
    "incline-barbell-press": "assets/exercise-guides/performance/incline-barbell-press.webp?v=1",
    "incline-dumbbell-press": "assets/exercise-guides/performance/incline-dumbbell-press.webp?v=1",
    "machine-chest-press": "assets/exercise-guides/performance/machine-chest-press.webp?v=1",
    "cable-fly": "assets/exercise-guides/performance/cable-fly.webp?v=1",
    "pec-deck": "assets/exercise-guides/performance/pec-deck.webp?v=1",
    "push-up": "assets/exercise-guides/performance/push-up.webp?v=1"
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

function addGuideImage(exerciseId) {
    const source = GUIDE_IMAGE_PATHS[exerciseId];
    if (!source) return;

    const screen = document.querySelector(".exercise-guide-screen");
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

document.addEventListener("levelup:open-exercise-guide", event => {
    const exerciseId = event.detail?.exerciseId;
    if (!GUIDE_IMAGE_PATHS[exerciseId]) return;
    queueMicrotask(() => addGuideImage(exerciseId));
});
