import { navigate } from "../core/router.js?v=progress-nav-stability-1";

export function renderNavbar() {
    return `
        <nav class="bottom-nav" aria-label="Primary navigation">
            <button class="nav-btn active" data-page="home" aria-label="Dashboard" type="button">
                <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"/>
                </svg>
                <span>Dashboard</span>
            </button>

            <button class="nav-btn" data-page="workout" aria-label="Workout" type="button">
                <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2.5 8h2v8h-2V8Zm2-2h3v12h-3V6Zm3 4h9v4h-9v-4Zm9-4h3v12h-3V6Zm3 2h2v8h-2V8Z"/>
                </svg>
                <span>Workout</span>
            </button>

            <button class="nav-btn" data-page="progress" aria-label="Progress" type="button">
                <svg class="nav-icon nav-icon-stroke" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 18.5V5.5M4 18.5h16"/>
                    <path d="m7 15 4-4 3 2 5-6"/>
                    <path d="M16.5 7H19v2.5"/>
                </svg>
                <span>Progress</span>
            </button>

            <button class="nav-btn" data-page="energy" aria-label="Nutrition" type="button">
                <svg class="nav-icon nav-icon-stroke" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 3v5M8 3v5M11 3v5M5 8c0 1.7 1.3 3 3 3s3-1.3 3-3M8 11v10"/>
                    <path d="M18 3v18M18 3c-2.3 2.4-3.5 5-3.5 8H18"/>
                </svg>
                <span>Nutrition</span>
            </button>

            <button class="nav-btn" data-page="more" aria-label="More" type="button">
                <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="5" cy="12" r="2.1"/>
                    <circle cx="12" cy="12" r="2.1"/>
                    <circle cx="19" cy="12" r="2.1"/>
                </svg>
                <span>More</span>
            </button>
        </nav>
    `;
}

export function initializeNavbar() {
    const nav = document.querySelector(".bottom-nav");

    if (!nav || nav.dataset.bound === "true") {
        return;
    }

    nav.dataset.bound = "true";

    nav.addEventListener("click", event => {
        const button = event.target.closest(".nav-btn");

        if (!button || !nav.contains(button)) {
            return;
        }

        const page = button.dataset.page;

        if (!page) {
            return;
        }

        event.preventDefault();

        button.classList.remove("nav-pulse");
        void button.offsetWidth;
        button.classList.add("nav-pulse");
        button.addEventListener("animationend", () => button.classList.remove("nav-pulse"), { once: true });

        nav.querySelectorAll(".nav-btn").forEach(item => {
            item.classList.toggle("active", item === button);
        });

        try {
            navigate(page);
        }
        catch (error) {
            console.error(`Navigation to ${page} failed:`, error);
        }
    });
}
