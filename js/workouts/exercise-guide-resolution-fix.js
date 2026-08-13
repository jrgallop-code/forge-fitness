const MUSCLE_IMAGE_PATHS = {
    "Chest": "assets/exercise-guides/chest.webp?v=1",
    "Triceps": "assets/exercise-guides/triceps.webp?v=1",
    "Front Delts": "assets/exercise-guides/front-delts.webp?v=1",
    "Lats": "assets/exercise-guides/lats.webp?v=1",
    "Upper Back": "assets/exercise-guides/upper-back.webp?v=1",
    "Rear Delts": "assets/exercise-guides/rear-delts.webp?v=1",
    "Biceps": "assets/exercise-guides/biceps.webp?v=1",
    "Forearms": "assets/exercise-guides/forearms.webp?v=1"
};

const CHEST_GUIDE_TITLES = new Set([
    "Barbell Bench Press",
    "Dumbbell Bench Press",
    "Incline Barbell Press",
    "Incline Dumbbell Press",
    "Machine Chest Press",
    "Cable Fly",
    "Pec Deck",
    "Push-Up"
]);

const ALIAS_GUIDES = {
    "plate loaded high row": {
        name: "Plate Loaded High Row",
        primary: ["Upper Back", "Lats"],
        secondary: ["Rear Delts", "Biceps"],
        setup: [
            "Adjust the seat and chest support so the handles line up comfortably with the upper-to-mid torso.",
            "Plant the feet securely and keep the chest supported before taking the load.",
            "Choose a load that lets the shoulders reach forward under control without losing torso position."
        ],
        execution: [
            "Pull the elbows back and slightly outward toward the upper ribs.",
            "Keep the chest against the pad and the shoulders away from the ears as the handles come toward the torso.",
            "Pause briefly, then return the handles slowly until the upper back and lats are comfortably lengthened."
        ],
        cues: ["Chest stays supported", "Elbows back", "Control the reach"],
        mistakes: [
            "Lifting the chest away from the pad to create momentum",
            "Shrugging the shoulders toward the ears",
            "Stopping the return before the shoulder blades can move forward naturally"
        ]
    },
    "underhand lat pulldown": {
        name: "Underhand Lat Pulldown",
        primary: ["Lats"],
        secondary: ["Biceps", "Upper Back", "Forearms"],
        setup: [
            "Adjust the thigh pad so the lower body stays secure during the pull.",
            "Take a comfortable underhand grip around shoulder width and sit tall beneath the cable.",
            "Begin with the arms long, chest lifted naturally and shoulders controlled rather than shrugged."
        ],
        execution: [
            "Drive the elbows down and slightly back while bringing the bar toward the upper chest.",
            "Keep the torso mostly still instead of leaning farther back to finish the repetition.",
            "Return the bar slowly until the arms are long and the lats are comfortably stretched."
        ],
        cues: ["Elbows down", "Chest tall", "Slow return"],
        mistakes: [
            "Turning the repetition into a large torso lean",
            "Pulling mainly with the hands instead of driving the elbows down",
            "Letting the bar snap upward at the end of the repetition"
        ]
    }
};

