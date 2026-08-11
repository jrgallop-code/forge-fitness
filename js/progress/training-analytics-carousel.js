const TRAINING_VIEW_SELECTOR = '.training-progress-view[data-view="training"]';
const EXCLUDED_CARD_IDS = new Set(["muscle-frequency-card"]);

export function initializeTrainingAnalyticsCarousel() {
    setupCarousel();

    document
        .querySelectorAll('.training-progress-tab[data-view="training"]')
        .forEach(button => {
            button.addEventListener("click", () =>
                requestAnimationFrame(setupCarousel)
            );
        });

    ["load-training-demo", "remove-training-demo"].forEach(id => {
        document.getElementById(id)?.addEventListener("click", () => {
            setTimeout(setupCarousel, 0);
        });
    });
}

function setupCarousel() {
    const view = document.querySelector(TRAINING_VIEW_SELECTOR);
    if (!view) return;

    let shell = view.querySelector(".training-analytics-carousel");
    let track = shell?.querySelector(".training-analytics-carousel-track");

    if (!shell) {
        shell = document.createElement("div");
        shell.className = "training-analytics-carousel";
        shell.setAttribute("aria-label", "Training analytics");

        track = document.createElement("div");
        track.className = "training-analytics-carousel-track";
        shell.appendChild(track);
        view.prepend(shell);
    }

    const cards = [
        ...view.querySelectorAll(":scope > .analytics-card"),
        ...track.querySelectorAll(":scope > .analytics-card")
    ].filter(card => !EXCLUDED_CARD_IDS.has(card.id));

    cards.forEach(card => {
        card.classList.add("training-analytics-slide");
        track.appendChild(card);
    });

    if (!cards.length) return;

    ensureControls(shell, track, cards.length);
    updateCarouselState(shell, track, cards.length);
}

function ensureControls(shell, track, count) {
    let controls = shell.querySelector(".training-analytics-carousel-controls");

    if (!controls) {
        controls = document.createElement("div");
        controls.className = "training-analytics-carousel-controls";
        controls.innerHTML = `
            <button class="training-carousel-arrow training-carousel-prev" type="button" aria-label="Previous analytics page">‹</button>
            <div class="training-carousel-status" aria-live="polite"></div>
            <button class="training-carousel-arrow training-carousel-next" type="button" aria-label="Next analytics page">›</button>
        `;
        shell.appendChild(controls);

        controls.querySelector(".training-carousel-prev")?.addEventListener("click", () => {
            scrollToPage(shell, track, getActiveIndex(track) - 1);
        });

        controls.querySelector(".training-carousel-next")?.addEventListener("click", () => {
            scrollToPage(shell, track, getActiveIndex(track) + 1);
        });

        let ticking = false;
        track.addEventListener("scroll", () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                updateCarouselState(shell, track, getSlides(track).length);
                ticking = false;
            });
        }, { passive: true });
    }

    const status = controls.querySelector(".training-carousel-status");
    if (status) {
        status.innerHTML = `
            <span class="training-carousel-page-text"></span>
            <span class="training-carousel-dots" aria-hidden="true">
                ${Array.from({ length: count }, (_, index) =>
                    `<i class="training-carousel-dot" data-index="${index}"></i>`
                ).join("")}
            </span>
        `;
    }
}

function updateCarouselState(shell, track, count) {
    if (!count) return;

    const index = Math.max(0, Math.min(count - 1, getActiveIndex(track)));
    const controls = shell.querySelector(".training-analytics-carousel-controls");
    const pageText = controls?.querySelector(".training-carousel-page-text");
    const previous = controls?.querySelector(".training-carousel-prev");
    const next = controls?.querySelector(".training-carousel-next");

    if (pageText) pageText.textContent = `${index + 1} / ${count}`;
    if (previous) previous.disabled = index === 0;
    if (next) next.disabled = index === count - 1;

    controls?.querySelectorAll(".training-carousel-dot").forEach((dot, dotIndex) => {
        dot.classList.toggle("active", dotIndex === index);
    });
}

function getActiveIndex(track) {
    const slides = getSlides(track);
    if (!slides.length) return 0;

    const width = track.clientWidth || 1;
    return Math.round(track.scrollLeft / width);
}

function getSlides(track) {
    return [...track.querySelectorAll(":scope > .training-analytics-slide")];
}

function scrollToPage(shell, track, index) {
    const slides = getSlides(track);
    if (!slides.length) return;

    const target = Math.max(0, Math.min(slides.length - 1, index));
    track.scrollTo({
        left: target * track.clientWidth,
        behavior: "smooth"
    });
    updateCarouselState(shell, track, slides.length);
}
