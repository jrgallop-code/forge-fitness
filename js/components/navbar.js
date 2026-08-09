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
                    <path d="M7.2 13.1c1.7 0 2.8-.8 3.6-2.2.8-1.3 1.2-2.8 1.5-4.2.2-.8.9-1.3 1.7-1.2.9.1 1.5.9 1.4 1.8-.1.8-.4 1.8-.8 2.7h1.8c1.5 0 2.8.5 3.8 1.5 1 1 1.5 2.3 1.5 3.8 0 3.3-2.7 6-6 6H9.4c-2.7 0-5.1-1.3-6.6-3.5-.4-.6-.2-1.5.4-1.9.6-.4 1.4-.2 1.8.4.8 1.2 2.1 1.9 3.5 1.9h7.2c1.7 0 3.1-1.4 3.1-3.1 0-.8-.3-1.5-.9-2.1-.6-.6-1.3-.9-2.1-.9h-3.1c-1.3 2.2-3.1 3.7-5.8 3.7H5.5c-.8 0-1.4-.6-1.4-1.4s.6-1.4 1.4-1.4h1.7Z"/>
                    <path d="M12.6 5.5c-.4-1-.3-2 .4-2.8.6-.8 1.6-1.2 2.6-1 .9.2 1.6.9 1.9 1.7.2.6.1 1.2-.1 1.8-.2.6-.8.9-1.4.7-.6-.2-.9-.8-.7-1.4.1-.2.1-.4 0-.5-.1-.2-.2-.3-.4-.3-.2 0-.4 0-.5.2-.2.2-.2.4-.1.6.2.6-.1 1.2-.7 1.4-.5.2-1.1-.1-1.3-.6Z"/>
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
