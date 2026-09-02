const VIEW_KEY = "level_up_whats_new_2026_09_views";
const SESSION_KEY = "level_up_cloud_session";
const TRAINING_PREFERENCES_KEY = "level_up_training_preferences";
const MAX_VIEWS = 2;
let memoryViews = 0;

const ICONS = {
    appearance: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 0-3.6h-.7a1.7 1.7 0 0 1 0-3.4H15a6 6 0 0 0 0-12h-3Z"/><circle cx="7.4" cy="10" r="1"/><circle cx="9" cy="6.8" r="1"/><circle cx="13" cy="6" r="1"/><circle cx="16.3" cy="8.2" r="1"/></svg>`,
    research: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>`,
    program: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h3v6H3zM6 7h3v10H6zM9 11h6v2H9zM15 7h3v10h-3zM18 9h3v6h-3z"/></svg>`,
    progress: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-6"/><path d="M16.5 7H19v2.5"/></svg>`,
    weight: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8a3 3 0 0 1 6 0M12 11v4M12 11l2 2"/></svg>`,
    workout: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h3v6H3zM6 7h3v10H6zM9 11h6v2H9zM15 7h3v10h-3zM18 9h3v6h-3z"/><path d="M12 4v3M10.5 5.5h3"/></svg>`
};

const CHANGES = [
    ["appearance", "Make Level Up yours", "Choose from seven polished themes, including Arctic, Ocean and Midnight. System mode now follows your local day and night."],
    ["research", "Explore the research", "Read reviewed muscle-growth and nutrition summaries, open the original studies and save useful evidence for later."],
    ["program", "Programs built around you", "The coach-led builder now creates a more personal plan around your schedule, experience, equipment and muscle priorities."],
    ["progress", "See progress more clearly", "Track training volume, estimated 1RM, strength improvements and muscle recovery in one connected progress experience."],
    ["weight", "Understand weight changes", "New weight, calorie and carbohydrate insights help separate real trends from normal day-to-day fluctuations."],
    ["workout", "Smoother workouts and form guides", "Use clearer anatomy guides, Smart Swap, RIR, supersets and drop sets without breaking the flow of your session."]
];

function getStoredViews() {
    try {
        const stored = Number.parseInt(localStorage.getItem(VIEW_KEY) || "0", 10);
        return Number.isFinite(stored) ? Math.max(0, stored) : 0;
    } catch {
        return memoryViews;
    }
}

function storeViews(views) {
    memoryViews = views;
    try {
        localStorage.setItem(VIEW_KEY, String(views));
    } catch {
        // The in-memory fallback still prevents repeated displays in this session.
    }
}

function renderChangeCard([icon, title, description]) {
    return `
        <article class="whats-new-card">
            <span class="whats-new-card-icon">${ICONS[icon]}</span>
            <div>
                <h3>${title}</h3>
                <p>${description}</p>
            </div>
        </article>`;
}

function isSignedInAndOnboarded() {
    try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        const signedIn = Boolean(session?.token) && (!session.expiresAt || Date.parse(session.expiresAt) > Date.now());
        if (!signedIn) return false;
        const preferences = JSON.parse(localStorage.getItem(TRAINING_PREFERENCES_KEY) || "null");
        return Boolean(preferences?.onboardingComplete || preferences?.onboardingSkipped);
    } catch {
        return false;
    }
}

export function showWhatsNewIfEligible() {
    if (document.querySelector(".whats-new-overlay")) return true;
    if (!isSignedInAndOnboarded()) return false;

    const views = getStoredViews();
    if (views >= MAX_VIEWS) return false;

    const nextView = views + 1;
    storeViews(nextView);

    const overlay = document.createElement("section");
    overlay.className = "whats-new-overlay";
    overlay.dataset.whatsNewView = String(nextView);
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "whats-new-title");
    overlay.innerHTML = `
        <div class="whats-new-shell">
            <button class="whats-new-close" type="button" data-whats-new-close aria-label="Close What's New">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
            </button>
            <header class="whats-new-hero">
                <span class="eyebrow">LEVEL UP · WHAT'S NEW</span>
                <h2 id="whats-new-title">A stronger app, built around your training.</h2>
                <p>Fresh ways to personalize your experience, build better programs and understand the work you put in.</p>
                <div class="whats-new-view-count" aria-label="View ${nextView} of ${MAX_VIEWS}">
                    <span class="is-active"></span><span class="${nextView === MAX_VIEWS ? "is-active" : ""}"></span>
                    <b>${nextView} of ${MAX_VIEWS}</b>
                </div>
            </header>
            <div class="whats-new-grid">${CHANGES.map(renderChangeCard).join("")}</div>
            <footer class="whats-new-footer">
                <p>${nextView === MAX_VIEWS ? "This is the final automatic preview." : "We'll show this once more so you have time to explore."}</p>
                <button class="primary-btn whats-new-done" type="button" data-whats-new-close>Got it</button>
            </footer>
        </div>`;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.appendChild(overlay);

    const close = () => {
        if (!overlay.isConnected) return;
        document.removeEventListener("keydown", onKeydown);
        overlay.remove();
        document.body.style.overflow = previousOverflow;
    };
    const onKeydown = event => {
        if (event.key === "Escape") close();
    };

    overlay.querySelectorAll("[data-whats-new-close]").forEach(button => button.addEventListener("click", close));
    overlay.addEventListener("click", event => {
        if (event.target === overlay) close();
    });
    document.addEventListener("keydown", onKeydown);
    requestAnimationFrame(() => overlay.querySelector(".whats-new-close")?.focus());
    return true;
}

export { VIEW_KEY, MAX_VIEWS };