function normalizeName(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function ensureStyles() {
    if (document.getElementById("exercise-guide-resolution-fix-styles")) return;
    const style = document.createElement("style");
    style.id = "exercise-guide-resolution-fix-styles";
    style.textContent = `
        .exercise-guide-hero-figure.exercise-guide-anatomy-overview {
            margin: 14px 0 12px;
            padding: 12px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,.11);
            border-radius: 16px;
            background: #050506;
        }
        .exercise-guide-anatomy-overview figcaption {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 10px;
            margin: 0 2px 10px;
        }
        .exercise-guide-anatomy-overview figcaption strong { font-size: 13px; letter-spacing: .02em; }
        .exercise-guide-anatomy-overview figcaption small { color: #a0a0a0; font-size: 10px; }
        .exercise-guide-anatomy-strip {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            padding-bottom: 2px;
            scroll-snap-type: x proximity;
            scrollbar-width: thin;
        }
        .exercise-guide-anatomy-tile {
            flex: 0 0 min(36vw, 132px);
            min-width: 104px;
            padding: 7px;
            border: 1px solid rgba(255,255,255,.09);
            border-radius: 12px;
            background: #0b0b0d;
            scroll-snap-align: start;
        }
        .exercise-guide-anatomy-tile img {
            display: block;
            width: 100%;
            aspect-ratio: 4 / 5;
            object-fit: cover;
            object-position: center;
            border-radius: 8px;
            background: #000;
        }
        .exercise-guide-anatomy-tile strong,
        .exercise-guide-anatomy-tile small { display: block; }
        .exercise-guide-anatomy-tile strong { margin-top: 7px; font-size: 11px; line-height: 1.2; }
        .exercise-guide-anatomy-tile small {
            margin-top: 3px;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: .07em;
            text-transform: uppercase;
        }
        .exercise-guide-anatomy-tile small.primary { color: #ff4d55; }
        .exercise-guide-anatomy-tile small.secondary { color: #ffad5c; }
        @media (max-width: 390px) { .exercise-guide-anatomy-tile { flex-basis: 112px; } }
    `;
    document.head.appendChild(style);
}

function anatomyItems(primary = [], secondary = []) {
    return [
        ...primary.map(name => ({ name, role: "primary" })),
        ...secondary.map(name => ({ name, role: "secondary" }))
    ].filter(item => MUSCLE_IMAGE_PATHS[item.name]);
}

function createAnatomyCarousel(items) {
    if (!items.length) return null;
    ensureStyles();
    const figure = document.createElement("figure");
    figure.className = "exercise-guide-hero-figure exercise-guide-anatomy-overview";
    figure.innerHTML = `
        <figcaption><strong>Muscle diagram</strong><small>Primary + secondary muscles</small></figcaption>
        <div class="exercise-guide-anatomy-strip">
            ${items.map(item => `
                <div class="exercise-guide-anatomy-tile">
                    <img src="${escapeHtml(MUSCLE_IMAGE_PATHS[item.name])}" alt="${escapeHtml(item.name)} highlighted" loading="eager" decoding="async">
                    <strong>${escapeHtml(item.name)}</strong>
                    <small class="${item.role}">${item.role}</small>
                </div>
            `).join("")}
        </div>
    `;
    return figure;
}

function convertChestGuideToCarousel(screen) {
    if (!(screen instanceof Element) || !screen.matches(".exercise-guide-screen")) return;
    const title = screen.querySelector(".exercise-guide-header h2")?.textContent?.trim();
    if (!CHEST_GUIDE_TITLES.has(title) || screen.dataset.standardCarouselReady === "1") return;

    const items = [...screen.querySelectorAll(".exercise-muscle-card")]
        .map(card => ({
            name: card.querySelector("strong")?.textContent?.trim(),
            image: card.querySelector("img")?.getAttribute("src"),
            role: card.querySelector("span.primary") ? "primary" : "secondary"
        }))
        .filter(item => item.name && item.image);

    if (!items.length) return;
    ensureStyles();
    screen.querySelectorAll(".exercise-guide-hero-figure").forEach(node => node.remove());

    const header = screen.querySelector(".exercise-guide-header");
    if (!header) return;
    const figure = document.createElement("figure");
    figure.className = "exercise-guide-hero-figure exercise-guide-anatomy-overview";
    figure.innerHTML = `
        <figcaption><strong>Muscle diagram</strong><small>Primary + secondary muscles</small></figcaption>
        <div class="exercise-guide-anatomy-strip">
            ${items.map(item => `
                <div class="exercise-guide-anatomy-tile">
                    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)} highlighted" loading="eager" decoding="async">
                    <strong>${escapeHtml(item.name)}</strong>
                    <small class="${item.role}">${item.role}</small>
                </div>
            `).join("")}
        </div>
    `;
    header.insertAdjacentElement("afterend", figure);
    screen.dataset.standardCarouselReady = "1";
}

