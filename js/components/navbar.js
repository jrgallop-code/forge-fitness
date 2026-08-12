import { navigate } from "../core/router.js?v=cardio-fields-1";


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

            button.classList.remove("nav-pulse");
            void button.offsetWidth;
            button.classList.add("nav-pulse");
            button.addEventListener(
                "animationend",
                () => button.classList.remove("nav-pulse"),
                { once: true }
            );

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
