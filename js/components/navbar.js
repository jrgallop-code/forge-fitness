import { navigate }
from "../core/router.js?v=router-nav-stable-1";


export function renderNavbar() {
    return `
        <nav class="bottom-nav" aria-label="Primary navigation">
            <button class="nav-btn active" data-page="home" aria-label="Home" type="button">
                <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6.5H9V21H3.5a.5.5 0 0 1-.5-.5v-9.7Z"/>
                </svg>
                <span>Home</span>
            </button>

            <button class="nav-btn" data-page="workout" aria-label="Workout" type="button">
                <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15.9 4.1c.8.2 1.5.9 1.6 1.8l.3 2.1h1.7c.8 0 1.5.7 1.5 1.5V12c0 1.1-.9 2-2 2h-2.1c-.5 0-.9-.2-1.3-.5l-1.4-1.3-1.8 2.2c-.8 1-2 1.6-3.3 1.6H6.6l-.7 2.2c-.2.6-.8 1-1.4.8-.6-.2-1-.8-.8-1.4l1-3.1c.2-.6.8-1 1.4-1h3c.6 0 1.1-.3 1.5-.7l2.2-2.7-1.1-2.4c-.3-.7 0-1.5.7-1.8.7-.3 1.5 0 1.8.7l.7 1.6h.7l-.2-1.9c-.1-.8.2-1.6.5-2.2Z"/>
                    <path d="M18.2 3.1a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8ZM6 16h7.1c1.3 0 2.4 1.1 2.4 2.4V20H6v-4Z"/>
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

            <button class="nav-btn" data-page="energy" aria-label="Calorie Planner" type="button">
                <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M13.6 2.4c.3 2.4-.5 4.1-2 5.6-1.3 1.2-2.2 2.4-2.1 4.1 0 .9.4 1.6 1 2.2-.1-2.1 1.1-3.4 2.6-4.6.3 1.7 1.4 2.7 2.3 3.8.8 1 1.2 2 1.1 3.3-.1 2.7-2.1 4.8-4.9 4.8-3.3 0-5.7-2.4-5.7-5.8 0-3.4 1.9-5.5 4-7.6 1.9-1.8 3.2-3.3 3.7-5.8Z"/>
                </svg>
                <span>Calories</span>
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
    const nav =
        document.querySelector(".bottom-nav");

    if (!nav || nav.dataset.bound === "true") {
        return;
    }

    nav.dataset.bound = "true";

    nav.addEventListener(
        "click",
        event => {
            const button =
                event.target.closest(".nav-btn");

            if (!button || !nav.contains(button)) {
                return;
            }

            const page =
                button.dataset.page;

            if (!page) {
                return;
            }

            event.preventDefault();

            nav.querySelectorAll(".nav-btn")
                .forEach(item =>
                    item.classList.toggle(
                        "active",
                        item === button
                    )
                );

            try {
                navigate(page);
            }
            catch (error) {
                console.error(
                    `Navigation to ${page} failed:`,
                    error
                );
            }
        }
    );
}