function renderAliasGuide(guide) {
    const sourceScreen = document.querySelector("#workout-plan-detail-screen");
    const page = sourceScreen?.closest(".workout-page");
    if (!sourceScreen || !page) return;

    const previousScrollY = window.scrollY;
    page.querySelector(".exercise-guide-screen")?.remove();

    const screen = document.createElement("section");
    screen.className = "exercise-guide-screen";
    screen.dataset.aliasGuide = normalizeName(guide.name);
    screen.innerHTML = `
        <button class="plan-detail-back exercise-guide-back" type="button">← Workout Plan</button>
        <header class="exercise-guide-header">
            <span class="eyebrow">EXERCISE GUIDE</span>
            <h2>${escapeHtml(guide.name)}</h2>
            <p>Use these instructions as general technique guidance. Choose a comfortable range of motion and stop if an exercise causes pain.</p>
        </header>
        <section class="exercise-guide-section">
            <h3>Setup</h3>
            <ol>${guide.setup.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        </section>
        <section class="exercise-guide-section">
            <h3>How to Perform It</h3>
            <ol>${guide.execution.map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
        </section>
        <section class="exercise-guide-section exercise-cue-section">
            <h3>Key Cues</h3>
            <div class="exercise-cue-list">${guide.cues.map(cue => `<span>${escapeHtml(cue)}</span>`).join("")}</div>
        </section>
        <section class="exercise-guide-section">
            <h3>Common Mistakes</h3>
            <ul>${guide.mistakes.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
    `;

    const carousel = createAnatomyCarousel(anatomyItems(guide.primary, guide.secondary));
    const header = screen.querySelector(".exercise-guide-header");
    if (carousel && header) header.insertAdjacentElement("afterend", carousel);

    sourceScreen.hidden = true;
    sourceScreen.insertAdjacentElement("beforebegin", screen);
    screen.querySelector(".exercise-guide-back")?.addEventListener("click", () => {
        screen.remove();
        sourceScreen.hidden = false;
        requestAnimationFrame(() => window.scrollTo({ top: previousScrollY, behavior: "auto" }));
    });
    requestAnimationFrame(() => screen.scrollIntoView({ behavior: "auto", block: "start" }));
}

function enhanceAliasRows(root = document) {
    root.querySelectorAll?.(".plan-detail-exercise-row:not([data-alias-guide-ready])").forEach(row => {
        if (row.classList.contains("has-exercise-guide")) return;
        const nameNode = row.querySelector(".plan-detail-exercise-name");
        const guide = ALIAS_GUIDES[normalizeName(nameNode?.textContent)];
        if (!guide || !nameNode) return;

        row.dataset.aliasGuideReady = "1";
        row.classList.add("has-exercise-guide", "has-generated-exercise-guide");
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.setAttribute("aria-label", `Open ${guide.name} exercise guide`);
        if (!nameNode.querySelector(".exercise-guide-label")) {
            nameNode.insertAdjacentHTML("beforeend", '<span class="exercise-guide-label">Form guide</span>');
        }

        const open = event => {
            event?.preventDefault?.();
            renderAliasGuide(guide);
        };
        row.addEventListener("click", open);
        row.addEventListener("keydown", event => {
            if (event.key !== "Enter" && event.key !== " ") return;
            open(event);
        });
    });
}

function processAddedNode(node) {
    if (!(node instanceof Element)) return;
    if (node.matches(".exercise-guide-screen")) convertChestGuideToCarousel(node);
    node.querySelectorAll?.(".exercise-guide-screen").forEach(convertChestGuideToCarousel);
    enhanceAliasRows(node);
}

const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => mutation.addedNodes.forEach(processAddedNode));
});
observer.observe(document.documentElement, { childList: true, subtree: true });
document.querySelectorAll(".exercise-guide-screen").forEach(convertChestGuideToCarousel);
enhanceAliasRows();

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
