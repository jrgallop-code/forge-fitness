const GUIDE_IMAGE_DATA = {
    "barbell-bench-press": "assets/exercise-guides/performance/barbell-bench-press.b64?v=1"
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

async function addGuideImage(exerciseId) {
    const source = GUIDE_IMAGE_DATA[exerciseId];
    if (!source) return;

    const screen = document.querySelector(".exercise-guide-screen");
    const header = screen?.querySelector(".exercise-guide-header");
    if (!screen || !header || screen.querySelector(".exercise-guide-hero-figure")) return;

    ensureStyles();

    try {
        const response = await fetch(source, { cache: "force-cache" });
        if (!response.ok) return;
        const base64 = (await response.text()).trim();
        if (!base64) return;

        const figure = document.createElement("figure");
        figure.className = "exercise-guide-hero-figure";

        const image = document.createElement("img");
        image.src = `data:image/webp;base64,${base64}`;
        image.alt = "Barbell Bench Press anatomy guide showing primary muscles in red and secondary muscles in orange";
        image.decoding = "async";

        figure.appendChild(image);
        header.insertAdjacentElement("afterend", figure);
    }
    catch (error) {
        console.warn("Exercise guide image could not load:", error);
    }
}

document.addEventListener("levelup:open-exercise-guide", event => {
    const exerciseId = event.detail?.exerciseId;
    if (!GUIDE_IMAGE_DATA[exerciseId]) return;
    queueMicrotask(() => addGuideImage(exerciseId));
});
